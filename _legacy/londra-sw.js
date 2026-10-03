/* Service worker del viaggio a Londra: fa funzionare londra.html e londra-illustrata.html anche senza rete.
   Scope "./londra" (registrato dalle due pagine): controlla solo gli URL che iniziano con /…/londra,
   quindi le pagine di Barcellona, gym e soldi restano fuori.

   QUESTO FILE È UN MODELLO: la build (scripts/londra-sw-build.mjs) riempie versione e lista dei file
   leggendo le pagine pubblicate. Una foto o una pagina cambiata = versione nuova = cache nuova.

   Strategia:
   - pagine (navigazioni): prima la rete, con 3 secondi di pazienza; poi la copia salvata
   - foto, JS, CSS, font dello stesso sito: prima la copia salvata, poi la rete
   - tutto ciò che sta su altri domini (tile della mappa, meteo, Google Maps): solo rete, mai in cache
   Nessun dato dell'utente viene salvato: solo i file del sito. */
const VERSIONE = '__VERSIONE__'
const CACHE = 'londra-' + VERSIONE
const PRECACHE = __PRECACHE__
const ATTESA_RETE_MS = 3000

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  )
})

// Solo le cache di Londra: le altre app dello stesso dominio (gym, soldi) hanno le loro.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('londra-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => avvisaPronto())
  )
})

// Quanti file del precache mancano. Se qualcosa li ha tolti (un'altra app del dominio che svuota le
// cache), con la rete si rimettono a posto alla prima visita.
async function mancanti() {
  const c = await caches.open(CACHE)
  const assenti = []
  for (const u of PRECACHE) if (!(await c.match(u, { ignoreSearch: true }))) assenti.push(u)
  return assenti
}
async function stato() {
  let assenti = await mancanti()
  if (assenti.length) {
    try { const c = await caches.open(CACHE); await c.addAll(assenti.map((u) => new Request(u, { cache: 'reload' }))) } catch (err) { /* senza rete: resta incompleto */ }
    assenti = await mancanti()
  }
  return { tipo: 'stato', pronto: assenti.length === 0, versione: VERSIONE, file: PRECACHE.length, mancanti: assenti.length }
}
async function avvisaPronto() {
  const s = await stato()
  const tutti = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  tutti.forEach((cl) => cl.postMessage(s))
}
self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'stato') e.waitUntil(stato().then((s) => e.source && e.source.postMessage(s)))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // tile, meteo, Maps: solo rete
  if (req.mode === 'navigate') { e.respondWith(paginaPrimaLaRete(e)); return }
  e.respondWith(primaLaCache(req))
})

async function paginaPrimaLaRete(e) {
  const req = e.request
  const c = await caches.open(CACHE)
  const chiave = new URL(req.url); chiave.search = ''
  const rete = fetch(req).then((r) => {
    if (r && r.ok) c.put(chiave.href, r.clone()).catch(() => {})
    return r
  })
  const pausa = new Promise((ok) => setTimeout(() => ok(null), ATTESA_RETE_MS))
  try {
    const r = await Promise.race([rete, pausa])
    if (r) return r
  } catch (err) { /* rete assente: si passa alla copia */ }
  const salvata = await c.match(chiave.href, { ignoreSearch: true })
  if (salvata) return salvata
  try { return await rete } catch (err) {
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><p style="font:16px system-ui;padding:24px">Pagina non ancora disponibile offline: aprila una volta con la rete.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}

async function primaLaCache(req) {
  const c = await caches.open(CACHE)
  const salvata = await c.match(req, { ignoreSearch: true })
  if (salvata) return salvata
  const r = await fetch(req)
  if (r && r.ok && r.type === 'basic') c.put(req, r.clone())
  return r
}
