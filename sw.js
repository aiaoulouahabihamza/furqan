// sw.js - Service Worker for Al-Furqan PWA
const CACHE_NAME = 'furqan-pwa-cache-v1';

// Core assets to cache on install
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/variables.css',
  '/main.js',
  '/settings.js',
  '/praytime.js',
  '/global-audio.js',
  '/android-bridge.js',
  '/manifest.json',
  '/quran/index.html',
  '/quran/style.css',
  '/quran/main.js',
  '/quran/page.html',
  '/quran/page.css',
  '/quran/page.js',
  '/sunah/index.html',
  '/sunah/style.css',
  '/sunah/main.js',
  '/recitations/index.html',
  '/recitations/style.css',
  '/recitations/main.js',
  '/prayer/index.html',
  '/prayer/style.css',
  '/prayer/main.js',
  '/adhkar/index.html',
  '/adhkar/style.css',
  '/adhkar/main.js',
  '/settings/index.html'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets...');
      return cache.addAll(PRE_CACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache...', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate caching strategy
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or browser extension requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback or offline behavior if network fails
        console.log('[Service Worker] Network request failed, returning cache if available.');
      });

      return cachedResponse || fetchPromise;
    })
  );
});
