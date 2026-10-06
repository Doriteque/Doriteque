const CACHE_NAME = 'doriteque-admin-v1';
const urlsToCache = [
  './',
  '../',
  'index.html',
  '../index.html',
  '../css/style.css',
  '../css/checkout.css',
  'admin.css',
  '../js/firebase.js',
  '../js/db.js',
  'admin.js',
  '../assets/logo.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Archivos cacheados');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});