/**
 * scripts/diagnose-browser.js
 * Runs Edge headlessly via CDP to capture runtime browser errors and layout issues.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 3456;
const CDP_PORT = 9223;
const USER_DATA = path.join(__dirname, '..', '.tmp-edge-profile');

// Start static server
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/' || p === '') p = '/index.html';
  const filePath = path.join(__dirname, '..', path.normalize(decodeURIComponent(p)));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
  
  // Launch Edge
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `http://127.0.0.1:${PORT}`
  ]);

  edgeProc.stderr.on('data', d => {});

  // Wait for CDP to be available
  let cdpUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json`).then(r => r.json());
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        cdpUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!cdpUrl) {
    console.error('Could not connect to Edge CDP');
    cleanup(1);
    return;
  }

  console.log('Connected to CDP at:', cdpUrl);
  const ws = new WebSocket(cdpUrl);

  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const logs = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
      console.log(`[Browser ${msg.params.type.toUpperCase()}]`, ...msg.params.args.map(a => a.value || a.description));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[Browser EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      logs.push({ type: 'exception', text: msg.params.exceptionDetails.text, details: msg.params.exceptionDetails });
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log('WebSocket opened');

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  // Navigate
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- Evaluating Landing View Status ---');
  let res = await send('Runtime.evaluate', {
    expression: `({
      landingHidden: document.getElementById('landing-view')?.classList.contains('hidden'),
      dashboardHidden: document.getElementById('dashboard-view')?.classList.contains('hidden'),
      authHidden: document.getElementById('auth-view')?.classList.contains('hidden')
    })`,
    returnByValue: true
  });
  console.log('View states on initial load:', res.result.value);

  console.log('\n--- Simulating "Preview Demo" Click ---');
  res = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          if (typeof continueAsDemoGuest === 'function') {
            await continueAsDemoGuest();
            return { ok: true };
          }
          return { ok: false, error: 'continueAsDemoGuest is not a function' };
        } catch(e) {
          return { ok: false, error: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Preview Demo result:', res.result.value);

  await new Promise(r => setTimeout(r, 1500));

  console.log('\n--- Checking Dashboard View Status ---');
  res = await send('Runtime.evaluate', {
    expression: `({
      landingHidden: document.getElementById('landing-view')?.classList.contains('hidden'),
      dashboardHidden: document.getElementById('dashboard-view')?.classList.contains('hidden'),
      feedCount: document.getElementById('projects-feed-container')?.children.length,
      currentTab: window.SyncUpStore?.getState()?.ui?.currentTab
    })`,
    returnByValue: true
  });
  console.log('Dashboard states after demo login:', res.result.value);

  console.log('\n--- Testing Tab Navigation & Modals ---');
  res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const results = {};
        try {
          switchDashboardTab('explore');
          results.explore = { hidden: document.getElementById('subview-explore').classList.contains('hidden') };
          switchDashboardTab('inbox');
          results.inbox = { hidden: document.getElementById('subview-inbox').classList.contains('hidden') };
          switchDashboardTab('profile');
          results.profile = { hidden: document.getElementById('subview-profile').classList.contains('hidden') };
          switchDashboardTab('home');
          results.home = { hidden: document.getElementById('subview-home').classList.contains('hidden') };

          // Open Create Post Sheet
          SyncUpSheet.open('sheet-create-post');
          results.createSheetOpen = !document.getElementById('sheet-create-post').classList.contains('hidden');
          SyncUpSheet.close();

          return { ok: true, results };
        } catch(e) {
          return { ok: false, error: e.message, stack: e.stack };
        }
      })()
    `,
    returnByValue: true
  });
  console.log('Tab navigation test result:', res.result.value);

  // Check CSS layout issues & horizontal overflow
  console.log('\n--- Checking Layout / CSS Overflow Issues ---');
  res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const issues = [];
        const docW = document.documentElement.clientWidth;
        const bodyW = document.body.scrollWidth;
        if (bodyW > docW) {
          issues.push('Horizontal scroll detected: document.body.scrollWidth (' + bodyW + ') > clientWidth (' + docW + ')');
        }

        // Check for broken images or unloaded assets
        document.querySelectorAll('img').forEach(img => {
          if (img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
            issues.push('Unloaded/broken image: ' + img.src);
          }
        });

        // Check compute styles for elements with invalid flex/grid properties or unclosed layouts
        const feed = document.getElementById('projects-feed-container');
        if (feed) {
          const cs = window.getComputedStyle(feed);
          if (cs.display === 'none') issues.push('projects-feed-container is display: none');
        }

        return issues;
      })()
    `,
    returnByValue: true
  });
  console.log('Layout issues found:', res.result.value);

  cleanup(0);

  function cleanup(code) {
    try { ws.close(); } catch(e) {}
    try { edgeProc.kill(); } catch(e) {}
    try { server.close(); } catch(e) {}
    try { fs.rmSync(USER_DATA, { recursive: true, force: true }); } catch(e) {}
    process.exit(code);
  }
});
