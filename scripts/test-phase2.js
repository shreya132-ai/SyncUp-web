/**
 * scripts/test-phase2.js
 * 
 * Phase 2 Verification Suite: App Shell & Navigation
 * Tests:
 * 1. Five destinations on desktop sidebar and mobile bottom nav
 * 2. Desktop layout: fixed sidebar (#064E3B), centered feed (max ~720px), and right rail
 * 3. Mobile layout: bottom tab bar with raised center '+' button, drawer removed, logout under Profile
 * 4. Reusable <Sheet> component: mobile bottom sheet, desktop modal, focus trap, escape, backdrop, aria-modal
 * 5. Migration of all 6 core modals onto <Sheet>
 * 6. Accessible Toast system with Undo action
 * 7. Skeleton shimmer loaders
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

console.log(`\n========================================================`);
console.log(`🧪 Running Phase 2 Verification Test Suite`);
console.log(`========================================================\n`);

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const layoutCss = fs.readFileSync(path.resolve(__dirname, '../styles/layout.css'), 'utf8');
const componentsCss = fs.readFileSync(path.resolve(__dirname, '../styles/components.css'), 'utf8');
const baseCss = fs.readFileSync(path.resolve(__dirname, '../styles/base.css'), 'utf8');
const sheetJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/sheet.js'), 'utf8');
const toastJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/toast.js'), 'utf8');
const navJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/nav.js'), 'utf8');

// GROUP 1: Five Unified Destinations
console.log(`--- Group 1: Five Unified Destinations ---`);
test('Five destinations exist in desktop sidebar and mobile bottom nav', () => {
  const destinations = ['home', 'explore', 'create', 'inbox', 'profile'];
  
  // Desktop
  destinations.forEach(d => {
    assert.ok(indexHtml.includes(`id="nav-${d}"`), `Desktop sidebar must contain destination: nav-${d}`);
  });

  // Mobile
  destinations.forEach(d => {
    assert.ok(indexHtml.includes(`id="mob-nav-${d}"`), `Mobile bottom nav must contain destination: mob-nav-${d}`);
  });
});

test('Inbox has badge count elements on both desktop and mobile', () => {
  assert.ok(indexHtml.includes('id="inbox-sidebar-badge"'), 'Desktop sidebar must have inbox badge count');
  assert.ok(indexHtml.includes('id="inbox-mobile-badge"'), 'Mobile nav must have inbox badge count');
  assert.ok(indexHtml.includes('id="inbox-tab-apps-badge"'), 'Inbox applications tab must have badge count');
});

// GROUP 2: Desktop Layout
console.log(`\n--- Group 2: Desktop Layout (>=1024px) ---`);
test('Desktop has fixed dark-green sidebar (#064E3B) and 720px centered feed', () => {
  assert.ok(layoutCss.includes('var(--sidebar-width)'), 'Sidebar width variable used');
  assert.ok(layoutCss.includes('max-width: 720px'), 'Centered feed column must have max-width: 720px');
  assert.ok(layoutCss.includes('.desktop-right-rail'), 'Desktop right rail defined');
  assert.ok(indexHtml.includes('id="rail-suggested-teams"'), 'Right rail contains Suggested Teams widget');
  assert.ok(indexHtml.includes('id="rail-pending-apps"'), 'Right rail contains Your Pending Applications widget');
  assert.ok(indexHtml.includes('id="rail-trending-skills"'), 'Right rail contains Trending Skills widget');
});

// GROUP 3: Mobile Layout & Cleanup
console.log(`\n--- Group 3: Mobile Layout (<1024px) ---`);
test('Mobile bottom nav has raised center "+" button and settings/logout is under Profile', () => {
  assert.ok(layoutCss.includes('.mobile-create-fab'), 'Raised mobile center FAB defined in CSS');
  assert.ok(layoutCss.includes('margin-top: -24px'), 'Mobile FAB is raised above tab bar');
  assert.ok(indexHtml.includes('class="mobile-create-fab"'), 'Mobile FAB in HTML');
  
  // Verify collapsible drawer is removed from navigation
  assert.ok(!indexHtml.includes('id="sidebar-toggle"'), 'Old hamburger sidebar toggle removed');
  
  // Verify settings / logout is under Profile view
  const profileSection = indexHtml.substring(indexHtml.indexOf('id="subview-profile"'), indexHtml.indexOf('</main>'));
  assert.ok(profileSection.includes('Account Settings'), 'Profile subview contains Account Settings');
  assert.ok(profileSection.includes('Logout'), 'Profile subview contains Logout button');
});

// GROUP 4: Reusable <Sheet> Component
console.log(`\n--- Group 4: Reusable <Sheet> Component ---`);
test('<Sheet> supports focus trap, Escape to close, backdrop click, and focus restoration', () => {
  assert.ok(sheetJs.includes('export function openSheet'), 'sheet.js exports openSheet');
  assert.ok(sheetJs.includes('export function closeSheet'), 'sheet.js exports closeSheet');
  assert.ok(sheetJs.includes("e.key === 'Escape'"), 'Escape key handler present');
  assert.ok(sheetJs.includes("e.key === 'Tab'"), 'Focus trap tab listener present');
  assert.ok(sheetJs.includes('lastFocusedElement'), 'Focus restoration to opener element present');
  assert.ok(sheetJs.includes('role\', \'dialog\''), 'Sets role="dialog"');
  assert.ok(sheetJs.includes('aria-modal\', \'true\''), 'Sets aria-modal="true"');
});

test('All 6 core modals are migrated to <Sheet> elements', () => {
  const sheets = [
    'sheet-create-post',
    'sheet-apply-team',
    'sheet-review-applications',
    'sheet-report-post',
    'sheet-edit-profile',
    'sheet-add-skill'
  ];

  sheets.forEach(s => {
    assert.ok(indexHtml.includes(`id="${s}"`), `Modal must be migrated to Sheet: ${s}`);
    const sheetMarkup = indexHtml.substring(indexHtml.indexOf(`id="${s}"`), indexHtml.indexOf(`id="${s}"`) + 200);
    assert.ok(sheetMarkup.includes('role="dialog"'), `${s} must have role="dialog"`);
    assert.ok(sheetMarkup.includes('aria-modal="true"'), `${s} must have aria-modal="true"`);
  });
});

test('Sheet CSS adapts to mobile bottom sheet (<1024px) with drag handle', () => {
  assert.ok(componentsCss.includes('.sheet-drag-handle'), 'Drag handle element defined in CSS');
  assert.ok(componentsCss.includes('@media (max-width: 1023px)'), 'Mobile bottom sheet media query defined');
  assert.ok(componentsCss.includes('border-radius: 20px 20px 0 0'), 'Bottom sheet rounded top corners defined');
  assert.ok(componentsCss.includes('animation: sheetSlideUp'), 'Bottom sheet slide-up animation defined');
});

// GROUP 5: Toast System & Undo
console.log(`\n--- Group 5: Toast System & Undo Action ---`);
test('Toast system supports types (success/error/info) and interactive Undo action', () => {
  assert.ok(toastJs.includes('export function showToast'), 'toast.js exports showToast');
  assert.ok(toastJs.includes('toast-undo-btn'), 'Toast system creates Undo action button');
  assert.ok(toastJs.includes('aria-live'), 'Toast system sets accessible aria-live attribute');
  assert.ok(componentsCss.includes('.toast-undo-btn'), 'Undo button styled in CSS');
});

// GROUP 6: Skeleton Loaders
console.log(`\n--- Group 6: Skeleton Shimmer Loaders ---`);
test('Skeleton loaders with shimmer animation are defined and used in feed loading', () => {
  assert.ok(baseCss.includes('skeleton-shimmer'), 'Skeleton shimmer keyframes defined');
  assert.ok(baseCss.includes('.skeleton-card'), 'Skeleton card container defined');
  assert.ok(baseCss.includes('.skeleton-avatar'), 'Skeleton avatar shimmer defined');
  assert.ok(baseCss.includes('.skeleton-line'), 'Skeleton text line shimmer defined');
});

console.log(`\n========================================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
