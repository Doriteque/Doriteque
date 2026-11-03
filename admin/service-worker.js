// admin/service-worker.js
// Siempre intenta traer la versión más nueva desde internet.
// Solo usa la copia guardada si no hay conexión. Así nunca te quedas con código viejo.
const CACHE_NAME = 'doriteque-admin-v4';

self.addEventListener('install', () => {
  self.skipWaiting(); // activar la versión nueva de inmediato
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
    .then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
    .then(() => self.clients.claim()) // tomar control de las pestañas abiertas
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Solo archivos de este mismo sitio y solo GET. Firebase y demás van directo a la red.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  
  event.respondWith(
    // 'no-cache' obliga al navegador a revisar si hay versión nueva (ignora el caché de 10 min de GitHub Pages)
    fetch(new Request(req.url, { cache: 'no-cache' }))
    .then(res => {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copia));
      }
      return res;
    })
    .catch(() => caches.match(req))
  );
});