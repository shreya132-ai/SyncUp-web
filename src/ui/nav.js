/**
 * src/ui/nav.js
 * 
 * Layer 1 UI Component: App Shell & Navigation
 * Manages 5 unified destinations on desktop and mobile:
 * Home · Explore · + Create · Inbox (Chats + Applications tabs, badge count) · Profile
 * Manages view transitions (Landing -> Auth -> Dashboard).
 */

import { escapeHtml } from '../utils/dom.js';
import { openSheet } from './sheet.js';
import { calculateInboxBadge } from './inbox.js';
import { setUi, getState } from '../store/store.js';

export function updateTopNavAndSidebar(state) {
  if (!state.user) return;
  const name = state.user.name || "User";
  const handle = state.user.user || "@username";
  const initial = name[0] ? name[0].toUpperCase() : 'U';

  const sideName = document.getElementById('side-user-name');
  const sideHandle = document.getElementById('side-user-handle');
  if (sideName) sideName.innerText = name;
  if (sideHandle) sideHandle.innerText = handle;

  const sideAvatar = document.getElementById('side-user-avatar');
  const topAvatar = document.getElementById('top-nav-avatar');

  if (sideAvatar) {
    if (state.user.pic) sideAvatar.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else sideAvatar.innerText = initial;
  }
  if (topAvatar) {
    if (state.user.pic) topAvatar.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else topAvatar.innerText = initial;
  }

  // Update inbox notification badges
  const badgeCount = calculateInboxBadge(state);
  const sideBadge = document.getElementById('inbox-sidebar-badge');
  const mobBadge = document.getElementById('inbox-mobile-badge');
  if (sideBadge) {
    sideBadge.innerText = badgeCount;
    sideBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
  }
  if (mobBadge) {
    mobBadge.innerText = badgeCount;
    mobBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
  }

  // Email verification banner
  const banner = document.getElementById('email-verify-banner');
  if (banner) {
    const fbAuth = window.firebase?.auth?.();
    if (fbAuth && fbAuth.currentUser && !fbAuth.currentUser.emailVerified && state.user.uid !== 'guest_demo_user') {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}

export function navigateTo(viewName) {
  setUi({ currentView: viewName });

  const landingView = document.getElementById('landing-view');
  const authView = document.getElementById('auth-view');
  const dashboardView = document.getElementById('dashboard-view');

  if (landingView) landingView.classList.add('hidden');
  if (authView) authView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');

  if (viewName === 'landing') {
    if (landingView) landingView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'auth') {
    if (authView) authView.classList.remove('hidden');
  } else if (viewName === 'dashboard') {
    if (dashboardView) dashboardView.classList.remove('hidden');
    window.SyncUpApp?.initFeedSubscription?.();
    window.SyncUpApp?.initChatSubscription?.();
  }
}

export function switchTab(destination) {
  if (destination === 'create') {
    openSheet('sheet-create-post');
    return;
  }

  let target = destination;
  if (destination === 'feed') target = 'home';
  if (destination === 'chat') {
    target = 'inbox';
    setUi({ inboxTab: 'chats' });
  }
  if (destination === 'uploads') {
    target = 'inbox';
    setUi({ inboxTab: 'applications' });
  }

  setUi({ currentTab: target });

  const allDestinations = ['home', 'explore', 'inbox', 'profile'];
  allDestinations.forEach(d => {
    const sub = document.getElementById('subview-' + d);
    if (sub) sub.classList.add('hidden');
    const nav = document.getElementById('nav-' + d);
    if (nav) nav.classList.remove('active');
    const mobNav = document.getElementById('mob-nav-' + d);
    if (mobNav) mobNav.classList.remove('active');
  });

  const activeSub = document.getElementById('subview-' + target);
  if (activeSub) activeSub.classList.remove('hidden');

  const navItem = document.getElementById('nav-' + target);
  if (navItem) navItem.classList.add('active');

  const mobNavItem = document.getElementById('mob-nav-' + target);
  if (mobNavItem) mobNavItem.classList.add('active');

  if (target === 'inbox') {
    window.SyncUpApp?.initChatSubscription?.();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function toggleMobileSidebar(open) {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  if (open) {
    sidebar.classList.add('mobile-open');
    overlay.style.display = 'block';
  } else {
    sidebar.classList.remove('mobile-open');
    overlay.style.display = 'none';
  }
}
