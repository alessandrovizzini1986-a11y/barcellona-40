/* Palestra · service worker — app shell in cache, offline-first.
   Alza CACHE a ogni release per far arrivare gli aggiornamenti. */
const CACHE = 'gym-v8';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'ale.jpg', 'og-palestra.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* rete prima per l'HTML (aggiornamenti veloci), cache come rete di sicurezza;
   cache-first per il resto della shell */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  const isStorico = e.request.url.includes('storico.json');   // dati pubblicati: sempre freschi
  if (isHTML || isStorico) {
    e.respondWith(fetch(e.request)
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)
      .then(x => { const cp = x.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return x; })));
  }
});
