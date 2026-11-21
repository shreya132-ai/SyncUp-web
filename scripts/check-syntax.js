/**
 * scripts/check-syntax.js
 * 
 * Parses and verifies syntax across all JavaScript files in the project.
 * Uses Node's vm module to compile scripts and ES modules without executing browser APIs.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let errors = 0;
let filesChecked = 0;

function checkJsFile(filePath) {
  filesChecked++;
  const code = fs.readFileSync(filePath, 'utf8');
  const normalized = filePath.replace(/\\/g, '/');

  try {
    const isModule = code.includes('import ') || code.includes('export ') || normalized.startsWith('src/');
    if (isModule && vm.SourceTextModule) {
      new vm.SourceTextModule(code, { identifier: normalized });
    } else {
      new vm.Script(code, { filename: normalized });
    }
    console.log(`  ✅ PASS: ${normalized}`);
  } catch (err) {
    console.error(`  ❌ SYNTAX ERROR in ${normalized}:`);
    console.error(`     ${err.message}`);
    errors++;
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        scanDir(full);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      checkJsFile(full);
    }
  }
}

console.log("\n=======================================================");
console.log("🔍 JAVASCRIPT SYNTAX INTEGRITY CHECK");
console.log("=======================================================\n");

const targetDirs = ['src', 'scripts'];
targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) scanDir(dir);
});

// Also check root JS files
fs.readdirSync('.').forEach(f => {
  if (f.endsWith('.js')) checkJsFile(f);
});

console.log("\n=======================================================");
console.log(`Results: ${filesChecked - errors} / ${filesChecked} files valid.`);
console.log("=======================================================\n");

if (errors > 0) {
  process.exit(1);
}
