// AUDIT 10 · prestazioni: peso di ogni vista e del gioco, Lighthouse mobile (Oggi, Programma), sessione lunga di 2 ore simulate,
// scheda nascosta (rAF e rete), cache del meteo in 2 ore.
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
import { lancia, pagina, vai, base, OUT, SWIFT, Registro } from './_lib.mjs'
const R = new Registro('prestazioni')
const TOOLS = (process.env.AUDIT_TOOLS || '/tmp/claude-0/-home-user-barcellona-40/2fa60192-3bdb-5002-8999-9506e77ffd47/scratchpad/tools/package.json').replace(/package\.json$/, '')
const b = await lancia([...SWIFT, '--js-flags=--expose-gc', '--enable-precise-memory-info'])
const pesoDi = (p) => p.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const res = performance.getEntriesByType('resource'); return { kB: Math.round((res.reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0) + (nav?.transferSize || nav?.encodedBodySize || 0)) / 1024), n: res.length + 1, grossi: res.map((r) => [r.name.split('/').pop().split('?')[0], Math.round((r.transferSize || r.encodedBodySize || 0) / 1024)]).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([n, k]) => `${n} ${k} kB`).join(', ') } })
for (const [nome, h] of [['oggi-prima', '#/oggi?now=2026-10-15T10:00'], ['oggi-durante', '#/oggi?now=2026-10-17T10:00'], ['programma-ven', '#/programma/ven'], ['mappa', '#/mappa'], ['missioni', '#/missioni'], ['info', '#/info']]) {
  const { p, ctx } = await pagina(b); await p.goto(base + '/' + h, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  const w = await pesoDi(p); R.numero(`peso ${nome}`, `${w.kB} kB in ${w.n} richieste · ${w.grossi}`)
  if (w.kB > 2048) R.problema('MEDIA', `${nome} pesa ${w.kB} kB al primo caricamento`, { dove: h })
  await ctx.close()
}
{
  const { p, ctx } = await pagina(b); await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 120000 }).catch(() => {}); await p.click('.rg-loading__tap', { force: true }).catch(() => {}); await p.evaluate(() => window.__rigori.kitReady).catch(() => {}); await p.waitForTimeout(1000)
  const w = await pesoDi(p); R.numero('peso gioco (pronto al primo tiro)', `${w.kB} kB in ${w.n} richieste · ${w.grossi}`)
  await ctx.close()
}
// Lighthouse mobile
mkdirSync(OUT + '/lighthouse', { recursive: true })
for (const [nome, h] of [['oggi', '/?now=2026-10-17T10:00#/oggi'], ['programma', '/#/programma/ven']]) {
  try {
    const out = `${OUT}/lighthouse/${nome}.json`
    execFileSync('node', [TOOLS + 'node_modules/lighthouse/cli/index.js', base + h, '--only-categories=performance', '--form-factor=mobile', '--screenEmulation.mobile', '--throttling-method=simulate', '--chrome-flags=--headless=new --no-sandbox --ignore-certificate-errors', '--output=json', '--output-path=' + out, '--quiet'], { env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }, stdio: 'pipe', timeout: 240000 })
    const j = JSON.parse(readFileSync(out, 'utf8')); const a = j.audits
    const s = { performance: Math.round(j.categories.performance.score * 100), LCP: a['largest-contentful-paint'].displayValue, CLS: a['cumulative-layout-shift'].displayValue, TBT: a['total-blocking-time'].displayValue, FCP: a['first-contentful-paint'].displayValue }
    R.numero(`Lighthouse ${nome}`, s)
    if (s.performance < 70) R.problema('MEDIA', `Lighthouse ${nome}: performance ${s.performance}`, { nota: JSON.stringify(s) })
    if (parseFloat(a['cumulative-layout-shift'].numericValue) > 0.1) R.problema('MEDIA', `Lighthouse ${nome}: CLS ${s.CLS}`, { nota: 'salti di layout: foto senza dimensioni o font' })
  } catch (e) { R.problema('BASSA', `Lighthouse ${nome} non eseguibile qui`, { nota: String(e.message).split('\n')[0].slice(0, 160) }) }
}
// sessione lunga: 2 ore simulate su Oggi
{
  const { p, ctx, errs } = await pagina(b, { init: () => { const T = window.__t = { interval: new Set(), timeout: 0, raf: 0 }; const si = window.setInterval, ci = window.clearInterval, st = window.setTimeout, raf = window.requestAnimationFrame; window.setInterval = function (...a) { const id = si(...a); T.interval.add(id); return id }; window.clearInterval = function (id) { T.interval.delete(id); return ci(id) }; window.setTimeout = function (...a) { T.timeout++; return st(...a) }; window.requestAnimationFrame = function (fn) { T.raf++; return raf(fn) } } })
  await p.clock.install({ time: new Date('2026-10-17T10:00:00') })
  await p.goto(base + '/#/oggi', { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  const m0 = await p.evaluate(async () => { window.gc?.(); await new Promise((r) => setTimeout(r, 200)); return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), interval: window.__t.interval.size, timeout: window.__t.timeout, raf: window.__t.raf } })
  for (let i = 0; i < 24; i++) await p.clock.runFor(5 * 60 * 1000)
  const m1 = await p.evaluate(async () => { window.gc?.(); await new Promise((r) => setTimeout(r, 200)); return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), interval: window.__t.interval.size, timeout: window.__t.timeout, raf: window.__t.raf, adesso: document.querySelector('.tile--accent .card')?.dataset.stop, ora: document.querySelector('.tile--accent .card__time--adesso')?.textContent } })
  R.numero('sessione lunga 2 h su Oggi: prima → dopo', `${JSON.stringify(m0)} → ${JSON.stringify(m1)}`)
  if (m1.interval > m0.interval) R.problema('ALTA', `in 2 ore gli intervalli attivi passano da ${m0.interval} a ${m1.interval}`, { dove: 'src/views/oggi.js' })
  if (m1.heapMB > m0.heapMB * 1.3) R.problema('MEDIA', `in 2 ore l'heap cresce da ${m0.heapMB} a ${m1.heapMB} MB`, { dove: 'src/views/oggi.js' })
  R.problema('MEDIA', 'Oggi non si ridisegna da solo: dopo 2 ore "Adesso" e "Prossima" sono ancora quelli dell\'apertura', { dove: 'src/views/oggi.js (solo il countdown si aggiorna ogni 30 s; durante il weekend nessun timer)', riproduzione: 'lascia Oggi aperto dalle 10:00 alle 12:00 senza toccare', costo: 'piccolo: un setInterval che ridisegna ogni minuto o al cambio di tappa', rischio: 'basso', nota: `dopo 2 h: Adesso ${m1.adesso} "${m1.ora}"` })
  if (errs.length) R.problema('ALTA', 'sessione lunga: errori', { nota: errs.join(' | ').slice(0, 160) })
  await ctx.close()
}
// scheda nascosta: rAF e rete
{
  const { p, ctx } = await pagina(b, { init: () => { window.__raf = 0; const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (fn) { window.__raf++; return raf(fn) } } })
  await vai(p, '#/oggi?now=2026-10-17T10:00')
  const richieste = []; p.on('request', (r) => richieste.push(r.url()))
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.__raf = 0 })
  await p.waitForTimeout(10000)
  const raf = await p.evaluate(() => window.__raf)
  R.numero('scheda nascosta 10 s (sito)', `${raf} requestAnimationFrame · ${richieste.length} richieste di rete`)
  if (raf > 5) R.problema('MEDIA', `sito in background: ${raf} rAF in 10 s`, { dove: 'src' })
  if (richieste.filter((u) => !/goatcounter|zgo/.test(u)).length) R.problema('MEDIA', 'sito in background: richieste di rete ripetute', { nota: richieste.slice(0, 3).join(' | ') })
  await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 120000 }).catch(() => {}); await p.click('.rg-loading__tap', { force: true }).catch(() => {}); await p.waitForTimeout(1500)
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.__raf = 0 })
  await p.waitForTimeout(5000)
  const rafG = await p.evaluate(() => window.__raf)
  R.numero('scheda nascosta 5 s (gioco)', `${rafG} requestAnimationFrame`)
  if (rafG > 10) R.problema('MEDIA', `gioco in background: ${rafG} rAF in 5 s, il loop di rendering non si ferma (batteria)`, { dove: 'src/rigori/main.js', nota: 'il browser vero rallenta i rAF delle schede nascoste, ma non li annulla; il loop andrebbe fermato su visibilitychange' })
  await ctx.close()
}
// cache del meteo: 2 ore simulate, quante richieste
{
  const { p, ctx } = await pagina(b)
  let n = 0; await p.route('**/api.open-meteo.com/**', (r) => { n++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hourly: { time: ['2026-10-15T10:00'], temperature_2m: [20], precipitation_probability: [10], weather_code: [1], wind_speed_10m: [5] }, daily: { time: ['2026-10-15'], temperature_2m_max: [22], temperature_2m_min: [14], precipitation_probability_max: [10], weather_code: [1], sunrise: ['2026-10-15T07:50'], sunset: ['2026-10-15T19:05'] } }) }) })
  await p.clock.install({ time: new Date('2026-10-15T10:00:00') })
  await p.goto(base + '/#/oggi', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  for (let i = 0; i < 12; i++) { await p.clock.runFor(10 * 60 * 1000); await p.evaluate(() => { location.hash = '#/programma/ven' }); await p.waitForTimeout(150); await p.evaluate(() => { location.hash = '#/oggi' }); await p.waitForTimeout(300) }
  R.numero('meteo: richieste in 2 ore simulate con 12 ritorni su Oggi', n)
  if (n > 5) R.problema('ALTA', `meteo: ${n} richieste in 2 ore (attese ≤ 5 con cache di 30 minuti)`, { dove: 'src/ui/meteo.js' }); else R.ok(`meteo: ${n} richieste in 2 ore con 12 ritorni su Oggi (cache 30 min rispettata)`)
  await ctx.close()
}
await b.close(); R.salva()
