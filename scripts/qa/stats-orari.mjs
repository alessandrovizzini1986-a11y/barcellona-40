// QA della sezione "Quando entrano" della pagina privata delle statistiche (src/stats-orari.js).
// GoatCounter è finta: /counter/ risponde zeri, /api/v0/stats/hits risponde con una fixture oraria
// (o 401 con corpo HTML se il token non è quello accettato). Il token di default sta nel repo (decisione di
// Alessandro del 07/10): si controlla che la pagina lo usi senza chiedere niente, che un 401 mostri il campo,
// che un token salvato dal telefono abbia la precedenza; una sola richiesta per cambio periodo; heatmap a 380 px senza
// scorrimento della pagina e con scorrimento laterale suo; tap su cella e su riga; cache "rete assente";
// il token non finisce in nessun file della build.
//   node scripts/qa/stats-orari.mjs [url base]
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const PAGINA = 'stats-dtcmbsis.html', TOKEN = 'tok-prova-9f3a1c-NONDEVEFINIRENELLABUILD', SBAGLIATO = 'tok-sbagliato'
// il token del repo, letto dal sorgente: la suite non lo ripete
const TOKEN_REPO = readFileSync('src/stats-orari.js', 'utf8').match(/const TOKEN_REPO = '([^']+)'/)[1]
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const pad = (x) => String(x).padStart(2, '0'), iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const oggi = new Date(), ieri = new Date(); ieri.setDate(ieri.getDate() - 1)
const G0 = iso(oggi), G1 = iso(ieri)
// fixture: Alessandro apre Oggi ieri alle 22 (3) e oggi alle 9 (2); Giulio apre Programma oggi alle 18 (4); un evento di Giulio oggi alle 18 (1)
const ora = (o, v) => { const a = new Array(24).fill(0); a[o] = v; return a }
const HITS = [
  { path_id: 1, path: '/alessandro/oggi', event: false, count: 5, count_unique: 2, stats: [{ day: G1, hourly: ora(22, 3) }, { day: G0, hourly: ora(9, 2) }] },
  { path_id: 2, path: '/giulio/programma', event: false, count: 4, count_unique: 1, stats: [{ day: G0, hourly: ora(18, 4) }] },
  { path_id: 3, path: 'giulio/album-apri', event: true, count: 1, count_unique: 1, stats: [{ day: G0, hourly: ora(18, 1) }] },
  { path_id: 4, path: 'maps-tappa/f8', event: true, count: 2, count_unique: 2, stats: [{ day: G1, hourly: ora(12, 2) }] }
]
const FINTA = ({ hits, token, rompiApi }) => {
  window.__log = { api: [], auth: [] }
  window.fetch = (url, opt) => new Promise((res, rej) => setTimeout(() => {
    const u = String(url)
    if (u.includes('/api/v0/stats/hits')) {
      window.__log.api.push(u); window.__log.auth.push(opt?.headers?.Authorization || '')
      if (rompiApi) { rej(new TypeError('Failed to fetch')); return }
      if (opt?.headers?.Authorization !== 'Bearer ' + token) { res(new Response('<!DOCTYPE html><title>GoatCounter – Error!</title>', { status: 401, headers: { 'Content-Type': 'text/html' } })); return }
      const start = new URL(u).searchParams.get('start'), end = new URL(u).searchParams.get('end')
      const filtrati = hits.map((h) => ({ ...h, stats: h.stats.filter((s) => s.day >= start && s.day <= end) })).filter((h) => h.stats.length)
      res(new Response(JSON.stringify({ hits: filtrati, more: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })); return
    }
    res(new Response(JSON.stringify({ count: '0', count_unique: '0' }), { status: 404, headers: { 'Content-Type': 'application/json' } }))
  }, 15))
}
async function apri({ token = null, rompiApi = false, mem = null, accetta = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 900 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(({ token, mem }) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); sessionStorage.removeItem('b40:stats:orari:v1'); if (token) localStorage.setItem('b40:v1:gc-token', token); if (mem) sessionStorage.setItem('b40:stats:orari:v1', mem) } catch {} }, { token, mem })
  await p.addInitScript(FINTA, { hits: HITS, token: accetta || token || TOKEN_REPO, rompiApi })
  await p.goto(`${base}/${PAGINA}`, { waitUntil: 'load' }); await p.waitForSelector('.s-foot', { timeout: 20000 }); await p.waitForTimeout(400)
  return { p, ctx, errs }
}
const api = (p) => p.evaluate(() => window.__log.api.length)

// 1. niente in localStorage: la pagina usa il token del repo, senza chiedere niente
{
  const { p, ctx, errs } = await apri({ accetta: TOKEN_REPO })
  ok('senza token salvato: nessun campo, la pagina chiama l\'API con il token del repo', (await p.locator('#gc-token').count()) === 0 && (await api(p)) === 1 && (await p.evaluate(() => window.__log.auth[0])) === 'Bearer ' + TOKEN_REPO && (await p.locator('.kpi__t').count()) === 3)
  ok('la pagina non carica lo script di GoatCounter (non si traccia da sola)', (await p.locator('script[src*="gc.zgo.at"], script[data-goatcounter]').count()) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 1b. token del repo rifiutato (revocato): campo con messaggio; un token nuovo si salva e ha la precedenza
{
  const { p, ctx, errs } = await apri({ accetta: TOKEN })
  ok('token del repo rifiutato: "Token non valido … (revocato?)", campo per inserirne uno, nessun crash', /Token non valido: GoatCounter rifiuta quello del repo \(revocato\?\)/.test(await p.locator('#orari').innerText()) && (await p.locator('#gc-token[type="password"]').count()) === 1 && /Settings → API tokens → permesso 'Read statistics'\. Resta solo su questo telefono\./.test(await p.locator('.tok__hint').innerText()) && errs.length === 0, errs.join(' | '))
  await p.fill('#gc-token', SBAGLIATO); await p.click('#orari button[type="submit"]'); await p.waitForTimeout(600)
  ok('token errato: "Token non valido", campo di nuovo, e viene scartato dal telefono', /Token non valido: GoatCounter lo rifiuta\. Reinseriscilo\./.test(await p.locator('#orari').innerText()) && (await p.locator('#gc-token').count()) === 1 && (await p.evaluate(() => localStorage.getItem('b40:v1:gc-token'))) === null)
  await p.fill('#gc-token', TOKEN); await p.click('#orari button[type="submit"]'); await p.waitForTimeout(800)
  ok('token giusto: salvato in b40:v1:gc-token, campo sparito, "Cambia token" in fondo, usato al posto di quello del repo', (await p.evaluate(() => localStorage.getItem('b40:v1:gc-token'))) === TOKEN && (await p.locator('#gc-token').count()) === 0 && (await p.locator('[data-cambia-token]').count()) === 1 && (await p.evaluate(() => window.__log.auth.at(-1))) === 'Bearer ' + TOKEN)
  ok('il token viaggia solo nell\'header Authorization, mai nell\'URL', await p.evaluate((t) => window.__log.api.every((u) => !u.includes(t[0]) && !u.includes(t[1])), [TOKEN, TOKEN_REPO]))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 2. con il token: KPI, heatmap, per pagina, chi e quando, cambio periodo
{
  const { p, ctx, errs } = await apri({ token: TOKEN })
  const sez = p.locator('#orari')
  ok('default "7 giorni", una sola richiesta', (await p.locator('.chip-p[aria-pressed="true"]').innerText()) === '7 giorni' && (await api(p)) === 1)
  const kpi = await p.locator('.kpi__t').allInnerTexts()
  ok('KPI: Visite 9 (solo viste, non eventi), Visitatori unici 3, Ultimo accesso "~oggi 18:00"', kpi.length === 3 && /^9\s+Visite/i.test(kpi[0]) && /^3\s+Visitatori unici/i.test(kpi[1]) && /~oggi 18:00\s+Ultimo accesso/i.test(kpi[2]), kpi.join(' / '))
  ok('heatmap: 7 righe (una per giorno, la più recente in alto = oggi) × 24 colonne, etichette ore a 0 · 6 · 12 · 18', (await p.locator('[data-hm="tutto"] .hm__lab').count()) === 7 && (await p.locator('[data-hm="tutto"] .hm__lab').first().innerText()) === 'oggi' && (await p.locator('[data-hm="tutto"] .hm__c:not(.hm__c--leg)').count()) === 168 && (await p.locator('[data-hm="tutto"] .hm__ora').allInnerTexts()).filter(Boolean).join(',') === '0,6,12,18')
  const celle = await p.evaluate(() => [...document.querySelectorAll('[data-hm="tutto"] .hm__c:not(.hm__c--leg)')].filter((c) => Number(c.dataset.v) > 0).map((c) => [c.dataset.g, c.dataset.o, c.dataset.v, c.style.getPropertyValue('--p')]))
  ok('heatmap: le celle piene sono ieri 12 (2), ieri 22 (3), oggi 9 (2), oggi 18 (5 = 4 + 1 evento), colore proporzionale al massimo', JSON.stringify(celle.map((c) => c.slice(1, 3))) === JSON.stringify([['9', '2'], ['18', '5'], ['12', '2'], ['22', '3']]) && celle.find((c) => c[2] === '5')[3] === '100' && celle.find((c) => c[2] === '3')[3] === '60', JSON.stringify(celle))
  const mis = await p.evaluate(() => { const c = document.querySelector('[data-hm="tutto"] .hm__c'); const s = document.querySelector('[data-hm="tutto"] .hm__scroll'); return { lato: c.getBoundingClientRect().width, pagina: document.documentElement.scrollWidth, scrollInterno: s.scrollWidth > s.clientWidth } })
  ok('a 380 px: celle da 12 px, nessuno scorrimento orizzontale della pagina, la heatmap scorre da sola', mis.lato >= 12 && mis.pagina <= 380 && mis.scrollInterno, JSON.stringify(mis))
  ok('legenda a 4 gradini', (await p.locator('[data-hm="tutto"] .hm__leg .hm__c--leg').count()) === 4)
  await p.locator('[data-hm="tutto"] .hm__c[data-o="18"][data-v="5"]').tap()
  ok('tap su una cella: "oggi, 18:00–19:00 · 5 visite"', (await p.locator('[data-hm="tutto"] [data-tip]').innerText()) === 'oggi, 18:00–19:00 · 5 visite', await p.locator('[data-hm="tutto"] [data-tip]').innerText())
  const righe = await p.locator('.pp').allInnerTexts()
  ok('per pagina: righe in ordine decrescente con etichette leggibili e sparkline', righe.length === 4 && /^Oggi · Alessandro\s+5/.test(righe[0]) && /^Programma · Giulio\s+4/.test(righe[1]) && /^Maps · Mercat de Santa Caterina\s+2/.test(righe[2]) && /^album-apri · Giulio\s+1/.test(righe[3]) && (await p.locator('.pp .sp i').count()) === 96, righe.join(' / '))
  await p.locator('.pp').first().tap(); await p.waitForTimeout(200)
  const filtr = await p.evaluate(() => [...document.querySelectorAll('.pp__hm:not([hidden]) .hm__c:not(.hm__c--leg)')].filter((c) => Number(c.dataset.v) > 0).map((c) => c.dataset.g + ' ' + c.dataset.o + ' ' + c.dataset.v))
  ok('tap su una riga: si apre la heatmap filtrata su quel percorso (ieri 22 · 3, oggi 9 · 2)', (await p.locator('.pp').first().getAttribute('aria-expanded')) === 'true' && filtr.length === 2 && filtr.some((x) => x.endsWith(' 9 2')) && filtr.some((x) => x.endsWith(' 22 3')), filtr.join(' / '))
  const ep = await p.locator('.ep li').allInnerTexts()
  ok('chi e quando: Giulio ultima volta ~oggi 18:00 · 4 aperture · 1 tocco; Alessandro ~oggi 09:00 · 5 aperture', ep.length === 2 && /Giulio\s+ultima volta ~oggi 18:00 · 4 aperture · 1 tocco/.test(ep[0]) && /Alessandro\s+ultima volta ~oggi 09:00 · 5 aperture/.test(ep[1]), ep.join(' / '))
  ok('nota: aggiornato alle HH:MM, ore nel fuso di GoatCounter', /Aggiornato alle \d{2}:\d{2}.*ore nel fuso di GoatCounter/.test(await p.locator('.orari__nota').innerText()))
  // cambio periodo: una richiesta sola, start/end giusti, heatmap di un giorno
  await p.locator('.chip-p[data-periodo="oggi"]').tap(); await p.waitForTimeout(600)
  const ultimaUrl = await p.evaluate(() => window.__log.api.at(-1))
  ok('"Oggi": una richiesta in più con start = end = oggi, daily=false', (await api(p)) === 2 && ultimaUrl.includes(`start=${G0}`) && ultimaUrl.includes(`end=${G0}`) && ultimaUrl.includes('daily=false'), ultimaUrl)
  ok('"Oggi": una riga sola, Visite 6 (2 + 4 di oggi)', (await p.locator('[data-hm="tutto"] .hm__lab').count()) === 1 && /^6\s+Visite/i.test((await p.locator('.kpi__t').allInnerTexts())[0]))
  await p.locator('.chip-p[data-periodo="7"]').tap(); await p.waitForTimeout(400)
  ok('ritorno a "7 giorni": dalla cache, nessuna richiesta nuova', (await api(p)) === 2 && (await p.locator('[data-hm="tutto"] .hm__lab').count()) === 7)
  await p.locator('.chip-p[data-periodo="lancio"]').tap(); await p.waitForTimeout(600)
  const u3 = await p.evaluate(() => window.__log.api.at(-1))
  ok('"Dal lancio": start = 2026-09-18 (prima entry del changelog)', (await api(p)) === 3 && u3.includes('start=2026-09-18'), u3)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 3. rete assente: ultimo dato in cache con "aggiornato alle"
{
  const mem = JSON.stringify({ 7: { quando: Date.now() - 20 * 60 * 1000, hits: HITS, start: iso(new Date(Date.now() - 6 * 86400000)), end: G0 } })
  const { p, ctx, errs } = await apri({ token: TOKEN, rompiApi: true, mem })
  const nota = (await p.locator('.orari__nota').count()) ? await p.locator('.orari__nota').innerText() : ''
  ok('rete assente: si mostra l\'ultimo dato in cache con "Aggiornato alle HH:MM · rete assente"', /Aggiornato alle \d{2}:\d{2} · rete assente/.test(nota) && (await p.locator('.kpi__t').count()) === 3, nota)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 4. la build: il token non c'è in nessun file; "Bearer" e "gc-token" compaiono solo come codice nel chunk stats
{
  const file = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? file(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
  const tutti = file('dist').filter((f) => /\.(js|html|css|json|txt|map)$/.test(f))
  const conToken = tutti.filter((f) => readFileSync(f, 'utf8').includes(TOKEN))
  ok('nessun file della build contiene il token di prova', conToken.length === 0, conToken.join(' '))
  const conBearer = tutti.filter((f) => /Bearer|gc-token/.test(readFileSync(f, 'utf8')))
  ok('"Bearer" e "gc-token" compaiono solo nel codice della pagina stats (nome dell\'header e chiave), in nessun altro file', conBearer.length === 1 && /stats-.*\.js$/.test(conBearer[0]), conBearer.join(' '))
  const conRepo = tutti.filter((f) => readFileSync(f, 'utf8').includes(TOKEN_REPO))
  ok('il token del repo sta solo nel chunk della pagina stats (decisione di Alessandro), non nel bundle del sito', conRepo.length === 1 && /stats-.*\.js$/.test(conRepo[0]), conRepo.join(' '))
  ok('lo script della pagina non logga il token', !/console\.(log|info|debug)\(.*token/i.test(readFileSync('src/stats-orari.js', 'utf8')))
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK stats-orari')
