/* Soldi · service worker — app shell in cache, funziona offline.
   Alza VERSION a ogni release: il nuovo SW si installa in silenzio e alla
   prossima apertura la cache vecchia sparisce. */
const VERSION = 'soldi-v5';
const SHELL = ['./', 'index.html', 'manifest.json', 'seed.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k.startsWith('soldi-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isSeed = url.pathname.endsWith('seed.json');
  if (isHTML || isSeed) {
    // rete prima (aggiornamenti subito), cache come rete di sicurezza
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // font e icone: cache prima, poi rete (e salva)
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(x => { if (x.ok || x.type === 'opaque') { const cp = x.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return x; }).catch(() => new Response('', {status: 504}))));
});
