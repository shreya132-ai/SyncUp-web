/**
 * scripts/test-phase2-security.js
 * 
 * Phase 2 Security Hardening Verification Suite
 * Tests all 8 security requirements:
 * 1. XSS Prevention & Data-Action Event Delegation
 * 2. URL Safety (safeUrl, write & render validation)
 * 3. Firestore Rules Hardening (subcollections, privacy, validation)
 * 4. Firebase Storage Rules (500KB ceiling, owner-only paths)
 * 5. Iterative Image Compression (<70KB avatars, <150KB posts)
 * 6. CSP Meta Tag & rel="noopener noreferrer" on external links
 * 7. README Documentation (API keys public by design, 3 console steps)
 * 8. Client-Side Rate Limiting (button locking, cooldowns, debouncing)
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
console.log(`🔒 Running Phase 2: Security Hardening Verification Suite`);
console.log(`========================================================\n`);

const postCardJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/postCard.js'), 'utf8');
const inboxJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/inbox.js'), 'utf8');
const modalsJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/modals.js'), 'utf8');
const profileJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/profile.js'), 'utf8');
const feedJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/feed.js'), 'utf8');
const exploreJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/explore.js'), 'utf8');
const mainJs = fs.readFileSync(path.resolve(__dirname, '../src/main.js'), 'utf8');
const domJs = fs.readFileSync(path.resolve(__dirname, '../src/utils/dom.js'), 'utf8');
const compressJs = fs.readFileSync(path.resolve(__dirname, '../src/utils/imageCompress.js'), 'utf8');
const postsServiceJs = fs.readFileSync(path.resolve(__dirname, '../src/services/postsService.js'), 'utf8');
const authServiceJs = fs.readFileSync(path.resolve(__dirname, '../src/services/authService.js'), 'utf8');
const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const readmeMd = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf8');

// GROUP 1: XSS Prevention & Event Delegation
console.log(`--- Group 1: XSS Prevention & Event Delegation ---`);
test('No user data in inline onclick strings in postCard, inbox, modals, profile', () => {
  assert.ok(!postCardJs.includes("onclick=\"window.SyncUpStore.triggerDirectChatCTA"), 'postCard.js must not contain inline triggerDirectChatCTA');
  assert.ok(!postCardJs.includes("onclick=\"window.SyncUpApp.blockUserPrompt"), 'postCard.js must not contain inline blockUserPrompt');
  assert.ok(!inboxJs.includes("onclick=\"window.SyncUpStore.triggerDirectChatCTA"), 'inbox.js must not contain inline triggerDirectChatCTA');
  assert.ok(!modalsJs.includes("onclick=\"window.SyncUpStore.triggerDirectChatCTA"), 'modals.js must not contain inline triggerDirectChatCTA');
  assert.ok(!profileJs.includes("onclick=\"window.SyncUpApp.removeSkill"), 'profile.js must not contain inline removeSkill');
});

test('Dynamic action buttons use data-action + data-* attributes', () => {
  assert.ok(postCardJs.includes('data-action="like-post"'), 'postCard must define data-action="like-post"');
  assert.ok(postCardJs.includes('data-action="apply-team"'), 'postCard must define data-action="apply-team"');
  assert.ok(postCardJs.includes('data-action="chat-cta"'), 'postCard must define data-action="chat-cta"');
  assert.ok(inboxJs.includes('data-action="update-app-status"'), 'inbox must define data-action="update-app-status"');
  assert.ok(inboxJs.includes('data-action="select-contact"'), 'inbox must define data-action="select-contact"');
  assert.ok(modalsJs.includes('data-action="update-app-status"'), 'modals must define data-action="update-app-status"');
  assert.ok(profileJs.includes('data-action="remove-skill"'), 'profile must define data-action="remove-skill"');
});

test('One centralized delegated click listener handles data-action in main.js', () => {
  assert.ok(mainJs.includes("document.addEventListener('click'"), 'main.js must attach document click listener');
  assert.ok(mainJs.includes("target.closest('[data-action]')"), 'main.js must inspect closest [data-action]');
  assert.ok(mainJs.includes('handleDelegatedAction'), 'main.js must delegate actions to dedicated dispatcher');
});

// GROUP 2: URL Safety
console.log(`\n--- Group 2: URL Safety & Sanitization ---`);
test('safeUrl strictly validates HTTP/HTTPS protocols and rejects malicious schemes', async () => {
  const { safeUrl } = await import('../src/utils/dom.js');

  // Valid HTTP/HTTPS
  assert.strictEqual(safeUrl('https://github.com/shreya132-ai'), 'https://github.com/shreya132-ai');
  assert.strictEqual(safeUrl('http://example.com/demo'), 'http://example.com/demo');

  // Rejected dangerous schemes
  assert.strictEqual(safeUrl('javascript:alert(1)'), '');
  assert.strictEqual(safeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.strictEqual(safeUrl('vbscript:msgbox(1)'), '');
  assert.strictEqual(safeUrl('ftp://example.com/file'), '');
  assert.strictEqual(safeUrl('//evil.com/xss'), '');
  assert.strictEqual(safeUrl(''), '');
  assert.strictEqual(safeUrl(null), '');
  assert.strictEqual(safeUrl(undefined), '');

  // Safe data:image allowed for local canvas previews
  assert.strictEqual(safeUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
});

test('safeUrl used for githubUrl, demoUrl, userPic, img, and validated on write', () => {
  assert.ok(postCardJs.includes('safeUrl(p.userPic)'), 'postCard validates userPic with safeUrl');
  assert.ok(postCardJs.includes('safeUrl(p.img)'), 'postCard validates img with safeUrl');
  assert.ok(postCardJs.includes('safeUrl(p.githubUrl'), 'postCard validates githubUrl with safeUrl');
  assert.ok(postCardJs.includes('safeUrl(p.demoUrl'), 'postCard validates demoUrl with safeUrl');
  assert.ok(modalsJs.includes('safeUrl(githubUrl'), 'modals validates githubUrl on write');
  assert.ok(modalsJs.includes('safeUrl(demoUrl'), 'modals validates demoUrl on write');
  assert.ok(postsServiceJs.includes('safeUrl(postDoc.githubUrl'), 'postsService validates githubUrl on write');
});

// GROUP 3: Hardened Firestore Rules
console.log(`\n--- Group 3: Firestore Rules Hardening ---`);
test('Likes: posts/{id}/likes/{uid} with doc id == auth.uid and owner create/delete', () => {
  assert.ok(firestoreRules.includes('match /likes/{uid}'), 'Defines likes subcollection');
  assert.ok(firestoreRules.includes('request.auth.uid == uid'), 'User can only create/delete own like doc');
  assert.ok(firestoreRules.includes('allow update: if false'), 'Like updates are denied');
});

test('Comments: posts/{id}/comments/{commentId} with authorUid, length limit, author delete', () => {
  assert.ok(firestoreRules.includes('match /comments/{commentId}'), 'Defines comments subcollection');
  assert.ok(firestoreRules.includes('request.resource.data.authorUid == request.auth.uid'), 'authorUid must match auth.uid');
  assert.ok(firestoreRules.includes('text.size() <= 500'), 'Comment text size limited');
  assert.ok(firestoreRules.includes('resource.data.authorUid == request.auth.uid'), 'Author-only delete');
});

test('Applications: posts/{id}/applications/{appId} with privacy, pending create, owner triage', () => {
  assert.ok(firestoreRules.includes('match /applications/{appId}'), 'Defines applications subcollection');
  assert.ok(firestoreRules.includes('resource.data.applicantUid == request.auth.uid'), 'Applicant reads only own');
  assert.ok(firestoreRules.includes("request.resource.data.status == 'pending'"), 'Must be pending on create');
  assert.ok(firestoreRules.includes("status in ['accepted', 'declined', 'pending']"), 'Status transition allowed only to valid enums');
});

test('Posts validation: field sizes, immutable userUid, status enum, default deny', () => {
  assert.ok(firestoreRules.includes('title.size() <= 120'), 'Post title <= 120 chars');
  assert.ok(firestoreRules.includes('text.size() <= 800'), 'Post text <= 800 chars');
  assert.ok(firestoreRules.includes('skills.size() <= 10'), 'Skills list <= 10 items');
  assert.ok(firestoreRules.includes("status in ['Recruiting', 'In Progress', 'Completed']"), 'Status enum enforced');
  assert.ok(firestoreRules.includes('request.resource.data.userUid == resource.data.userUid'), 'userUid immutable');
  assert.ok(firestoreRules.includes('match /usernames/{handle}'), 'Username uniqueness mapping rule');
  assert.ok(firestoreRules.includes('match /private/{docId}'), 'Private user data subcollection');
});

// GROUP 4: Storage Rules
console.log(`\n--- Group 4: Storage Rules Hardening ---`);
test('Storage rules enforce auth, 500 KB limit, image/*, avatars/{uid}.jpg and posts/{uid}/...', () => {
  assert.ok(storageRules.includes('500 * 1024'), '500 KB ceiling enforced');
  assert.ok(storageRules.includes("request.resource.contentType.matches('image/.*')"), 'image/* MIME type enforced');
  assert.ok(storageRules.includes('match /avatars/{userId}.jpg'), 'Owner-only avatars/{uid}.jpg path');
  assert.ok(storageRules.includes('match /posts/{userId}/{imageFile=**}'), 'Owner-only posts/{uid}/... path');
  assert.ok(storageRules.includes('request.auth.uid == userId'), 'Ownership check enforced on storage paths');
});

// GROUP 5: Image Compression
console.log(`\n--- Group 5: Iterative Image Compression ---`);
test('compressImage has iterative loop reducing size, and getBase64SizeBytes calculates size', async () => {
  const { getBase64SizeBytes } = await import('../src/utils/imageCompress.js');
  
  // Base64 size test: 12 chars base64 with no padding = 9 bytes
  const testB64 = "data:image/jpeg;base64,QUJDREVGR0hJ"; // "ABCDEFGHI"
  assert.strictEqual(getBase64SizeBytes(testB64), 9);

  assert.ok(compressJs.includes('for (let i = 0; i < maxIterations; i++)'), 'Compressor implements iterative loop');
  assert.ok(compressJs.includes('finalSize <= maxBytes'), 'Compressor checks target maxBytes limit');
  assert.ok(compressJs.includes('curQuality - 0.15'), 'Compressor steps down quality');
  assert.ok(compressJs.includes('curWidth * 0.8'), 'Compressor steps down dimensions');
  assert.ok(readmeMd.includes('< 70 KB'), 'README documents avatar < 70 KB target');
  assert.ok(readmeMd.includes('< 150 KB'), 'README documents post image < 150 KB target');
});

// GROUP 6: CSP & External Links
console.log(`\n--- Group 6: Content-Security-Policy & External Links ---`);
test('index.html contains CSP meta tag with Firebase & Google Fonts origins', () => {
  assert.ok(indexHtml.includes('http-equiv="Content-Security-Policy"'), 'CSP meta tag present');
  assert.ok(indexHtml.includes('https://www.gstatic.com'), 'CSP permits gstatic.com');
  assert.ok(indexHtml.includes('https://fonts.googleapis.com'), 'CSP permits fonts.googleapis.com');
  assert.ok(indexHtml.includes('https://firebasestorage.googleapis.com'), 'CSP permits firebasestorage.googleapis.com');
});

test('All external links (target="_blank") have rel="noopener noreferrer"', () => {
  const blankRegex = /<a\s+[^>]*target="_blank"[^>]*>/gi;
  const matches = indexHtml.match(blankRegex) || [];
  assert.ok(matches.length >= 4, 'Multiple external links exist in index.html');
  matches.forEach(tag => {
    assert.ok(tag.includes('rel="noopener noreferrer"'), `External link must have rel="noopener noreferrer": ${tag}`);
  });
});

// GROUP 7: README Security Documentation
console.log(`\n--- Group 7: README Security Documentation ---`);
test('README documents Firebase Web API keys are public by design with 3 console steps', () => {
  assert.ok(readmeMd.includes('Firebase Web API Keys are Public by Design'), 'Explains API keys are public by design');
  assert.ok(readmeMd.includes('Restrict Authorized Domains'), 'Step 1: Restrict Authorized Domains');
  assert.ok(readmeMd.includes('Enable Firebase App Check'), 'Step 2: Enable App Check');
  assert.ok(readmeMd.includes('Budget Alerts'), 'Step 3: Set Budget Alerts');
});

// GROUP 8: Rate Limiting Guards
console.log(`\n--- Group 8: Client-Side Rate Limiting ---`);
test('Submit buttons disabled while pending, and in-flight debouncing is active', () => {
  assert.ok(modalsJs.includes('submitBtn.disabled = true'), 'modals.js disables submit button on post create');
  assert.ok(modalsJs.includes("btn-submit-application')"), 'modals.js targets application submit button');
  assert.ok(mainJs.includes('pendingLikes.has(postId)'), 'main.js maintains in-flight like tracking');
  assert.ok(mainJs.includes('lastCommentTime'), 'main.js enforces comment cooldown timer');
});

console.log(`\n========================================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
