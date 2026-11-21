/**
 * sw.js
 * 
 * SyncUp PWA Service Worker
 * Caches static application shell only for instant loading & offline capability.
 * Explicitly ignores and NEVER caches Firestore / Firebase real-time data responses.
 */

const CACHE_NAME = 'syncup-shell-v2';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/tokens.css',
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './src/main.js',
  './src/store/store.js',
  './src/services/firebase.js',
  './src/services/authService.js',
  './src/services/postsService.js',
  './src/services/chatService.js',
  './src/services/storageService.js',
  './src/services/notificationsService.js',
  './src/ui/nav.js',
  './src/ui/feed.js',
  './src/ui/postCard.js',
  './src/ui/inbox.js',
  './src/ui/explore.js',
  './src/ui/profile.js',
  './src/ui/modals.js',
  './src/ui/sheet.js',
  './src/ui/toast.js',
  './src/ui/auth.js',
  './src/ui/onboarding.js',
  './src/utils/dom.js',
  './src/utils/icons.js',
  './src/utils/router.js',
  './src/utils/wordCount.js',
  './src/utils/imageCompress.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll notice:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache any Firestore, Auth, Firebase APIs, WebSockets, or Cloud Storage
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.includes('/v1/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Cache-first strategy for local static shell assets with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background for next visit (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
