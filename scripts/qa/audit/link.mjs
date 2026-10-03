// AUDIT 3 · link e risorse: URL esterni (HEAD→GET), 8 percorsi byte per byte, rotte interne, risorse del bundle, WhatsApp, noopener.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { lancia, pagina, vai, base, Registro } from './_lib.mjs'
const R = new Registro('link')
const ATTESI = {
  'ven-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.3854186,2.1806806&destination=41.386162,2.1786073&travelmode=walking&waypoints=41.388123,2.1860152|41.3838871,2.1820711|41.3850135,2.1810493|41.383302,2.1764228|41.383452,2.1750541|41.3819198,2.1753751',
  'ven-pomeriggio': 'https://www.google.com/maps/dir/?api=1&origin=41.386162,2.1786073&destination=41.3915035,2.1715182&travelmode=walking&waypoints=41.395437,2.179608|41.4054703,2.1759774',
  'ven-cena': 'https://www.google.com/maps/dir/?api=1&origin=41.3915035,2.1715182&destination=41.3925995,2.1344166&travelmode=transit',
  'sab-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.4066347,2.1799385&travelmode=walking&waypoints=41.4039406,2.1751597',
  'sab-sera': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.3744026,2.1695739&travelmode=walking&waypoints=41.3791891,2.1770567',
  'dom-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.4169774,2.1589342&travelmode=transit',
  'dom-pomeriggio': 'https://www.google.com/maps/dir/?api=1&origin=41.4169774,2.1589342&destination=41.4193003,2.1618259&travelmode=walking',
  'dom-rientro': 'https://www.google.com/maps/dir/?api=1&origin=41.4193003,2.1618259&destination=41.3033401,2.076845&travelmode=transit'
}
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
for (const pc of it.days.flatMap((d) => d.percorsi || [])) { if (ATTESI[pc.id] !== pc.url) R.problema('ALTA', `percorso ${pc.id}: link diverso da quello verificato`, { dove: 'data/itinerary.json', nota: pc.url.slice(0, 120) }); else R.ok(`percorso ${pc.id} identico al verificato`) }
// ---- URL esterni da dati, sorgenti e bundle ----
const testi = []
const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) { if (!/node_modules|\.git|_legacy|audit/.test(f)) walk(f) } else if (/\.(js|json|html|css)$/.test(n)) testi.push([f, readFileSync(f, 'utf8')]) } }
for (const d of ['data', 'src', 'dist']) walk(d); testi.push(['index.html', readFileSync('index.html', 'utf8')])
const urls = new Map()
for (const [f, t] of testi) for (const m of t.matchAll(/https?:\/\/[^\s"'<>)\\`]+/g)) { let u = m[0].replace(/[.,;:]+$/, ''); if (/%SITE_URL%|localhost|127\.0\.0\.1|example\.|w3\.org|schema\.org|\$\{|googleapis\.com\/css|unpkg|jsdelivr|cdnjs|github\.io\/barcellona-40|wa\.me\/\?text=/.test(u)) continue; if (/dist\/_legacy|rigori-classic/.test(f)) continue; if (!urls.has(u)) urls.set(u, f) }
const esito = {}
const prova = async (u) => { for (const metodo of ['HEAD', 'GET']) { try { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000); const r = await fetch(u, { method: metodo, redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (audit barcelona40)' } }); clearTimeout(t); if (metodo === 'HEAD' && (r.status === 405 || r.status === 403 || r.status === 404)) continue; return { status: r.status, metodo } } catch (e) { if (metodo === 'GET') return { errore: String(e.cause?.code || e.message).slice(0, 60) } } } }
let n = 0
for (const [u, f] of urls) { n++; const r = await prova(u); esito[u] = r; const ok = r.status && r.status < 400; const grav = /google\.com\/maps|m\.uber|photos\.app|open-meteo|goatcounter|commons\.wikimedia/.test(u) ? (ok ? null : 'ALTA') : (ok ? null : 'BASSA'); if (ok) R.ok(`${r.status} ${u.slice(0, 90)}`); else if (r.status === 429) R.problema('BASSA', `429 (limite di richieste dell'ambiente) ${u.slice(0, 90)}`, { dove: f, nota: 'non è un difetto del sito' }); else R.problema(grav || 'BASSA', `${r.status || r.errore} ${u.slice(0, 100)}`, { dove: f, nota: 'da riprovare dal telefono: il proxy di QA può bloccare' }) }
R.numero('url esterni provati', n)
// ---- bundle: ogni risorsa referenziata risponde ----
const b = await lancia()
const { p, ctx, rete } = await pagina(b)
const rotte = ['#/oggi', '#/programma/ven', '#/programma/sab', '#/programma/dom', '#/mappa', '#/missioni', '#/info', '#/info/viaggio', '#/coro', '#/speedrun']
for (const h of rotte) { const { p: q, ctx: c, erroriVeri } = await pagina(b, { person: h === '#/speedrun' ? 'monne' : 'ale' }); await vai(q, h); const e = erroriVeri(); if (e.length) R.problema('ALTA', `rotta ${h}: errori`, { nota: e.join(' | ').slice(0, 200) }); else R.ok(`rotta ${h} senza errori`); await c.close() }
for (const h of ['rigori/', 'stats-dtcmbsis.html', 'canzone.html?now=2026-10-10T10:00']) { const { p: q, ctx: c, erroriVeri } = await pagina(b); await q.goto(base + '/' + h, { waitUntil: 'load' }).catch(() => {}); await q.waitForTimeout(1500); const e = erroriVeri(); if (e.length) R.problema('ALTA', `pagina ${h}: errori`, { nota: e.join(' | ').slice(0, 200) }); else R.ok(`pagina ${h} senza errori`); await c.close() }
// risorse 404 dal bundle: tutte le viste caricate, poi la lista delle risposte ≥ 400 verso il preview
for (const h of rotte) await vai(p, h)
const r404 = rete.filter((r) => r.status && r.url.startsWith(base))
if (r404.length) R.problema('ALTA', `${r404.length} risorse del bundle rispondono ${[...new Set(r404.map((r) => r.status))].join('/')}`, { nota: r404.slice(0, 5).map((r) => r.url.replace(base, '')).join(' · ') }); else R.ok('nessuna risorsa del bundle risponde 404')
// file in dist non referenziati non li contiamo; quelli referenziati nei .html sì
const dist = readdirSync('dist/assets'); R.numero('file in dist/assets', dist.length)
// ---- WhatsApp e noopener ----
let wa = 0
for (const [h, person] of [['#/oggi?now=2026-10-16T10:00', 'ale'], ['#/info', 'ale'], ['#/info', 'monne']]) {
  const { p: q, ctx: c } = await pagina(b, { person }); await vai(q, h)
  await q.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
  const link = await q.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), testo: a.textContent.trim().slice(0, 40) })))
  for (const l of link) {
    if (/^https:\/\/wa\.me\/\?text=/.test(l.href)) { wa++; const t = decodeURIComponent(l.href.split('text=')[1]); if (t.length > 2000) R.problema('MEDIA', `testo WhatsApp di ${t.length} caratteri (>2000)`, { dove: h + ' · ' + l.testo }); if (/[�]|Ã/.test(t)) R.problema('ALTA', 'testo WhatsApp con accenti rotti', { dove: h + ' · ' + l.testo, nota: t.slice(0, 80) }); if (!/https:\/\/alessandrovizzini1986-a11y\.github\.io\/barcellona-40\//.test(t) && /sito|album|aggiornamento|inno/i.test(l.testo)) R.problema('MEDIA', 'testo WhatsApp senza l\'URL del sito', { dove: h + ' · ' + l.testo, nota: t.slice(0, 80) }) }
    if (l.target === '_blank' && !/noopener/.test(l.rel || '')) R.problema('BASSA', `link _blank senza rel="noopener": ${l.href.slice(0, 60)}`, { dove: h })
  }
  await c.close()
}
R.numero('link WhatsApp controllati', wa)
await b.close(); R.salva()
