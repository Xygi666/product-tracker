const CACHE = 'tracker-v3.1';
const URLS = [
  './','index.html','settings.html','quick-add.html',
  'css/style.css','css/themes.css',
  'js/app.js','js/settings.js','js/storage.js',
  'js/export.js','js/search.js','js/themes.js','js/quick-add.js',
  'manifest.json','icons/android-icon-192.png','icons/android-icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k!==CACHE?caches.delete(k):null))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
