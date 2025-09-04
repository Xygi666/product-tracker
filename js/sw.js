const CACHE_NAME = 'product-tracker-v3.1';
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
  './icons/android-icon-192.png',
  './icons/android-icon-512.png',
  './manifest.json'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching resources...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All resources cached');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Caching error:', err);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return from cache if found
        if (response) {
          return response;
        }

        // Otherwise make network request
        return fetch(event.request)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If offline and requesting HTML page, return index
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
