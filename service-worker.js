/* ============================================================
   CLINIC OPD PWA — SERVICE WORKER
   Caches the app shell for offline use.
   NOTE: Live data (dashboard, search, save) always requires the
   internet since it talks to Google Apps Script / Google Sheets.
   Only the app's UI (HTML/CSS/JS/icons) is cached for offline access.
   ============================================================ */

const CACHE_NAME = 'clinic-opd-cache-v1';

// App shell files to pre-cache on install
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ----------------------------------------------------------------------------
// INSTALL — pre-cache the app shell
// ----------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------------------------
// ACTIVATE — clean up old caches
// ----------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------------------
// FETCH — cache-first for app shell, network-only for API calls
// ----------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Google Apps Script API calls — always go to network.
  // These are POST requests (save/search/etc.) or calls to script.google.com.
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    return; // let the browser handle it normally (no caching)
  }

  // For navigation and app-shell GET requests: cache-first, fallback to network.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful same-origin GET responses for future offline use
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            url.origin === self.location.origin
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached — fallback to index.html for navigations
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
