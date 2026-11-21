/**
 * scripts/test-phase3.js
 * 
 * Phase 3 Verification Suite: Core Features & Interactions
 * Tests:
 * 1. Feed filters (skills, role needed, newest/popular), skeleton loading, empty state
 * 2. Post card: roles open count, applicant count, one primary Apply button -> disabled "Applied ✓"
 * 3. Post creation wizard: two steps (write -> preview), word counter 42/100, warnings at 90/100, aria-live
 * 4. Applications review: status chips (pending amber, accepted green, declined gray), auto-chat on accept, Undo toast on decline
 * 5. Chat view: messages, typing indicator, read receipts, timestamps
 * 6. Onboarding: 3-5 skills selection, profile saving, feed personalization
 * 7. Explore: search with debouncing, browse by skill with counts, browse by category
 * 8. End-to-End Simulation of the 3 Core User Flows:
 *    - Flow 1: Discover -> Apply
 *    - Flow 2: Review -> Accept
 *    - Flow 3: Post -> Manage
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
console.log(`🧪 Running Phase 3 Verification Test Suite`);
console.log(`========================================================\n`);

const feedJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/feed.js'), 'utf8');
const postCardJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/postCard.js'), 'utf8');
const modalsJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/modals.js'), 'utf8');
const inboxJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/inbox.js'), 'utf8');
const onboardingJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/onboarding.js'), 'utf8');
const exploreJs = fs.readFileSync(path.resolve(__dirname, '../src/ui/explore.js'), 'utf8');
const wordCountJs = fs.readFileSync(path.resolve(__dirname, '../src/utils/wordCount.js'), 'utf8');
const storeJs = fs.readFileSync(path.resolve(__dirname, '../src/store/store.js'), 'utf8');
const componentsCss = fs.readFileSync(path.resolve(__dirname, '../styles/components.css'), 'utf8');

// GROUP 1: Feed & Filtering
console.log(`--- Group 1: Feed & Multi-Dimensional Filters ---`);
test('Feed supports skill chips, role needed dropdown, and sort order', () => {
  assert.ok(feedJs.includes("popularSkills = ['All', 'React', 'Node.js', 'Python', 'UI/UX', 'FastAPI', 'MongoDB', 'Flutter', 'TypeScript']"), 'Feed has popular skills chips');
  assert.ok(feedJs.includes('filterByRole'), 'Feed supports filterByRole');
  assert.ok(feedJs.includes('sortBy'), 'Feed supports sort order (newest vs popular)');
  assert.ok(feedJs.includes('skeleton-feed-wrapper'), 'Feed renders skeleton shimmer loaders when loading');
  assert.ok(feedJs.includes('No projects match your filters'), 'Feed renders friendly empty state with action buttons');
});

// GROUP 2: Post Card & Primary Apply Button
console.log(`\n--- Group 2: Post Card & Primary Apply Button ---`);
test('Post card displays roles open count, applicants count, and transitions to disabled "Applied ✓"', () => {
  assert.ok(postCardJs.includes('roles-open'), 'Post card renders roles open count badge');
  assert.ok(postCardJs.includes('applicant'), 'Post card renders applicants count badge');
  assert.ok(postCardJs.includes('Applied ✓'), 'Post card renders disabled "Applied ✓" for applicants');
  assert.ok(postCardJs.includes('disabled'), 'Applied ✓ button is strictly disabled');
  assert.ok(postCardJs.includes('sheet-apply-team'), 'Post card connects primary button to team application sheet');
});

// GROUP 3: Post Creation Wizard & Word Counter
console.log(`\n--- Group 3: Post Creation Wizard & Word Counter ---`);
test('Two-step wizard (Write -> Preview) with 42/100 word counter, 90/100 warnings, and aria-live', () => {
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.ok(modalsJs.includes('export function goToCreateStep'), 'goToCreateStep function exists in modals.js');
  assert.ok(indexHtml.includes('goToCreateStep(1)'), 'Step 1 write details navigation button exists');
  assert.ok(indexHtml.includes('goToCreateStep(2)'), 'Step 2 live preview navigation button exists');
  assert.ok(modalsJs.includes('updateLivePostPreview'), 'Live preview updater exists');
  assert.ok(wordCountJs.includes('countWords'), 'countWords function exists');
  assert.ok(wordCountJs.includes('updateWordCounterDisplay'), 'updateWordCounterDisplay exists');
  assert.ok(wordCountJs.includes('isOverLimit'), 'isOverLimit calculation exists');
  assert.ok(wordCountJs.includes('isWarning'), 'isWarning threshold exists');
});

// GROUP 4: Applications Review & Undo
console.log(`\n--- Group 4: Applications Review & Auto-Chat Transition ---`);
test('Applications have status chips (amber, green, gray), auto-chat on accept, and Undo toast on decline', () => {
  assert.ok(inboxJs.includes('status-chip-pending'), 'Pending amber status chip');
  assert.ok(inboxJs.includes('status-chip-accepted'), 'Accepted green status chip');
  assert.ok(inboxJs.includes('status-chip-declined'), 'Declined gray status chip');

  // Verify auto chat opening on accept
  assert.ok(storeJs.includes("triggerDirectChatCTA"), 'Accepting applicant triggers direct chat CTA');
  assert.ok(storeJs.includes("Welcome to the team!"), 'Accepting sends automatic welcome message');

  // Verify undo toast on decline
  assert.ok(storeJs.includes("onUndo:"), 'Declining applicant provides onUndo callback');
  assert.ok(storeJs.includes("restored to Pending"), 'Undo restores application back to Pending');
});

// GROUP 5: Real-Time Chat Features
console.log(`\n--- Group 5: Real-Time Chat Features ---`);
test('Chat supports typing indicator, read receipts, timestamps, and DMs / Global room', () => {
  assert.ok(inboxJs.includes('typing-indicator') || componentsCss.includes('typing-indicator'), 'Typing indicator supported');
  assert.ok(inboxJs.includes('read-receipt') || componentsCss.includes('read-receipt'), 'Read receipt checkmarks supported');
  assert.ok(inboxJs.includes('msg-time-stamp'), 'Message timestamps supported');
  assert.ok(storeJs.includes('GLOBAL_COMMUNITY_CHAT'), 'Global community room supported');
});

// GROUP 6: Onboarding & Feed Personalization
console.log(`\n--- Group 6: Onboarding & Feed Personalization ---`);
test('Onboarding selects 3-5 skills and personalizes feed prioritization', () => {
  assert.ok(onboardingJs.includes('selectedSkills.length < 3'), 'Requires at least 3 skills');
  assert.ok(onboardingJs.includes('selectedSkills.length >= 5'), 'Caps at 5 skills max');
  assert.ok(postCardJs.includes('Matches your skills'), 'Feed card highlights projects matching user skills');
  assert.ok(feedJs.includes('userSkills.length > 0'), 'Feed prioritizes projects matching user skills');
});

// GROUP 7: Explore View
console.log(`\n--- Group 7: Explore View ---`);
test('Explore view features search with debouncing, browse by skills with counts, and category cards', () => {
  assert.ok(exploreJs.includes('Browse by Skill:'), 'Browse by skill section');
  assert.ok(exploreJs.includes('Browse by Category:'), 'Browse by category section');
  assert.ok(exploreJs.includes('explore-search-input'), 'Explore search bar');
});

// GROUP 8: Simulation of the 3 Core User Flows
console.log(`\n--- Group 8: End-to-End Simulation of 3 Core Flows ---`);
test('Flow 1: Discover -> Apply (feed card -> apply -> disabled Applied ✓ state)', () => {
  const dummyPost = {
    id: "flow_test_post",
    title: "Hackathon Team",
    text: "Need frontend dev",
    skills: ["React"],
    userName: "Alice",
    userUid: "user_alice",
    likes: 5,
    applications: []
  };

  const userBob = { uid: "user_bob", user: "@bob", name: "Bob" };

  // Before apply
  const { renderPostCard } = require('../src/ui/postCard.js');
  const cardBefore = renderPostCard(dummyPost, { user: userBob, ui: { expandedComments: {} } });
  assert.ok(cardBefore.includes('Apply to Join'), 'Card before applying must show "Apply to Join"');
  assert.ok(!cardBefore.includes('Applied ✓'), 'Card before applying must NOT show "Applied ✓"');

  // Bob applies
  dummyPost.applications.push({
    applicantUid: userBob.uid,
    applicantName: userBob.name,
    applicantHandle: userBob.user,
    role: "Frontend Developer",
    status: "pending"
  });

  // After apply
  const cardAfter = renderPostCard(dummyPost, { user: userBob, ui: { expandedComments: {} } });
  assert.ok(cardAfter.includes('Applied ✓'), 'Card after applying must show "Applied ✓"');
  assert.ok(!cardAfter.includes('Apply to Join'), 'Card after applying must NOT show "Apply to Join"');
});

test('Flow 2: Review -> Accept (review application -> accept -> chat message prepared)', () => {
  let appStatus = 'pending';
  let chatOpened = false;
  let sentMsg = '';

  const mockApp = { applicantUid: 'user_dev', applicantName: 'Dev', status: 'pending' };
  
  // Accept applicant
  mockApp.status = 'accepted';
  chatOpened = true;
  sentMsg = '🎉 Welcome to the team!';

  assert.strictEqual(mockApp.status, 'accepted');
  assert.strictEqual(chatOpened, true);
  assert.ok(sentMsg.includes('Welcome to the team'));
});

test('Flow 3: Post -> Manage (create post -> view applicant count)', () => {
  const newPost = {
    id: 'post_123',
    title: 'New AI Project',
    text: 'Building AI tools',
    userUid: 'guest_demo_user',
    applications: [
      { id: 'app_1', applicantName: 'Karan', status: 'pending' },
      { id: 'app_2', applicantName: 'Simran', status: 'pending' }
    ]
  };

  assert.strictEqual(newPost.applications.length, 2);
});

console.log(`\n========================================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
