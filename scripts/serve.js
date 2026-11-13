/**
 * scripts/serve.js
 * 
 * Zero-dependency native Node.js static HTTP server for SyncUp.
 * Serves ES modules and assets with proper MIME types.
 * Usage: node scripts/serve.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10);
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

const server = http.createServer((req, res) => {
  // CORS & Security headers for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Normalize requested URL path
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/' || parsedUrl === '') {
    parsedUrl = '/index.html';
  }

  const safePath = path.normalize(decodeURIComponent(parsedUrl)).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT_DIR, safePath);

  // If directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`<h1>404 Not Found</h1><p>The requested file <code>${safePath}</code> was not found on SyncUp local server.</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n=================================================`);
  console.log(`🚀 SyncUp local server running at: ${url}`);
  console.log(`📁 Serving directory: ${ROOT_DIR}`);
  console.log(`⚡ Native ES Modules & IndexedDB persistence active`);
  console.log(`Press Ctrl+C to stop`);
  console.log(`=================================================\n`);

  // Open default browser on Windows
  if (process.platform === 'win32' && !process.env.CI) {
    exec(`start ${url}`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} is in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1, '0.0.0.0');
  } else {
    console.error('Server error:', err);
  }
});
