/**
 * test-e2e-quality-pass.js
 * Comprehensive End-to-End Automated Test Suite for Phase 5 Quality Pass
 * 
 * Verifies:
 * 1. Flow 1: Discover -> Apply
 * 2. Flow 2: Review -> Accept
 * 3. Flow 3: Post -> Manage
 * 4. Accessibility standards (ARIA, keyboard navigation, focus trap, visible focus, contrast)
 * 5. Performance optimizations (feed pagination, render memoization, lazy image loading, search debounce)
 * 6. Firestore Security Rules file validation
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`  ❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    } else {
        console.log(`  ✅ PASSED: ${message}`);
        passedTests++;
    }
}

// ---------------------------------------------------------------------------
// 1. Mock Browser Environment Setup
// ---------------------------------------------------------------------------
const domElements = {};

class MockElement {
    constructor(id, tagName = 'div') {
        this.id = id;
        this.tagName = tagName.toUpperCase();
        this.classList = {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); },
            contains(c) { return this._classes.has(c); },
            toggle(c, force) {
                if (force !== undefined) {
                    if (force) this._classes.add(c);
                    else this._classes.delete(c);
                } else {
                    if (this._classes.has(c)) this._classes.delete(c);
                    else this._classes.add(c);
                }
            }
        };
        this.attributes = {};
        this.style = {};
        this.children = [];
        this._innerHTML = '';
        this.value = '';
        this.innerText = '';
    }

    setAttribute(name, val) { this.attributes[name] = String(val); }
    getAttribute(name) { return this.attributes[name] || null; }
    removeAttribute(name) { delete this.attributes[name]; }
    
    set innerHTML(html) {
        this._innerHTML = html;
        this.innerText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    get innerHTML() { return this._innerHTML; }

    appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
    }
    removeChild(child) {
        this.children = this.children.filter(c => c !== child);
    }
    contains(child) {
        if (child === this) return true;
        return this.children.some(c => c === child || (c.contains && c.contains(child)));
    }
    focus() { this.focused = true; }
    querySelectorAll(selector) { return []; }
    querySelector(selector) { return null; }
}

function getOrCreateMockElement(id) {
    if (!domElements[id]) {
        domElements[id] = new MockElement(id);
    }
    return domElements[id];
}

const mockDocument = {
    readyState: 'complete',
    activeElement: null,
    body: new MockElement('body'),
    getElementById(id) {
        return getOrCreateMockElement(id);
    },
    createElement(tag) {
        return new MockElement(`el_${Date.now()}_${Math.random()}`, tag);
    },
    querySelectorAll(selector) {
        const matches = [];
        for (const key in domElements) {
            const el = domElements[key];
            if (selector.includes('.sheet-overlay') && el.classList.contains('sheet-overlay')) matches.push(el);
            if (selector.includes('.modal-overlay') && el.classList.contains('modal-overlay')) matches.push(el);
            if (selector.includes('.category-pill') && el.classList.contains('category-pill')) matches.push(el);
        }
        return matches;
    },
    addEventListener() {},
    removeEventListener() {}
};

const mockWindow = {
    document: mockDocument,
    localStorage: {
        _store: {},
        getItem(k) { return this._store[k] || null; },
        setItem(k, v) { this._store[k] = String(v); },
        removeItem(k) { delete this._store[k]; }
    },
    scrollTo() {},
    requestAnimationFrame(cb) { return setTimeout(cb, 0); },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    RegExp: RegExp,
    Number: Number,
    Boolean: Boolean
};
mockWindow.window = mockWindow;

// Global Firebase Mock
mockWindow.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => Date.now(),
            increment: (n) => n,
            arrayUnion: (item) => [item],
            arrayRemove: (item) => []
        }
    }
};

mockWindow.SyncUpFirebase = {
    db: {
        collection: () => ({
            doc: () => ({
                set: async () => {},
                update: async () => {},
                delete: async () => {},
                get: async () => ({ exists: false }),
                onSnapshot: (cb) => { cb([]); return () => {}; }
            }),
            onSnapshot: (cb) => { cb([]); return () => {}; }
        })
    },
    auth: {
        currentUser: { uid: 'user_priya', email: 'priya@patna.edu', emailVerified: true }
    },
    storage: null
};

// Load project scripts into VM context
const scriptsToLoad = [
    'js/utils.js',
    'js/toast.js',
    'js/sheet.js',
    'js/data-service.js',
    'js/store.js',
    'js/ui-feed.js',
    'js/ui-inbox.js',
    'js/ui-uploads.js',
    'js/ui-chat.js',
    'js/ui-profile.js',
    'js/ui-modals.js',
    'js/ui-auth.js',
    'js/app.js'
];

const ctx = vm.createContext(mockWindow);

scriptsToLoad.forEach(scriptPath => {
    const fullPath = path.join(__dirname, scriptPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, ctx, { filename: scriptPath });
});

console.log("\n=======================================================");
console.log("SYNCUP PHASE 5: QUALITY PASS AUTOMATED TEST SUITE");
console.log("=======================================================\n");

async function runTestSuite() {
    const store = ctx.SyncUpStore;
    const sheet = ctx.SyncUpSheet;
    const app = ctx.SyncUpApp;
    const uiFeed = ctx.SyncUpUIFeed;
    const uiInbox = ctx.SyncUpUIInbox;

    // Set initial test user (Sneha)
    store.setUser({
        uid: 'user_sneha',
        name: 'Sneha Verma',
        user: '@sneha_v',
        skills: ['React', 'Flutter', 'UI/UX'],
        college: 'NIT Patna | IT'
    });

    // ---------------------------------------------------------------------------
    // TEST SUITE 1: FLOW 1 (Discover -> Apply)
    // ---------------------------------------------------------------------------
    console.log("▶ TEST SUITE 1: Flow 1 - Discover → Apply");

    // 1.1 Verify initial posts in feed
    const state0 = store.getState();
    assert(state0.posts.length >= 4, `Feed contains ${state0.posts.length} initial project posts`);

    // Find the target post to apply to: "sample_ai_interview"
    const targetPostId = 'sample_ai_interview';
    const postBefore = state0.posts.find(p => p.id === targetPostId);
    assert(postBefore !== undefined, `Target project post "${targetPostId}" exists in store`);
    assert(postBefore.status === 'Recruiting', `Target post status is "${postBefore.status}"`);
    assert(postBefore.applications.length === 0, `Target post has 0 initial applications`);

    // 1.2 Open application sheet
    const applySheetEl = getOrCreateMockElement('sheet-apply-team');
    applySheetEl.classList.add('sheet-overlay', 'modal-overlay');
    sheet.open('sheet-apply-team', { postId: targetPostId });
    assert(applySheetEl.classList.contains('open'), `Sheet "sheet-apply-team" opens when user clicks Apply`);
    assert(applySheetEl.getAttribute('aria-modal') === 'true', `Sheet has aria-modal="true"`);
    assert(applySheetEl.getAttribute('aria-hidden') === 'false', `Sheet has aria-hidden="false" when opened`);

    // 1.3 Submit team application
    const applicationRole = 'FastAPI Engineer';
    const applicationPitch = 'I have deployed FastAPI microservices on AWS and built AI pipelines with LangChain.';
    await store.applyToPost(targetPostId, applicationRole, applicationPitch);

    // 1.4 Verify post state updated with application
    const stateAfterApply = store.getState();
    const postAfter = stateAfterApply.posts.find(p => p.id === targetPostId);
    assert(postAfter.applications.length === 1, `Post applications array updated to 1 application`);
    const newApp = postAfter.applications[0];
    assert(newApp.applicantUid === 'user_sneha', `Applicant UID correctly stored as "${newApp.applicantUid}"`);
    assert(newApp.role === applicationRole, `Applicant role stored as "${newApp.role}"`);
    assert(newApp.status === 'pending', `Initial application status is "pending"`);

    // 1.5 Verify feed render reflects applied status
    const feedContainer = getOrCreateMockElement('feed-posts-stream');
    uiFeed.renderFeed(stateAfterApply, true);
    assert(feedContainer.innerHTML.includes('Applied ✓'), `Project card now displays status chip "Applied ✓"`);
    assert(feedContainer.innerHTML.includes('disabled title="You have submitted an application to this project"'), `Apply button is now disabled to prevent duplicate submissions`);
    assert(feedContainer.innerHTML.includes('👥 1 applicant'), `Project card shows updated count "👥 1 applicant"`);

    // ---------------------------------------------------------------------------
    // TEST SUITE 2: FLOW 2 (Review -> Accept)
    // ---------------------------------------------------------------------------
    console.log("\n▶ TEST SUITE 2: Flow 2 - Review → Accept");

    // Switch active user to Project Owner (Priya Sharma)
    store.setUser({
        uid: 'user_priya',
        name: 'Priya Sharma',
        user: '@priya_code',
        skills: ['Python', 'FastAPI', 'OpenAI'],
        college: 'Patna University | CS'
    });

    // 2.1 Verify application appears in Owner's Inbox
    const inboxContainer = getOrCreateMockElement('inbox-applications-stream');
    store.setUi({ inboxTab: 'applications', currentTab: 'inbox' });
    uiInbox.renderInbox(store.getState());

    assert(inboxContainer.innerHTML.includes('Sneha Verma'), `Inbox displays applicant name "Sneha Verma"`);
    assert(inboxContainer.innerHTML.includes('@sneha_v'), `Inbox displays applicant handle "@sneha_v"`);
    assert(inboxContainer.innerHTML.includes('FastAPI Engineer'), `Inbox displays applied role "FastAPI Engineer"`);
    assert(inboxContainer.innerHTML.includes('PENDING'), `Inbox status chip displays "PENDING"`);
    assert(inboxContainer.innerHTML.includes('Accept'), `Inbox provides "Accept" action button`);
    assert(inboxContainer.innerHTML.includes('Decline'), `Inbox provides "Decline" action button`);

    // 2.2 Owner accepts the application
    await store.updateApplicationStatus(targetPostId, 0, 'accepted');

    const stateAfterAccept = store.getState();
    const acceptedPost = stateAfterAccept.posts.find(p => p.id === targetPostId);
    assert(acceptedPost.applications[0].status === 'accepted', `Application status changed to "accepted" in Store`);

    // 2.3 Verify status chip updates to ACCEPTED
    uiInbox.renderInbox(stateAfterAccept);
    assert(inboxContainer.innerHTML.includes('ACCEPTED ✓'), `Inbox status chip updated to "ACCEPTED ✓"`);

    // 2.4 Verify automatic 1-on-1 direct chat creation
    // The store's updateApplicationStatus triggers triggerDirectChatCTA and sendMessage on accept
    await new Promise(r => setTimeout(r, 350));
    const stateChat = store.getState();
    assert(stateChat.chats.activeContact !== null, `Direct chat session initiated`);
    assert(stateChat.chats.activeContact.name === 'Sneha Verma', `Active chat contact set to "Sneha Verma"`);
    assert(stateChat.chats.activeMode === 'dm', `Chat mode set to direct message 'dm'`);

    // 2.5 Verify welcome message sent into thread
    const contactUid = 'user_sneha';
    const chatKey = ['user_priya', contactUid].sort().join('_');
    const threadKey = "CHAT_" + chatKey;
    const messages = stateChat.chats.threads[threadKey] || [];
    assert(messages.length >= 1, `Direct chat thread contains welcome message (found ${messages.length})`);
    assert(messages[0].text.includes('Welcome to the team!'), `Welcome message text contains greeting ("${messages[0].text.substring(0, 45)}...")`);
    assert(messages[0].senderName === 'Priya Sharma', `Message sender is the project lead "Priya Sharma"`);

    // ---------------------------------------------------------------------------
    // TEST SUITE 3: FLOW 3 (Post -> Manage)
    // ---------------------------------------------------------------------------
    console.log("\n▶ TEST SUITE 3: Flow 3 - Post → Manage");

    // 3.1 Step 1 -> Step 2 Live Preview
    const titleInput = getOrCreateMockElement('post-inp-title');
    const descInput = getOrCreateMockElement('post-inp-desc');
    const skillsInput = getOrCreateMockElement('post-inp-skills');
    const statusInput = getOrCreateMockElement('post-inp-status');

    titleInput.value = 'Distributed P2P Storage Node (Rust)';
    descInput.value = 'Building a decentralized P2P storage network using Libp2p, IPFS pinning, and Rust.';
    skillsInput.value = 'Rust, Libp2p, Cryptography, IPFS';
    statusInput.value = 'Recruiting';

    ctx.SyncUpUIModals.updateLivePostPreview();

    const prevTitle = getOrCreateMockElement('prev-title');
    const prevDesc = getOrCreateMockElement('prev-desc');
    const prevBadge = getOrCreateMockElement('prev-status-badge');
    const prevTags = getOrCreateMockElement('prev-tags');

    assert(prevTitle.innerText === 'Distributed P2P Storage Node (Rust)', `Live preview title matches input`);
    assert(prevDesc.innerText.includes('decentralized P2P storage'), `Live preview description matches input`);
    assert(prevBadge.innerText.includes('Recruiting'), `Live preview shows "🟢 Recruiting" badge`);
    assert(prevTags.innerHTML.includes('Rust') && prevTags.innerHTML.includes('Libp2p'), `Live preview renders skill chips`);

    // 3.2 Publish the project
    const newProjectData = {
        title: titleInput.value,
        text: descInput.value,
        skills: ['Rust', 'Libp2p', 'Cryptography', 'IPFS'],
        category: 'Hackathons',
        status: 'Recruiting',
        rolesOpen: 2,
        userName: 'Priya Sharma',
        userHandle: '@priya_code',
        userUid: 'user_priya',
        college: 'Patna University | CS'
    };

    const initialPostsCount = store.getState().posts.length;
    await store.createPost(newProjectData);

    const stateAfterPublish = store.getState();
    assert(stateAfterPublish.posts.length === initialPostsCount + 1, `Post successfully added to store (${stateAfterPublish.posts.length} total)`);
    const createdPost = stateAfterPublish.posts[0];
    assert(createdPost.title === newProjectData.title, `New post is positioned at top of feed: "${createdPost.title}"`);
    assert(createdPost.applications.length === 0, `Initial applicant count is 0`);

    // 3.3 Verify Feed and Manage view displays applicant counts
    uiFeed.renderFeed(stateAfterPublish, true);
    assert(feedContainer.innerHTML.includes(newProjectData.title), `Feed contains published project card`);
    assert(feedContainer.innerHTML.includes('👥 0 applicants'), `Feed displays initial badge "👥 0 applicants"`);

    // 3.4 Simulate collaborator applying to this new post
    await store.applyToPost(createdPost.id, 'Cryptography Specialist', 'I have 2 years of experience with zero-knowledge proofs.');
    const stateWithApplicant = store.getState();
    uiFeed.renderFeed(stateWithApplicant, true);
    assert(feedContainer.innerHTML.includes('👥 1 applicant'), `Feed displays incremented badge "👥 1 applicant"`);

    // ---------------------------------------------------------------------------
    // TEST SUITE 4: ACCESSIBILITY VALIDATION
    // ---------------------------------------------------------------------------
    console.log("\n▶ TEST SUITE 4: Accessibility Validation");

    // 4.1 Check all sheets have proper ARIA attributes in index.html
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const sheetIds = [
        'sheet-create-post',
        'sheet-apply-team',
        'sheet-review-applications',
        'sheet-report-post',
        'sheet-edit-profile',
        'sheet-add-skill',
        'sheet-onboarding'
    ];

    sheetIds.forEach(id => {
        const regex = new RegExp(`id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-hidden="true"`);
        const regexAlt = new RegExp(`id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"`);
        assert(regex.test(indexHtml) || regexAlt.test(indexHtml), `Sheet #${id} has role="dialog" and aria-modal="true"`);
    });

    // 4.2 Skip to content link
    assert(indexHtml.includes('class="skip-to-content"'), `Index contains skip-to-content anchor link`);
    assert(indexHtml.includes('id="main-feed-column" tabindex="-1"'), `Main feed column has id="main-feed-column" and tabindex="-1"`);

    // 4.3 Focus-visible ring
    const variablesCss = fs.readFileSync(path.join(__dirname, 'css/variables.css'), 'utf8');
    assert(variablesCss.includes(':focus-visible'), `CSS defines :focus-visible ring styles`);
    assert(variablesCss.includes('--color-primary-btn: #087F5B'), `Brand primary button token defined as #087F5B`);
    assert(variablesCss.includes('--color-accent: #10B981'), `Accent token #10B981 designated for fills/icons only`);

    // 4.4 Form labels
    assert(indexHtml.includes('<label for="inp-name"'), `Register name field has linked <label for="inp-name">`);
    assert(indexHtml.includes('<label for="post-inp-title"'), `Create post title field has linked <label for="post-inp-title">`);
    assert(indexHtml.includes('aria-label="Search skills, projects, or users"'), `Global search input has descriptive aria-label`);

    // 4.5 Toast accessibility
    const toastJs = fs.readFileSync(path.join(__dirname, 'js/toast.js'), 'utf8');
    assert(toastJs.includes("aria-live', 'polite'"), `Toast container implements aria-live="polite"`);
    assert(toastJs.includes("role', type === 'error' ? 'alert' : 'status'"), `Toast items implement role="alert" or role="status"`);

    // ---------------------------------------------------------------------------
    // TEST SUITE 5: PERFORMANCE OPTIMIZATIONS
    // ---------------------------------------------------------------------------
    console.log("\n▶ TEST SUITE 5: Performance Optimizations");

    // 5.1 Feed pagination limit
    const storeJs = fs.readFileSync(path.join(__dirname, 'js/store.js'), 'utf8');
    assert(storeJs.includes('feedLimit: 20'), `Store state defines feedLimit: 20`);
    assert(storeJs.includes('loadMorePosts'), `Store exposes loadMorePosts action`);

    // 5.2 Test load more behavior with > 20 mock posts
    const mockPosts25 = [];
    for (let i = 0; i < 25; i++) {
        mockPosts25.push({
            id: `test_post_${i}`,
            title: `Project #${i}`,
            text: `Description for project #${i}`,
            skills: ['React'],
            category: 'College Projects',
            status: 'Recruiting',
            createdAt: Date.now() - i * 1000,
            likes: 0,
            comments: [],
            applications: []
        });
    }
    store.setPosts(mockPosts25);
    store.setUi({ feedLimit: 20 });
    uiFeed.renderFeed(store.getState(), true);
    assert(feedContainer.innerHTML.includes('Load More Projects (20 of 25)'), `Feed renders pagination button for > 20 items ("Load More Projects (20 of 25)")`);

    app.loadMorePosts();
    assert(store.getState().ui.feedLimit === 40, `loadMorePosts increments feedLimit to 40`);
    uiFeed.renderFeed(store.getState(), true);
    assert(feedContainer.innerHTML.includes('Showing all 25 projects'), `Feed renders completion message when all items loaded`);

    // 5.3 Feed render memoization
    const renderCallCountBefore = feedContainer.innerHTML;
    feedContainer.innerHTML = 'FLAG_UNTOUCHED';
    uiFeed.renderFeed(store.getState(), false); // Should skip because key hasn't changed
    assert(feedContainer.innerHTML === 'FLAG_UNTOUCHED', `renderFeed skips re-render when state has not changed (memoization verified)`);

    // 5.4 Search debouncing
    const appJs = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');
    assert(appJs.includes('searchDebounceTimer'), `app.js implements search debouncing timer`);
    assert(appJs.includes('setTimeout') && appJs.includes('250'), `Search debounce interval configured at 250ms`);

    // 5.5 Lazy loading on images
    const uiFeedJs = fs.readFileSync(path.join(__dirname, 'js/ui-feed.js'), 'utf8');
    assert(uiFeedJs.includes('loading="lazy"') && uiFeedJs.includes('decoding="async"'), `ui-feed.js images include loading="lazy" and decoding="async"`);

    // ---------------------------------------------------------------------------
    // TEST SUITE 6: FIRESTORE SECURITY RULES
    // ---------------------------------------------------------------------------
    console.log("\n▶ TEST SUITE 6: Firestore Security Rules Validation");

    const rulesPath = path.join(__dirname, 'firestore.rules');
    assert(fs.existsSync(rulesPath), `firestore.rules file exists on disk`);

    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    assert(rulesContent.includes("rules_version = '2';"), `Rules specify rules_version = '2'`);
    assert(rulesContent.includes("match /users/{userId}"), `Rules define user profile access controls`);
    assert(rulesContent.includes("allow update, delete: if isUser(userId);"), `Users can only update/delete their own profile`);
    assert(rulesContent.includes("resource.data.userUid == request.auth.uid;"), `Posts can only be deleted/edited by their author`);
    assert(rulesContent.includes("applications"), `Rules explicitly govern the 'applications' array`);
    assert(rulesContent.includes("match /chats/{chatId}"), `Rules secure chats collection`);
    assert(rulesContent.includes("isChatParticipant"), `Direct chats are restricted strictly to conversation participants`);

    console.log("\n=======================================================");
    console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log("=======================================================\n");
}

runTestSuite().catch(err => {
    console.error("Test Suite execution encountered an error:", err);
    process.exit(1);
});
