const CACHE_NAME = 'fur9an-cache-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/style.css',
  '/variables.css',
  '/manifest.json',
  '/cordova-bridge.js',
  '/settings.js',
  '/praytime.js',
  '/global-audio.js',
  
  '/data/images/logo.png',
  '/data/images/6.svg',
  '/data/images/ayah_frame_brown.svg',
  '/data/images/ayah_frame_brown1.svg',
  '/data/images/page_frame_box_brown.svg',
  '/data/images/surah_frame_brown.svg',
  
  '/audio/adhan_makkah.mp3',
  '/audio/adhan_yasser.mp3',
  '/audio/adhan_qatami.mp3',
  '/audio/adhan_afasy.mp3',

  '/data/font/Amiri-Regular.ttf',
  '/data/font/Cairo-Regular.ttf',
  '/data/font/aalmaghrabi.ttf',
  '/data/font/HAFS_Regular.otf',
  '/data/font/DecoType_Thuluth_Regular.ttf',

  '/quran/index.html',
  '/quran/main.js',
  '/quran/style.css',
  '/quran/page.html',
  '/quran/page.js',
  '/quran/page.css',
  
  '/adkar/index.html',
  '/adkar/main.js',
  '/adkar/style.css',
  
  '/sunah/index.html',
  '/sunah/main.js',
  '/sunah/style.css',
  '/sunah/hadiths.css',
  
  '/prayer/index.html',
  '/prayer/main.js',
  '/prayer/style.css',

  '/recitations/index.html',
  '/recitations/main.js',
  '/recitations/style.css',

  '/stories/index.html',
  '/stories/main.js',
  '/stories/style.css',

  '/tasbeeh/index.html',
  '/tasbeeh/main.js',
  '/tasbeeh/style.css',

  '/settings/index.html',
  '/settings/main.js',
  '/settings/style.css',

  '/data/json/azkar.json',
  '/data/json/stories.json'
];

// تثبيت الأصول الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets for instant offline navigation');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => {
      console.warn('[Service Worker] Partial pre-cache warning:', err);
    }).then(() => self.skipWaiting())
  );
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية Stale-While-Revalidate فائقة السرعة للأصول المحلية والتنقل الفوري
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  const isLocalAsset = url.origin === self.location.origin;

  // 1. الأصول المحلية وصفحات التطبيق: استجابة فورية فائقة السرعة (Stale-While-Revalidate)
  if (isLocalAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // إذا كان الملف موجوداً بالكاش يتم إرجاعه فوراً (0ms) مع تحديثه بالخلفية
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. طلبات الحديث والتفسير والخطوط الخارجية (Cache-First مع كاش محلي أوفلاين)
  if (
    url.hostname.includes('hadith-api') ||
    url.hostname.includes('api.quran.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  // 3. باقي الطلبات الخارجية العادية
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
