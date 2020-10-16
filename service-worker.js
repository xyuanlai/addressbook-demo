// var cacheName = 'addressbookPWA--1';
var filesToCache = [
    '/',
    '/index.html',
    '/scripts/app.js',
    '/scripts/vue.js',
    '/styles/inline.css',
    '/images/logo.png'
];

// self.addEventListener('install', function(e) {
//   console.log('[ServiceWorker] Install');
//   e.waitUntil(
//     caches.open(cacheName).then(function(cache) {
//       console.log('[ServiceWorker] Caching app shell');
//       return cache.addAll(filesToCache);
//     })
//   );
// });

// self.addEventListener('activate', function(e) {
//   console.log('[ServiceWorker] Activate');
//   e.waitUntil(
//     caches.keys().then(function(keyList) {
//       return Promise.all(keyList.map(function(key) {
//         if (key !== cacheName) {
//           console.log('[ServiceWorker] Removing old cache', key);
//           return caches.delete(key);
//         }
//       }));
//     })
//   );
//   return self.clients.claim();
// });

// self.addEventListener('fetch', function(e) {
//   e.respondWith(
//     caches.match(e.request)
//       .then(function(response) {
//         return response || fetch(e.request);
//       })
//   );
// });

importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.6.1/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

workbox.precaching.precacheAndRoute(filesToCache);

workbox.routing.registerRoute(
  new RegExp('.*\.js'),
  workbox.strategies.networkFirst()
);

workbox.routing.registerRoute(
  /.*\.css/,
  workbox.strategies.staleWhileRevalidate({
    cacheName: 'css-cache',
  })
);

workbox.routing.registerRoute(
  /.*\.(?:png|jpg|jpeg|svg|gif)/,
  workbox.strategies.cacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 20,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      })
    ],
  })
);