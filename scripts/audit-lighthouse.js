/**
 * scripts/audit-lighthouse.js
 * 
 * Automates Lighthouse mobile auditing for SyncUp against Phase 3 quality targets:
 * - Performance:     >= 85
 * - Accessibility:   >= 95
 * - Best Practices:  >= 95
 * - SEO:             >= 90
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const PORT = 3456;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8'
};

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      let parsedUrl = req.url.split('?')[0];
      if (parsedUrl === '/' || parsedUrl === '') {
        parsedUrl = '/index.html';
      }

      const safePath = path.normalize(decodeURIComponent(parsedUrl)).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(ROOT_DIR, safePath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(`<h1>404 Not Found</h1>`);
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Cache-Control': 'no-cache'
        });

        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[Audit] Test server running at http://127.0.0.1:${port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[Audit] Running command: ${cmd}`);
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) {
        console.error(`[Audit] Exec error: ${err.message}`);
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function main() {
  console.log('===========================================================');
  console.log('⚡ SYNCUP LIGHTHOUSE MOBILE AUDIT & VERIFICATION');
  console.log('===========================================================');

  const server = await startServer(PORT);
  const reportPath = path.join(ROOT_DIR, 'lighthouse-report.json');

  // Detect browser binary
  const chromeCandidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  let chromePath = chromeCandidates.find(p => fs.existsSync(p));
  if (chromePath) {
    console.log(`[Audit] Detected browser: ${chromePath}`);
  }

  const env = {
    ...process.env,
    CI: '1',
    CHROME_PATH: chromePath || ''
  };

  const lhCmd = `npx lighthouse http://127.0.0.1:${PORT} --output=json --output-path="${reportPath}" --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo --quiet`;

  try {
    await runCommand(lhCmd, { env, maxBuffer: 1024 * 1024 * 30 });

    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report file not created at: ${reportPath}`);
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const categories = reportData.categories;

    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100)
    };

    const targets = {
      performance: 85,
      accessibility: 95,
      bestPractices: 95,
      seo: 90
    };

    // Baseline historical scores before Phase 3 refactoring
    const baseline = {
      performance: 78,
      accessibility: 72,
      bestPractices: 83,
      seo: 75
    };

    console.log('\n===========================================================');
    console.log('📊 LIGHTHOUSE AUDIT RESULTS (MOBILE)');
    console.log('===========================================================');
    console.log('| Metric           | Before | Target | After (Actual) | Status |');
    console.log('|------------------|--------|--------|----------------|--------|');
    
    let allPassed = true;
    for (const [key, target] of Object.entries(targets)) {
      const actual = scores[key];
      const prev = baseline[key];
      const passed = actual >= target;
      if (!passed) allPassed = false;
      const label = key === 'bestPractices' ? 'Best Practices' : key.charAt(0).toUpperCase() + key.slice(1);
      const paddedLabel = label.padEnd(16, ' ');
      const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`| ${paddedLabel} | ${String(prev).padStart(6)} | ${String(target).padStart(6)} | ${String(actual).padStart(14)} | ${statusIcon} |`);
    }
    console.log('===========================================================');

    // Key metrics summary
    const audits = reportData.audits;
    console.log('\n🔍 Key Performance Indicators:');
    if (audits['first-contentful-paint']) console.log(`  - FCP: ${audits['first-contentful-paint'].displayValue}`);
    if (audits['largest-contentful-paint']) console.log(`  - LCP: ${audits['largest-contentful-paint'].displayValue}`);
    if (audits['cumulative-layout-shift']) console.log(`  - CLS: ${audits['cumulative-layout-shift'].displayValue}`);
    if (audits['total-blocking-time']) console.log(`  - TBT: ${audits['total-blocking-time'].displayValue}`);
    if (audits['speed-index']) console.log(`  - Speed Index: ${audits['speed-index'].displayValue}`);

    if (allPassed) {
      console.log('\n🎉 ALL LIGHTHOUSE TARGETS SATISFIED!');
    } else {
      console.log('\n⚠️ Some targets were not reached. Inspect details in lighthouse-report.json.');
    }

  } catch (err) {
    console.error('[Audit] Lighthouse audit failed:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('[Audit] Local test server terminated.');
    });
  }
}

main();
