/**
 * scripts/test-phase4.js
 * 
 * Phase 4 Verification Suite: Design System & Design Tokens
 * Tests:
 * 1. Design tokens single source of truth in styles/tokens.css
 * 2. WCAG 2.1 AA Color Contrast calculation for Primary button (#087F5B on #FFFFFF >= 4.5:1)
 * 3. Text color (#0F172A on #FFFFFF >= 7:1 AAA) and Sidebar (#064E3B on #FFFFFF >= 7:1 AAA)
 * 4. Verification that Accent #10B981 is NEVER used as text on white
 * 5. Strict 8px spacing grid (4, 8, 16, 24, 32)
 * 6. Single font (Inter) with strictly standardized sizes (12, 14, 16, 20, 28)
 * 7. Radius standards (12px cards, 999px chips/buttons)
 * 8. Touch targets >= 44x44px for accessible interactive elements
 * 9. Responsive breakpoints (mobile < 768px, tablet 768-1023px, desktop >= 1024px)
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
console.log(`🧪 Running Phase 4 Verification Test Suite: Design Tokens`);
console.log(`========================================================\n`);

const tokensCss = fs.readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
const layoutCss = fs.readFileSync(path.resolve(__dirname, '../styles/layout.css'), 'utf8');
const componentsCss = fs.readFileSync(path.resolve(__dirname, '../styles/components.css'), 'utf8');
const baseCss = fs.readFileSync(path.resolve(__dirname, '../styles/base.css'), 'utf8');

// Relative Luminance & Contrast Formula (WCAG 2.1 Standard)
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const parseHex = (hex) => {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ];
  };

  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// GROUP 1: Colors & Contrast
console.log(`--- Group 1: Colors & WCAG 2.1 Contrast Ratios ---`);
test('Primary button #087F5B with #FFFFFF text passes WCAG AA (>= 4.5:1)', () => {
  assert.ok(tokensCss.includes('--color-primary-btn: #087F5B'), 'Primary button color token is #087F5B');
  assert.ok(tokensCss.includes('--color-primary-btn-text: #FFFFFF'), 'Primary button text token is #FFFFFF');
  
  const ratio = getContrastRatio('#087F5B', '#FFFFFF');
  console.log(`     (Calculated Contrast Ratio: ${ratio.toFixed(2)}:1)`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} must be >= 4.5 for WCAG AA`);
});

test('Primary text #0F172A and Sidebar #064E3B pass WCAG AAA (>= 7.0:1)', () => {
  assert.ok(tokensCss.includes('--color-text: #0F172A'), 'Primary text token is #0F172A');
  assert.ok(tokensCss.includes('--color-sidebar: #064E3B'), 'Sidebar token is #064E3B');

  const textRatio = getContrastRatio('#0F172A', '#FFFFFF');
  console.log(`     (Text Contrast Ratio: ${textRatio.toFixed(2)}:1)`);
  assert.ok(textRatio >= 7.0, `Text contrast ratio ${textRatio.toFixed(2)} must be >= 7.0`);

  const sidebarRatio = getContrastRatio('#064E3B', '#FFFFFF');
  console.log(`     (Sidebar Contrast Ratio: ${sidebarRatio.toFixed(2)}:1)`);
  assert.ok(sidebarRatio >= 7.0, `Sidebar contrast ratio ${sidebarRatio.toFixed(2)} must be >= 7.0`);
});

test('Accent #10B981 is strictly reserved for fills/icons and NEVER used as text on white', () => {
  assert.ok(tokensCss.includes('--color-accent: #10B981'), 'Accent token is #10B981');
  
  // Verify failure when used on white
  const accentWhiteRatio = getContrastRatio('#10B981', '#FFFFFF');
  assert.ok(accentWhiteRatio < 4.5, '#10B981 fails WCAG AA on white (ratio is ~2.04:1)');

  // Verify none of our stylesheets or source files declare text color: #10B981
  const stylesDir = path.resolve(__dirname, '../styles');
  fs.readdirSync(stylesDir).forEach(file => {
    if (file.endsWith('.css')) {
      const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
      assert.ok(!content.match(/color:\s*#10B981/i), `File ${file} must never set text color to #10B981`);
    }
  });
});

test('Background canvas is #F8FAFC', () => {
  assert.ok(tokensCss.includes('--color-bg: #F8FAFC'), 'Background canvas token is #F8FAFC');
});

// GROUP 2: Spacing Grid
console.log(`\n--- Group 2: Strict 8px Spacing Grid ---`);
test('Spacing tokens define strict 8px grid (4, 8, 16, 24, 32)', () => {
  assert.ok(tokensCss.includes('--space-4: 4px'), '4px half-grid token');
  assert.ok(tokensCss.includes('--space-8: 8px'), '8px grid token');
  assert.ok(tokensCss.includes('--space-16: 16px'), '16px grid token');
  assert.ok(tokensCss.includes('--space-24: 24px'), '24px grid token');
  assert.ok(tokensCss.includes('--space-32: 32px'), '32px grid token');
});

// GROUP 3: Typography Standards
console.log(`\n--- Group 3: Typography Scale ---`);
test('Single font family (Inter) with standardized sizes 12/14/16/20/28', () => {
  assert.ok(tokensCss.includes("'Inter'"), 'Inter font family token');
  assert.ok(tokensCss.includes('--font-size-12: 12px'), '12px caption/meta font size');
  assert.ok(tokensCss.includes('--font-size-14: 14px'), '14px body font size');
  assert.ok(tokensCss.includes('--font-size-16: 16px'), '16px base font size');
  assert.ok(tokensCss.includes('--font-size-20: 20px'), '20px subtitle/card title font size');
  assert.ok(tokensCss.includes('--font-size-28: 28px'), '28px heading font size');
});

// GROUP 4: Radius Standards
console.log(`\n--- Group 4: Corner Radius Standards ---`);
test('Radius tokens enforce 12px cards and 999px chips/buttons', () => {
  assert.ok(tokensCss.includes('--radius-card: 12px'), 'Card radius token is 12px');
  assert.ok(tokensCss.includes('--radius-button: 999px'), 'Button radius token is 999px');
  assert.ok(tokensCss.includes('--radius-chip: 999px'), 'Chip radius token is 999px');
});

// GROUP 5: Accessible Touch Targets
console.log(`\n--- Group 5: Accessible Touch Targets ---`);
test('Touch targets enforce minimum 44x44px for all interactive controls', () => {
  assert.ok(tokensCss.includes('--touch-target-min: 44px'), 'Touch target min token is 44px');
  assert.ok(componentsCss.includes('min-height: var(--touch-target-min)'), 'Buttons and chips enforce 44px min height');
  assert.ok(componentsCss.includes('min-width: var(--touch-target-min)'), 'Close buttons enforce 44px min width');
});

// GROUP 6: Responsive Breakpoints
console.log(`\n--- Group 6: Responsive Breakpoints ---`);
test('Responsive rules defined for Mobile (< 768px), Tablet (768-1023px), and Desktop (>= 1024px)', () => {
  assert.ok(layoutCss.includes('@media (max-width: 767px)'), 'Mobile < 768px media query defined');
  assert.ok(layoutCss.includes('@media (min-width: 768px) and (max-width: 1023px)'), 'Tablet 768-1023px media query defined');
  assert.ok(layoutCss.includes('@media (max-width: 1023px)'), 'Desktop >= 1024px boundary defined');
});

console.log(`\n========================================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
