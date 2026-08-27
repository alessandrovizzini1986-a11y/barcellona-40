/* Service worker: app shell in cache, l'app funziona offline dopo la prima apertura. */
const CACHE = 'palestra-v1';
const SHELL = [
  './', './index.html', './style.css', './app.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first: in palestra la rete può non esserci, e l'app non ha dati remoti.
   La rete serve solo ad aggiornare la copia quando c'è. */
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  ev.respondWith(
    caches.match(req).then(hit => {
      const dallaRete = fetch(req).then(res => {
        if (res && res.ok){
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || dallaRete;
    })
  );
});
