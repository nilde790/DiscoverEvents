// Service worker di DiscoverEvent: rende l'app installabile e, senza rete, mostra una pagina di cortesia.
// Volutamente minimo: non mette in cache né le API (dati e sessione sempre freschi) né le pagine
// (dopo un deploy arriva subito la versione nuova). I file in /assets/ li tiene già la cache del browser.
// Cambiare questo nome quando cambia offline.html: è ciò che fa scaricare la versione nuova ai browser.
const CACHE = 'discoverevent-offline-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Cancella le cache di versioni precedenti del service worker.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Solo l'apertura di una pagina: se la rete non risponde, la pagina offline.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
