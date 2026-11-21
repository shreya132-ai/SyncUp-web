/**
 * src/utils/router.js
 * 
 * Hash-based Single Page Application Router
 * Routes supported:
 * - #/home          -> Home feed
 * - #/explore       -> Explore projects & skills
 * - #/inbox         -> Unified Inbox (chats & applications)
 * - #/profile       -> Active user profile & settings
 * - #/profile/:uid  -> Public author developer profile
 * - #/post/:id      -> Deep link to a specific project card
 */

let isRouting = false;
let pendingDeepLink = null;

export function initRouter(onRouteChanged) {
  if (typeof window === 'undefined') return;

  const handleHashChange = () => {
    const hash = window.location.hash || '#/home';
    parseRoute(hash, onRouteChanged);
  };

  window.addEventListener('hashchange', handleHashChange);
  
  // Initial route on load
  const initialHash = window.location.hash;
  if (initialHash && initialHash !== '#/home') {
    pendingDeepLink = initialHash;
  }
}

export function parseRoute(hash, callback) {
  if (!hash || hash === '#' || hash === '#/') {
    hash = '#/home';
  }

  const cleanHash = hash.replace(/^#\/?/, '');
  const parts = cleanHash.split('/').filter(Boolean);
  const primary = parts[0] || 'home';
  const param = parts[1] || null;

  if (callback) {
    callback({
      route: primary,
      param: param,
      rawHash: hash
    });
  }
}

export function navigateTo(hash) {
  if (typeof window === 'undefined') return;
  if (!hash.startsWith('#')) hash = '#' + hash;
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function getPendingDeepLink() {
  const link = pendingDeepLink;
  pendingDeepLink = null;
  return link;
}
