// AUDIT 12 · caos: 5 minuti di tocchi, swipe e scroll casuali su ogni vista principale e sul gioco. Zero errori non gestiti ammessi.
// Monkey test fatto in casa (gremlins.js non è disponibile offline). Solo Chromium.
import { lancia, pagina, base, SWIFT, Registro } from './_lib.mjs'
const R = new Registro('caos')
const DURATA = +(process.env.AUDIT_CAOS_S || 300) * 1000
const b = await lancia(SWIFT)
const BERSAGLI = [['oggi', '#/oggi?now=2026-10-17T10:00'], ['programma', '#/programma/ven'], ['mappa', '#/mappa'], ['missioni', '#/missioni'], ['info', '#/info'], ['gioco', 'rigori/?q=bassa']]
let seme = 7; const rnd = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646 }
for (const [nome, h] of BERSAGLI) {
  const { p, ctx, errs } = await pagina(b)
  const tracce = []; p.on('pageerror', (e) => tracce.push((e.stack || e.message || String(e)).split('\n').slice(0, 4).join(' ← ')))
  ctx.on('page', (q) => q.close().catch(() => {})) // i link esterni aprono schede: si chiudono subito
  await p.route('**/*', (r) => { const u = r.request().url(); if (r.request().isNavigationRequest() && !u.startsWith(base)) return r.abort(); return r.continue() })
  await p.goto(base + '/' + h, { waitUntil: 'load' }).catch(() => {})
  if (nome === 'gioco') { await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 120000 }).catch(() => {}); await p.click('.rg-loading__tap', { force: true }).catch(() => {}) }
  await p.waitForTimeout(800)
  const t0 = Date.now(); let azioni = 0, usciti = 0
  while (Date.now() - t0 < DURATA) {
    const w = 380, hh = 800, x = Math.floor(rnd() * w), y = Math.floor(rnd() * hh), r = rnd()
    try {
      if (r < 0.55) await p.touchscreen.tap(x, y)
      else if (r < 0.8) { await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 5; i++) await p.mouse.move(x + (rnd() - .5) * 300 * i / 5, y + (rnd() - .5) * 400 * i / 5); await p.mouse.up() }
      else if (r < 0.95) await p.mouse.wheel(0, (rnd() - .4) * 800)
      else { await p.touchscreen.tap(x, y); await p.touchscreen.tap(x, y) }
    } catch { /* la pagina può star navigando */ }
    azioni++
    if (azioni % 40 === 0) { const url = p.url(); if (!url.startsWith(base) || (nome !== 'gioco' && /rigori|canzone\.html|stats/.test(url)) || (nome === 'gioco' && !/rigori/.test(url))) { usciti++; await p.goto(base + '/' + h, { waitUntil: 'load' }).catch(() => {}); if (nome === 'gioco') { await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 120000 }).catch(() => {}); await p.click('.rg-loading__tap', { force: true }).catch(() => {}) } } }
    await p.waitForTimeout(40)
  }
  R.numero(`caos ${nome}`, `${azioni} azioni in ${Math.round(DURATA / 1000)} s · ${usciti} rientri · ${tracce.length} errori`)
  for (const t of [...new Set(tracce)].slice(0, 5)) R.problema('ALTA', `caos ${nome}: errore non gestito`, { dove: nome, nota: t.slice(0, 300) })
  if (!tracce.length) R.ok(`caos ${nome}: nessun errore in ${azioni} azioni`)
  await ctx.close()
}
await b.close(); R.salva()
