/**
 * src/main.js
 * 
 * Main Application Bootstrap & Entry Point
 * Implements the 4-layer one-way data flow:
 * UI Components -> Store -> Data Service -> Firestore / Storage / Auth
 * Subscribes master render loop to Store state, attaches auth listener,
 * and exposes public handlers for HTML event attributes.
 */

import * as store from './store/store.js';
import * as postsService from './services/postsService.js';
import * as chatService from './services/chatService.js';
import * as authService from './services/authService.js';
import { compressImage } from './utils/imageCompress.js';
import { escapeHtml } from './utils/dom.js';

import { showToast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheet.js';
import { renderFeed, renderRightRail } from './ui/feed.js';
import { renderExplore } from './ui/explore.js';
import { renderInbox, switchInboxTab, filterContacts, calculateInboxBadge } from './ui/inbox.js';
import { renderProfile } from './ui/profile.js';
import { updateTopNavAndSidebar, navigateTo, switchTab, toggleMobileSidebar } from './ui/nav.js';
import {
  renderModals,
  updateLivePostPreview,
  handleWordLimitCount,
  goToCreateStep,
  handlePostScreenshotUpload,
  removePostScreenshot,
  submitNewProjectPost,
  submitTeamApplication,
  confirmSubmitReport,
  openEditProfileModal,
  saveProfileChanges,
  confirmAddSkill
} from './ui/modals.js';
import { openOnboarding, toggleSkill, submitOnboarding, renderOnboardingGrid } from './ui/onboarding.js';
import {
  openAuthTab,
  switchAuthTab,
  togglePasswordVisibility,
  continueAsDemoGuest,
  handleGoogleSignIn,
  handleAuthSubmit,
  logout
} from './ui/auth.js';

let unsubscribeFeed = null;
let unsubscribeChat = null;
let currentChatDocId = null;

/**
 * Master Render Loop: runs whenever Store state updates.
 */
function renderAll(state) {
  updateTopNavAndSidebar(state);

  // Synchronize inbox notification badges across desktop sidebar & mobile bottom nav
  const badgeCount = calculateInboxBadge(state);
  const sideBadge = document.getElementById('inbox-sidebar-badge');
  const mobBadge = document.getElementById('inbox-mobile-badge');
  const tabAppsBadge = document.getElementById('inbox-tab-apps-badge');
  if (sideBadge) {
    sideBadge.innerText = badgeCount;
    sideBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
  }
  if (mobBadge) {
    mobBadge.innerText = badgeCount;
    mobBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
  }
  if (tabAppsBadge) {
    tabAppsBadge.innerText = badgeCount;
    tabAppsBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
  }

  const currentView = state.ui ? state.ui.currentView : 'landing';
  const currentTab = state.ui ? state.ui.currentTab : 'home';

  if (currentView === 'dashboard') {
    if (currentTab === 'home') {
      renderFeed(state);
      renderRightRail(state);
    } else if (currentTab === 'explore') {
      renderExplore(state);
    } else if (currentTab === 'inbox') {
      renderInbox(state);
    } else if (currentTab === 'profile') {
      renderProfile(state);
    }
  }

  renderModals(state);
}

/**
 * Firestore Real-time Feed Listener
 */
function initFeedSubscription() {
  if (unsubscribeFeed) return;
  store.setUi({ loading: { feed: true } });

  unsubscribeFeed = postsService.listenToFeed(
    (posts) => {
      store.setPosts(posts);
    },
    (err) => {
      console.warn("[Feed] Real-time stream notice:", err.message);
      store.setUi({
        error: { feed: err.message || "Failed to load live project posts." },
        loading: { feed: false }
      });
      showToast({ message: "Unable to load live feed. Tap Retry to reconnect.", icon: "⚠️", type: "error" });
    }
  );
}

/**
 * Firestore Real-time Chat Listener
 */
function initChatSubscription() {
  const state = store.getState();
  const currentUid = state.user ? state.user.uid : 'guest';
  const targetUid = (state.chats && state.chats.activeContact) ? state.chats.activeContact.uid : 'user_rohit';

  const docId = (state.chats && state.chats.activeMode === 'global')
    ? "GLOBAL_COMMUNITY_CHAT"
    : "CHAT_" + [currentUid, targetUid].sort().join('_');

  if (unsubscribeChat && currentChatDocId === docId) {
    return;
  }

  if (unsubscribeChat) {
    try { unsubscribeChat(); } catch (e) {}
    unsubscribeChat = null;
  }

  currentChatDocId = docId;
  unsubscribeChat = chatService.listenToChatThread(
    docId,
    (messages) => {
      store.setChatMessages(docId, messages);
    },
    (err) => {
      console.warn("Chat stream note:", err.message);
    }
  );
}

function retryFeed() {
  store.setUi({ error: { feed: null }, loading: { feed: true } });
  if (unsubscribeFeed) {
    try { unsubscribeFeed(); } catch (e) {}
    unsubscribeFeed = null;
  }
  initFeedSubscription();
}

function toggleDropdown(postId) {
  const state = store.getState();
  const nextId = state.ui.dropdownPostId === postId ? null : postId;
  store.setUi({ dropdownPostId: nextId });
}

function toggleComments(postId) {
  const state = store.getState();
  const exp = { ...(state.ui.expandedComments || {}) };
  exp[postId] = !exp[postId];
  store.setUi({ expandedComments: exp });
}

function submitComment(postId) {
  const inp = document.getElementById('comment-inp-' + postId);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = "";
  store.commentPost(postId, text);
}

function blockUserPrompt(userUid, userName) {
  const state = store.getState();
  if (!state.user) {
    showToast({ message: "Please login first.", icon: "🔒", type: "info" });
    return;
  }
  if (!confirm(`Are you sure you want to block ${userName}? All their posts will be hidden from your account.`)) return;

  const updated = { ...state.user };
  if (!updated.blockedUsers) updated.blockedUsers = [];
  if (!updated.blockedUsers.includes(userUid)) {
    updated.blockedUsers.push(userUid);
    store.setUser(updated);
    authService.saveUserProfile(updated.uid, updated).catch(() => {});
  }
  showToast({ message: `${userName} has been blocked.`, icon: "🚫", type: "info" });
}

function removeSkill(index) {
  const state = store.getState();
  if (!state.user || !state.user.skills) return;
  const updated = { ...state.user };
  updated.skills = [...updated.skills];
  updated.skills.splice(index, 1);
  store.setUser(updated);
  authService.saveUserProfile(updated.uid, updated).catch(() => {});
}

function filterCategory(category) {
  store.setUi({ categoryFilter: category });
  document.querySelectorAll('.category-pill').forEach(btn => {
    const btnText = btn.innerText.trim();
    btn.classList.toggle('active', btnText === category || (category === 'All' && btnText === 'All Posts'));
  });
}

function filterBySkill(skill) {
  store.setUi({ skillFilter: skill });
}

function filterByRole(role) {
  store.setUi({ roleFilter: role });
}

function sortBy(order) {
  store.setUi({ sortOrder: order });
}

function resetFilters() {
  store.setUi({
    categoryFilter: 'All',
    skillFilter: 'All',
    roleFilter: 'All',
    searchTerm: '',
    sortOrder: 'newest'
  });
  document.querySelectorAll('.category-pill').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.trim() === 'All Posts');
  });
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.value = '';
}

let searchDebounceTimer = null;
function handleSearch(term, immediate = false) {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const val = (term || "").trim();
  if (immediate || !val) {
    store.setUi({ searchTerm: val });
  } else {
    searchDebounceTimer = setTimeout(() => {
      store.setUi({ searchTerm: val });
    }, 250);
  }
}

function sendEmailVerificationLink() {
  const fbAuth = window.firebase?.auth?.();
  if (fbAuth && fbAuth.currentUser) {
    fbAuth.currentUser.sendEmailVerification()
      .then(() => showToast({ message: "Verification link sent to " + fbAuth.currentUser.email, icon: "✉️", type: "success" }))
      .catch(err => showToast({ message: "Verification link: " + err.message, icon: "⚠️", type: "error" }));
  }
}

function handleForgotPassword() {
  const emailInp = document.getElementById('inp-email');
  const email = emailInp ? emailInp.value.trim() : '';
  if (!email || !email.includes('@')) {
    showToast({ message: "Please enter your valid email address first, then click 'Forgot password?'.", icon: "⚠️", type: "error" });
    return;
  }
  const fbAuth = window.firebase?.auth?.();
  if (fbAuth) {
    fbAuth.sendPasswordResetEmail(email)
      .then(() => showToast({ message: "Password reset email sent! Check your inbox.", icon: "📧", type: "success" }))
      .catch(err => showToast({ message: "Password reset: " + err.message, icon: "⚠️", type: "error" }));
  }
}

async function handleProfilePhotoUpload(e) {
  if (!e.target.files || !e.target.files.length) return;
  const file = e.target.files[0];
  try {
    // Compress avatar enforcing under 70 KB target
    const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8, maxBytes: 70 * 1024 });
    const state = store.getState();
    if (state.user) {
      const updated = { ...state.user, pic: compressed };
      store.setUser(updated);
      await authService.saveUserProfile(updated.uid, updated);
      showToast({ message: "Profile photo updated!", icon: "📷", type: "success" });
    }
  } catch (err) {
    console.error("Photo upload error:", err);
    showToast({ message: "Could not process image: " + err.message, icon: "⚠️", type: "error" });
  }
}

// Client-side rate limiting / debouncing guards
const pendingLikes = new Set();
let lastCommentTime = 0;

function handleDelegatedAction(action, el, e) {
  switch (action) {
    case 'toggle-dropdown': {
      const postId = el.dataset.postId;
      if (postId) toggleDropdown(postId);
      break;
    }
    case 'delete-post': {
      const postId = el.dataset.postId;
      if (postId) store.deletePost(postId);
      break;
    }
    case 'report-post': {
      const postId = el.dataset.postId;
      if (postId) openSheet('sheet-report-post', { reportPostId: postId });
      break;
    }
    case 'block-user': {
      const userUid = el.dataset.userUid;
      const userName = el.dataset.userName || 'Author';
      if (userUid) blockUserPrompt(userUid, userName);
      break;
    }
    case 'like-post': {
      const postId = el.dataset.postId;
      if (!postId) break;
      if (pendingLikes.has(postId)) break;
      pendingLikes.add(postId);
      store.likePost(postId).finally(() => {
        setTimeout(() => pendingLikes.delete(postId), 350);
      });
      break;
    }
    case 'toggle-comments': {
      const postId = el.dataset.postId;
      if (postId) toggleComments(postId);
      break;
    }
    case 'chat-cta': {
      const { userUid, userName, userHandle, projectTitle } = el.dataset;
      store.triggerDirectChatCTA(userUid, userName, userHandle, projectTitle);
      break;
    }
    case 'chat-cta-close': {
      closeSheet();
      const { userUid, userName, userHandle, projectTitle } = el.dataset;
      store.triggerDirectChatCTA(userUid, userName, userHandle, projectTitle);
      break;
    }
    case 'review-applications': {
      const postId = el.dataset.postId;
      if (postId) openSheet('sheet-review-applications', { reviewPostId: postId });
      break;
    }
    case 'apply-team': {
      const postId = el.dataset.postId;
      const postTitle = el.dataset.postTitle || '';
      if (postId) openSheet('sheet-apply-team', { postId, postTitle });
      break;
    }
    case 'submit-comment': {
      const postId = el.dataset.postId;
      if (!postId) break;
      const now = Date.now();
      if (now - lastCommentTime < 1000) {
        showToast({ message: "Please wait a moment before posting another comment.", icon: "⏳", type: "info" });
        break;
      }
      lastCommentTime = now;
      submitComment(postId);
      break;
    }
    case 'update-app-status': {
      const { postId, appIndex, status } = el.dataset;
      if (postId && appIndex !== undefined && status) {
        store.updateApplicationStatus(postId, parseInt(appIndex, 10), status);
      }
      break;
    }
    case 'select-contact': {
      const contactId = el.dataset.contactId;
      if (contactId) {
        store.selectContact(contactId);
        const chatBox = document.getElementById('chat-layout-box');
        if (chatBox) chatBox.classList.add('mobile-conversation-active');
      }
      break;
    }
    case 'chat-mobile-back': {
      const chatBox = document.getElementById('chat-layout-box');
      if (chatBox) chatBox.classList.remove('mobile-conversation-active');
      break;
    }
    case 'toggle-theme': {
      toggleTheme();
      break;
    }
    case 'remove-skill': {
      const skillIndex = parseInt(el.dataset.skillIndex, 10);
      if (!isNaN(skillIndex)) removeSkill(skillIndex);
      break;
    }
    case 'open-sheet': {
      const sheetId = el.dataset.sheetId;
      if (sheetId) openSheet(sheetId);
      break;
    }
    case 'close-sheet': {
      closeSheet();
      break;
    }
    case 'filter-skill': {
      const skill = el.dataset.skill;
      if (skill) filterBySkill(skill);
      break;
    }
    case 'filter-category': {
      const category = el.dataset.category;
      if (category) {
        filterCategory(category);
        switchTab('home');
      }
      break;
    }
    case 'search-tag': {
      const tag = el.dataset.tag;
      if (tag) handleSearch(tag, true);
      break;
    }
    case 'clear-search': {
      handleSearch('', true);
      break;
    }
    case 'reset-filters': {
      resetFilters();
      break;
    }
    case 'retry-feed': {
      retryFeed();
      break;
    }
    case 'load-more-posts': {
      store.loadMorePosts();
      break;
    }
    case 'toggle-onboarding-skill': {
      const skill = el.dataset.skill;
      if (skill) toggleSkill(skill);
      break;
    }
    default:
      break;
  }
}

// Master Global Delegated Click Listener
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('sheet-overlay')) {
    closeSheet();
  }
  if (!e.target.closest('.dropdown-menu') && !e.target.closest('.btn-icon')) {
    store.setUi({ dropdownPostId: null });
  }

  // Handle centralized [data-action] interactions
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action) {
      handleDelegatedAction(action, actionEl, e);
    }
  }
});

// Delegated keydown listener (Escape key + Enter key for comment inputs)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSheet();
    store.setUi({ dropdownPostId: null });
    toggleMobileSidebar(false);
  } else if (e.key === 'Enter' && e.target && e.target.classList.contains('comment-input')) {
    e.preventDefault();
    const postId = e.target.dataset.postId;
    if (postId) {
      const now = Date.now();
      if (now - lastCommentTime < 1000) {
        showToast({ message: "Please wait a moment before posting another comment.", icon: "⏳", type: "info" });
        return;
      }
      lastCommentTime = now;
      submitComment(postId);
    }
  }
});

// Dark Mode Theme Management (tokens + prefers-color-scheme + localStorage)
export function initTheme() {
  let theme = 'light';
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('syncup_theme') : null;
    if (saved === 'dark' || saved === 'light') {
      theme = saved;
    } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (e) {}
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  updateThemeIcons(theme);
}

export function toggleTheme() {
  const current = (typeof document !== 'undefined' && document.documentElement)
    ? (document.documentElement.getAttribute('data-theme') || 'light')
    : 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', newTheme);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('syncup_theme', newTheme);
    }
  } catch (e) {}
  updateThemeIcons(newTheme);
  showToast({
    message: `${newTheme === 'dark' ? 'Dark' : 'Light'} theme activated`,
    icon: newTheme === 'dark' ? '🌙' : '☀️',
    type: 'info'
  });
}

function updateThemeIcons(theme) {
  if (typeof document === 'undefined') return;
  const topBtn = document.getElementById('theme-toggle-btn');
  const sidebarBtn = document.getElementById('theme-toggle-btn-sidebar');
  const sunIcon = `<svg class="lucide-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  const moonIcon = `<svg class="lucide-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  const icon = theme === 'dark' ? sunIcon : moonIcon;
  if (topBtn) topBtn.innerHTML = icon;
  if (sidebarBtn) sidebarBtn.innerHTML = icon;
}

// App Startup
function init() {
  // Initialize light/dark theme preference
  initTheme();

  // Subscribe master render loop to store
  store.subscribe(renderAll);

  // Initial render with current state
  renderAll(store.getState());

  // Listen to Auth State
  authService.onAuthStateChanged((firebaseUser) => {
    const state = store.getState();
    if (firebaseUser) {
      if (firebaseUser.isAnonymous) {
        if (!state.user || state.user.uid !== firebaseUser.uid) {
          const demoUser = {
            uid: firebaseUser.uid,
            isDemo: true,
            isAnonymous: true,
            name: (state.user && state.user.name) || "Demo Developer (Shreya)",
            user: (state.user && state.user.user) || "@demo_dev",
            email: "",
            pic: "",
            college: "Amity University Patna",
            edu: "BCA 2nd Sem | Amity University Patna",
            bio: "Passionate developer exploring SyncUp Demo Mode.",
            skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
            blockedUsers: [],
            hiddenPosts: []
          };
          store.setUser(demoUser);
        }
        navigateTo('dashboard');
        return;
      }

      authService.getUserProfile(firebaseUser.uid).then(profile => {
        const finalUser = profile || {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          user: '@' + (firebaseUser.displayName || firebaseUser.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase(),
          email: firebaseUser.email,
          college: "Amity University Patna",
          edu: "BCA 2nd Sem | Amity University Patna",
          bio: "Passionate developer, always eager to learn and build cool projects.",
          skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
          pic: firebaseUser.photoURL || "",
          blockedUsers: [],
          hiddenPosts: []
        };
        store.setUser(finalUser);
        navigateTo('dashboard');
      }).catch(() => {
        if (state.user) navigateTo('dashboard');
        else navigateTo('landing');
      });
    } else {
      if (state.user && (state.user.isDemo || state.user.isAnonymous)) {
        navigateTo('dashboard');
        return;
      }
      navigateTo('landing');
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Global Public API for HTML Event Attributes
window.SyncUpApp = {
  navigateTo,
  switchTab,
  toggleMobileSidebar,
  initTheme,
  toggleTheme,
  retryFeed,
  toggleDropdown,
  toggleComments,
  submitComment,
  blockUserPrompt,
  removeSkill,
  filterCategory,
  filterBySkill,
  filterByRole,
  sortBy,
  resetFilters,
  handleSearch,
  loadMorePosts: store.loadMorePosts,
  sendEmailVerificationLink,
  handleForgotPassword,
  handleProfilePhotoUpload,
  initFeedSubscription,
  initChatSubscription
};

window.SyncUpStore = store;
window.SyncUpSheet = { open: openSheet, close: closeSheet };
window.SyncUpToast = {
  show: showToast,
  success: (msg, opts) => showToast({ message: msg, type: 'success', ...opts }),
  error: (msg, opts) => showToast({ message: msg, type: 'error', ...opts }),
  info: (msg, opts) => showToast({ message: msg, type: 'info', ...opts })
};
window.SyncUpUtils = {
  escapeHtml,
  compressImage,
  showToast: (msg, icon) => showToast({ message: msg, icon })
};

window.SyncUpUIAuth = {
  openAuthTab,
  switchAuthTab,
  togglePasswordVisibility,
  continueAsDemoGuest,
  handleGoogleSignIn,
  handleAuthSubmit,
  logout
};

window.SyncUpUIFeed = {
  renderFeed,
  renderRightRail
};

window.SyncUpUIInbox = {
  renderInbox,
  switchInboxTab,
  calculateInboxBadge: () => calculateInboxBadge(store.getState())
};

window.SyncUpUIModals = {
  renderModals,
  updateLivePostPreview,
  handleWordLimitCount,
  goToCreateStep,
  handlePostScreenshotUpload,
  removePostScreenshot,
  submitNewProjectPost,
  submitTeamApplication,
  confirmSubmitReport,
  openEditProfileModal,
  saveProfileChanges,
  confirmAddSkill
};

window.SyncUpUIOnboarding = {
  openOnboarding,
  toggleSkill,
  submitOnboarding,
  renderOnboardingGrid
};

// Global direct bindings for inline HTML attributes
window.continueAsDemoGuest = continueAsDemoGuest;
window.navigateTo = navigateTo;
window.switchDashboardTab = switchTab;
window.loadMorePosts = store.loadMorePosts;
window.openAuthTab = openAuthTab;
window.switchAuthTab = switchAuthTab;
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleAuthSubmit = handleAuthSubmit;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleForgotPassword = handleForgotPassword;
window.sendEmailVerificationLink = sendEmailVerificationLink;
window.toggleMobileSidebar = toggleMobileSidebar;
window.logout = logout;
window.filterByCategory = filterCategory;
window.filterBySkill = filterBySkill;
window.filterByRole = filterByRole;
window.sortBy = sortBy;
window.resetFilters = resetFilters;
window.handleSearchFilter = handleSearch;
window.openCreatePostModal = () => openSheet('sheet-create-post');
window.openEditProfileModal = openEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.confirmAddSkill = confirmAddSkill;
window.removeSkill = removeSkill;
window.handleProfilePhotoUpload = handleProfilePhotoUpload;
window.switchChatMode = (m) => store.setChatMode(m);
window.filterChatContacts = filterContacts;
window.sendChatMessage = () => {
  const inp = document.getElementById('chat-message-input');
  if (inp) {
    store.sendMessage(inp.value);
    inp.value = '';
  }
};
window.submitNewProjectPost = submitNewProjectPost;
window.submitTeamApplication = submitTeamApplication;
window.confirmSubmitReport = confirmSubmitReport;
window.handleWordLimitCount = handleWordLimitCount;
window.handlePostScreenshotUpload = handlePostScreenshotUpload;
window.removePostScreenshot = removePostScreenshot;
window.updateLivePostPreview = updateLivePostPreview;
window.goToCreateStep = goToCreateStep;
window.switchInboxTab = switchInboxTab;
window.toggleTheme = toggleTheme;
window.scrollToLandingSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};
