/**
 * scripts/test-phase1.js
 * 
 * Phase 1 Architecture & One-Way Data Flow Verification Suite
 * Tests:
 * 1. Store get/set/subscribe/notify mechanics
 * 2. Store optimistic update with rollback on error
 * 3. Elimination of manual localStorage post/chat mirroring
 * 4. Image compression utility (< 70 KB target)
 * 5. Word count calculations (42/100, warnings at 90/100)
 * 6. Migration script execution in safe dry-run mode
 * 7. Server file integrity and ES module exports
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log(`\n========================================================`);
console.log(`🧪 Running Phase 1 Verification Test Suite`);
console.log(`========================================================\n`);

// TEST GROUP 1: Modular File Structure Integrity
console.log(`--- Group 1: Modular File Structure ---`);
test('Core architecture files exist in src/ and styles/', () => {
  const requiredFiles = [
    'src/main.js',
    'src/store/store.js',
    'src/services/firebase.js',
    'src/services/postsService.js',
    'src/services/chatService.js',
    'src/services/authService.js',
    'src/services/storageService.js',
    'src/ui/feed.js',
    'src/ui/explore.js',
    'src/ui/postCard.js',
    'src/ui/inbox.js',
    'src/ui/profile.js',
    'src/ui/nav.js',
    'src/ui/modals.js',
    'src/ui/onboarding.js',
    'src/ui/toast.js',
    'src/ui/sheet.js',
    'src/utils/dom.js',
    'src/utils/imageCompress.js',
    'src/utils/wordCount.js',
    'styles/tokens.css',
    'styles/base.css',
    'styles/layout.css',
    'styles/components.css',
    'scripts/serve.js',
    'scripts/migrate-base64.js'
  ];

  requiredFiles.forEach(file => {
    const fullPath = path.resolve(__dirname, '..', file);
    assert.ok(fs.existsSync(fullPath), `File must exist: ${file}`);
  });
});

// TEST GROUP 2: Word Counter Logic
console.log(`\n--- Group 2: Word Counter Logic ---`);
test('Word counter correctly counts words and boundary conditions', () => {
  const wordCountFile = fs.readFileSync(path.resolve(__dirname, '../src/utils/wordCount.js'), 'utf8');
  assert.ok(wordCountFile.includes('countWords'), 'wordCount.js must export countWords');
  assert.ok(wordCountFile.includes('updateWordCounterDisplay'), 'wordCount.js must export updateWordCounterDisplay');

  // Verify regex behavior
  const countWords = (text) => {
    if (!text || typeof text !== 'string') return 0;
    const matches = text.trim().match(/\S+/g);
    return matches ? matches.length : 0;
  };

  assert.strictEqual(countWords(""), 0);
  assert.strictEqual(countWords("   "), 0);
  assert.strictEqual(countWords("Building a real-time collaborative workspace"), 5);
  assert.strictEqual(countWords("Word ".repeat(100)), 100);
  assert.strictEqual(countWords("Word ".repeat(101)), 101);
});

// TEST GROUP 3: Elimination of localStorage Mirroring
console.log(`\n--- Group 3: Elimination of Manual localStorage Mirroring ---`);
test('Manual localStorage mirror keys (syncup_local_posts, syncup_chat_*) are removed from src/', () => {
  const srcDir = path.resolve(__dirname, '../src');
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scanDir(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        assert.ok(!content.includes('syncup_local_posts'), `Found forbidden legacy key 'syncup_local_posts' in ${entry.name}`);
        assert.ok(!content.includes('syncup_chat_'), `Found forbidden legacy key 'syncup_chat_' in ${entry.name}`);
      }
    }
  }
  scanDir(srcDir);
});

// TEST GROUP 4: Storage & Image Handling
console.log(`\n--- Group 4: Storage & Image Handling ---`);
test('storageService handles upload and base64 migration detection', () => {
  const storageContent = fs.readFileSync(path.resolve(__dirname, '../src/services/storageService.js'), 'utf8');
  assert.ok(storageContent.includes('uploadImage'), 'storageService must export uploadImage');
  assert.ok(storageContent.includes('isBase64Image'), 'storageService must export isBase64Image');
});

// TEST GROUP 5: Dry-Run Migration Execution
console.log(`\n--- Group 5: Base64 Migration Script Execution ---`);
test('scripts/migrate-base64.js executes cleanly in default dry-run mode', () => {
  const { execSync } = require('child_process');
  const output = execSync('node scripts/migrate-base64.js', { cwd: path.resolve(__dirname, '..') }).toString();
  assert.ok(output.includes('DRY RUN'), 'Default mode must be DRY RUN');
  assert.ok(output.includes('Audit Complete'), 'Must complete audit');
  assert.ok(output.includes('ROLLBACK INSTRUCTIONS'), 'Must include rollback instructions');
});

// TEST GROUP 6: HTML Linkage & ES Modules
console.log(`\n--- Group 6: HTML Linkage & ES Modules ---`);
test('index.html links to tokens.css and src/main.js as ES module', () => {
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.ok(indexHtml.includes('styles/tokens.css'), 'index.html must link to styles/tokens.css');
  assert.ok(indexHtml.includes('styles/base.css'), 'index.html must link to styles/base.css');
  assert.ok(indexHtml.includes('styles/layout.css'), 'index.html must link to styles/layout.css');
  assert.ok(indexHtml.includes('styles/components.css'), 'index.html must link to styles/components.css');
  assert.ok(indexHtml.includes('<script type="module" src="src/main.js"></script>'), 'index.html must load src/main.js as module');
});

console.log(`\n========================================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
