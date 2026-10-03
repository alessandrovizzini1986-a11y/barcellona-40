// AUDIT 4 · schermi: larghezze 320–1280, tema chiaro e scuro, ogni vista: niente scorrimento orizzontale, testo tagliato,
// elementi sovrapposti; screenshot a 380. Solo Chromium: WebKit non è installato in questo ambiente (segnalato nel report).
import { mkdirSync } from 'node:fs'
import { lancia, pagina, vai, base, OUT, SWIFT, Registro } from './_lib.mjs'
const R = new Registro('schermi')
R.problema('ALTA', 'WebKit (Safari iPhone) non è disponibile in questo ambiente: tutti i controlli di schermo sono solo Chromium', { dove: 'ambiente di QA', costo: 'un giro di 5 minuti su un iPhone vero', rischio: 'il punto mai guardato: differenze di resa Safari non misurate' })
const VISTE = [['oggi-prima', '#/oggi?now=2026-10-15T10:00', 'ale'], ['oggi-durante', '#/oggi?now=2026-10-17T10:00', 'ale'], ['programma-ven', '#/programma/ven', 'ale'], ['programma-sab', '#/programma/sab', 'ale'], ['programma-dom', '#/programma/dom', 'ale'], ['mappa', '#/mappa', 'ale'], ['missioni', '#/missioni', 'ale'], ['info', '#/info', 'ale']]
const esame = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
  const tagliati = [], ellissi = [], sovrapposti = []
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.closest('.leaflet-container, svg, canvas')) continue
    const cs = getComputedStyle(e)
    if (e.scrollWidth > e.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) && e.children.length === 0 && e.textContent.trim()) (cs.textOverflow === 'ellipsis' ? ellissi : tagliati).push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')}: "${e.textContent.trim().slice(0, 40)}"`)
  }
  const cand = [...document.querySelectorAll('.btn, .chip, .card__title, .tile__big, h1, h2, .person-chip, .header__rigori, .header__camera, .header__music')].filter(vis)
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    const a = cand[i].getBoundingClientRect(), b = cand[j].getBoundingClientRect()
    if (cand[i].contains(cand[j]) || cand[j].contains(cand[i])) continue
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    if (x * y > 0.2 * Math.min(a.width * a.height, b.width * b.height) && x * y > 40) sovrapposti.push(`${cand[i].className.toString().split(' ')[0]} × ${cand[j].className.toString().split(' ')[0]} ("${cand[i].textContent.trim().slice(0, 20)}" / "${cand[j].textContent.trim().slice(0, 20)}")`)
  }
  return { scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, tagliati: tagliati.slice(0, 6), ellissi: ellissi.slice(0, 6), sovrapposti: sovrapposti.slice(0, 6) }
}
const b = await lancia(SWIFT)
mkdirSync(OUT + '/schermi', { recursive: true })
const visti = new Set()
for (const w of [320, 360, 380, 412, 768, 1280]) for (const tema of ['dark', 'light']) {
  for (const [nome, h, person] of VISTE) {
    const { p, ctx, erroriVeri } = await pagina(b, { person, viewport: { width: w, height: w > 500 ? 900 : 800 }, ls: { 'b40:v1:theme': JSON.stringify(tema) } })
    await vai(p, h); if (nome === 'info') await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
    const r = await p.evaluate(esame)
    const tag = `${nome} @${w} ${tema}`
    if (r.scroll > 0) R.problema('MEDIA', `scorrimento orizzontale di ${r.scroll} px`, { dove: tag })
    for (const t of r.tagliati) { const k = 'tag|' + t; if (!visti.has(k)) { visti.add(k); R.problema('MEDIA', `testo tagliato senza ellissi: ${t}`, { dove: tag }) } }
    for (const t of r.ellissi) { const k = 'ell|' + t.slice(0, 50); if (!visti.has(k)) { visti.add(k); R.problema('BASSA', `testo troncato con ellissi: ${t}`, { dove: tag, nota: 'voluto in alcuni casi (HUD, intestazioni)' }) } }
    for (const t of r.sovrapposti) { const k = 'sov|' + t; if (!visti.has(k)) { visti.add(k); R.problema('MEDIA', `elementi sovrapposti: ${t}`, { dove: tag }) } }
    const e = erroriVeri(); if (e.length) R.problema('ALTA', 'errori JS', { dove: tag, nota: e.join(' | ').slice(0, 160) })
    if (w === 380) await p.screenshot({ path: `${OUT}/schermi/${nome}-${tema}.png`, fullPage: nome !== 'mappa' })
    await ctx.close()
  }
  // il gioco
  const { p, ctx, erroriVeri } = await pagina(b, { viewport: { width: w, height: w > 500 ? 900 : 800 } })
  await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }).catch(() => {}); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(500)
  const g = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, canvas: (() => { const c = document.querySelector('canvas'); return c ? `${c.clientWidth}×${c.clientHeight}` : null })(), tap: !!document.querySelector('.rg-loading__tap:not([hidden])') }))
  if (g.scroll > 0) R.problema('MEDIA', `gioco: scorrimento orizzontale di ${g.scroll} px`, { dove: `gioco @${w} ${tema}` })
  if (!g.tap) R.problema('ALTA', 'gioco: "Tocca per iniziare" non compare', { dove: `gioco @${w}` })
  if (w === 380 && tema === 'dark') { await p.screenshot({ path: `${OUT}/schermi/gioco-${tema}.png` }); await p.click('.rg-loading__tap', { force: true }).catch(() => {}); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/schermi/gioco-chitira-${tema}.png` }) }
  const e = erroriVeri(); if (e.length) R.problema('ALTA', 'gioco: errori JS', { dove: `gioco @${w}`, nota: e.join(' | ').slice(0, 160) })
  await ctx.close()
  R.ok(`${w} px ${tema}: ${VISTE.length} viste + gioco esaminate`)
}
await b.close(); R.salva()
