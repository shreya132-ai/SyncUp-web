/**
 * scripts/test-all.js
 * 
 * Master Test Runner for SyncUp
 * Executes all 5 Phase Verification Suites in sequence:
 * - Phase 1: Architecture & One-Way Data Flow (6 tests)
 * - Phase 2: App Shell & Navigation (9 tests)
 * - Phase 3: Core Features & Interactions (10 tests)
 * - Phase 4: Design System & Design Tokens (9 tests)
 * - Phase 5: Quality Pass, Security, A11y & E2E (13 tests)
 * 
 * Usage: node scripts/test-all.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const testSuites = [
  { name: 'Phase 1: Architecture & One-Way Data Flow', file: 'scripts/test-phase1.js', expected: 6 },
  { name: 'Phase 2: App Shell & Navigation', file: 'scripts/test-phase2.js', expected: 9 },
  { name: 'Phase 3: Core Features & Interactions', file: 'scripts/test-phase3.js', expected: 10 },
  { name: 'Phase 4: Design System & Design Tokens', file: 'scripts/test-phase4.js', expected: 9 },
  { name: 'Phase 5: Quality Pass, Security & E2E', file: 'scripts/test-phase5.js', expected: 13 }
];

console.log(`\n================================================================`);
console.log(`🧪 SYNCUP MASTER VERIFICATION RUNNER`);
console.log(`Running all phase test suites across architecture, UI, and security...`);
console.log(`================================================================\n`);

let allPassed = true;
const summaryResults = [];
let totalPassedCount = 0;
let totalExpectedCount = 0;

testSuites.forEach((suite, index) => {
  console.log(`▶ Running [${index + 1}/${testSuites.length}] ${suite.name}...`);
  try {
    const output = execSync(`node ${suite.file}`, { cwd: ROOT_DIR, encoding: 'utf8' });
    console.log(output);
    summaryResults.push({ name: suite.name, status: 'PASS', count: `${suite.expected}/${suite.expected}` });
    totalPassedCount += suite.expected;
    totalExpectedCount += suite.expected;
  } catch (err) {
    console.error(err.stdout || err.message);
    summaryResults.push({ name: suite.name, status: 'FAIL', count: `0/${suite.expected}` });
    totalExpectedCount += suite.expected;
    allPassed = false;
  }
});

console.log(`\n================================================================`);
console.log(`📊 CONSOLIDATED TEST SUMMARY`);
console.log(`================================================================`);
summaryResults.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${r.status}] ${r.name} (${r.count})`);
});
console.log(`----------------------------------------------------------------`);
console.log(`Total Score: ${totalPassedCount} / ${totalExpectedCount} assertions passed (${allPassed ? '100%' : 'FAILED'})`);
console.log(`================================================================\n`);

if (!allPassed) {
  process.exit(1);
}
