// Service Worker — offline app shell per la guida Barcellona 40.
// Strategia: precache della shell, poi stale-while-revalidate.
// I dati dinamici (meteo, tile mappa) NON vengono cachati: restano live e fail-soft.

const CACHE = 'bcn40-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // allSettled: una risorsa CDN irraggiungibile non deve far fallire l'install
    await Promise.allSettled(SHELL.map((u) => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dinamici: meteo e tile mappa → solo rete, fallback cache se per caso c'è.
  const dynamic = url.hostname === 'api.open-meteo.com' || url.hostname.endsWith('basemaps.cartocdn.com');
  if (dynamic) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Resto: stale-while-revalidate con fallback offline alla home.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => null);

    if (cached) return cached;
    const net = await network;
    if (net) return net;
    if (req.mode === 'navigate') return caches.match('./index.html');
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
