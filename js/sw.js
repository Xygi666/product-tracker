const CACHE_NAME = 'product-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './settings.html',
  './quick-add.html',
  './css/style.css',
  './css/themes.css',
  './js/app.js',
  './js/settings.js',
  './js/storage.js',
  './js/export.js',
  './js/search.js',
  './js/themes.js',
  './js/quick-add.js',
  './icons/android-launcher-icon-192.png',
  './icons/android-launcher-icon-512.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
