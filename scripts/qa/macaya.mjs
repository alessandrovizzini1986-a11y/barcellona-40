// QA del toggle "Palau Macaya" del venerdì: spento → pomeriggio identico a prima (confronto con la fotografia
// in scripts/qa/fixtures/ven-pomeriggio.json, presa prima della modifica) più la card grigia; acceso → orari a
// cascata coerenti fino alle 20:30, Pausa casa e Palau Macaya in timeline, percorso del pomeriggio nuovo;
// la tappa non compare a Giulio e Manuel; il toggle sopravvive al ricaricamento.
//   node scripts/qa/macaya.mjs [url] [--fotografa]   (--fotografa riscrive la fixture: solo prima di cambiare i dati)
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
const args = process.argv.slice(2), base = args.find((a) => !a.startsWith('--')) || 'http://localhost:4173', fotografa = args.includes('--fotografa')
const FIX = 'scripts/qa/fixtures/ven-pomeriggio.json'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
async function apri(person, path, { macaya = false, piove = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(({ person, macaya, piove }) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true'); if (macaya) localStorage.setItem('b40:v1:macaya', 'true'); if (piove) localStorage.setItem('b40:v1:piove', 'true') } catch {} }, { person, macaya, piove })
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
// fotografia del pomeriggio: per ogni card da f11 in poi id, orario, chip, dettagli; più i pulsanti dei percorsi
const pomeriggio = (p) => p.evaluate(() => ({
  card: [...document.querySelectorAll('.timeline .card[data-stop]')].filter((c) => /^f1[1-9]/.test(c.dataset.stop)).map((c) => ({ id: c.dataset.stop, ora: (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim(), chips: c.querySelector('.chips')?.innerText.replace(/\s+/g, ' ').trim(), dettagli: c.querySelector('details')?.textContent.replace(/\s+/g, ' ').trim(), titolo: c.querySelector('h3, .card__title')?.textContent.trim() })),
  percorsi: [...document.querySelectorAll('.percorso')].map((a) => ({ id: a.dataset.percorso, href: a.getAttribute('href'), testo: a.querySelector('small').textContent })),
  avvisi: [...document.querySelectorAll('.avviso')].map((a) => a.innerText.replace(/\s+/g, ' ').trim())
}))
const orari = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
if (fotografa) {
  const { p, ctx } = await apri('ale', '/#/programma/ven')
  writeFileSync(FIX, JSON.stringify(await pomeriggio(p), null, 1) + '\n'); console.log('fixture scritta:', FIX); await ctx.close(); await b.close(); process.exit(0)
}
const fix = JSON.parse(readFileSync(FIX, 'utf8'))
// 1. spento (default): pomeriggio identico alla fotografia, card grigia in fondo al pomeriggio
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/ven')
  ok('venerdì: il toggle "Palau Macaya" c\'è, sotto "Piove", ed è spento', (await p.locator('#macaya').count()) === 1 && !(await p.isChecked('#macaya')) && (await p.evaluate(() => { const a = document.querySelector('.switch--piove'), c = document.querySelector('.switch--macaya'); return !!a && !!c && (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 })))
  const ora = await pomeriggio(p)
  ok('spento: le card del pomeriggio sono identiche a prima (id, orari, chip, dettagli)', JSON.stringify(ora.card) === JSON.stringify(fix.card), JSON.stringify(ora.card.map((c) => c.id + ' ' + c.ora)) + ' vs ' + JSON.stringify(fix.card.map((c) => c.id + ' ' + c.ora)))
  ok('spento: i percorsi sono identici a prima', JSON.stringify(ora.percorsi) === JSON.stringify(fix.percorsi))
  ok('spento: gli avvisi sono identici a prima', JSON.stringify(ora.avvisi) === JSON.stringify(fix.avvisi), JSON.stringify(ora.avvisi))
  const grigia = p.locator('[data-macaya-off]')
  ok('spento: la card grigia "Palau Macaya · opzionale" c\'è, in fondo al pomeriggio (dopo la Braseria, prima di Opzionale)', (await grigia.count()) === 1 && /Palau Macaya · opzionale · gratis, sulla strada per il Rooftop · attivala per inserirla/.test(await grigia.innerText()) && (await p.evaluate(() => { const g = document.querySelector('[data-macaya-off]'), f15 = document.querySelector('.card[data-stop="f15"]'), opz = document.querySelector('.timeline__opzionale'); return (f15.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && (!opz || (g.compareDocumentPosition(opz) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) })))
  ok('spento: nessuna card f12b o f12c in timeline', (await p.locator('.card[data-stop="f12b"], .card[data-stop="f12c"]').count()) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  // si accende dal toggle: ricalcolo e salvataggio
  await p.locator('#macaya').check(); await p.waitForTimeout(600)
  const o = await orari(p)
  ok('acceso: Taps 16:30, Pausa casa ~16:59, Palau Macaya 17:28, Rooftop ~18:13, Braseria ~20:30 (gli stimati con la tilde; la cascata somma i minuti di Valhalla senza arrotondare)', o.f13 === '16:30' && o.f12c === '~16:59' && o.f12b === '17:28' && o.f14 === '~18:13' && o.f15 === '~20:30', JSON.stringify(o))
  ok('acceso: ordine in timeline f13 → f12c → f12b → f14 → f15', (await p.evaluate(() => [...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => c.dataset.stop).filter((i) => /^f1[2-5]/.test(i)).join(' '))) === 'f12 f13 f12c f12b f14 f15')
  const chips = (id) => p.locator(`.card[data-stop="${id}"] .chips`).innerText().then((t) => t.replace(/\s+/g, ' '))
  ok('acceso: tratti e durate a cascata (Taps 10 min; casa 1,5 km · 19 min, 15 min; Macaya 1,1 km · 14 min, 30 min; Rooftop 1,3 km · 15 min, 1 h 55; Sarrià 4,6 km · 15 min)', /10 min/.test(await chips('f13')) && /1,5 km · 19 min a piedi/.test(await chips('f12c')) && /15 min/.test(await chips('f12c')) && /1,1 km · 14 min a piedi/.test(await chips('f12b')) && /30 min/.test(await chips('f12b')) && /1,3 km · 15 min a piedi/.test(await chips('f14')) && /1 h 55 min/.test(await chips('f14')) && /4,6 km · 15 min/.test(await chips('f15')), [await chips('f13'), await chips('f12c'), await chips('f12b'), await chips('f14'), await chips('f15')].join(' || '))
  ok('acceso: la card grigia sparisce', (await p.locator('[data-macaya-off]').count()) === 0)
  const dett = await p.locator('.card[data-stop="f12b"] details').evaluate((d) => d.textContent)
  ok('acceso: Palau Macaya coi dettagli dati (ingresso libero, fino alle 20, Puig i Cadafalch, cortile e scala, CaixaForum, al coperto, 20–30 min)', /Ingresso libero, nessuna prenotazione/.test(dett) && /Venerdì aperto fino alle 20:00/.test(dett) && /Puig i Cadafalch, 1901/.test(dett) && /cortile interno, la grande scala/.test(dett) && /CaixaForum/.test(dett) && /Tutto al coperto: va bene anche con la pioggia/.test(dett) && /20–30 minuti: è una sosta, non un museo/.test(dett))
  ok('acceso: la mini-tappa "Pausa casa · bottiglie in frigo" è compatta', (await p.locator('.card[data-stop="f12c"].card--mini').count()) === 1 && /Pausa casa · bottiglie in frigo/.test(await p.locator('.card[data-stop="f12c"]').innerText()))
  const pc = await p.locator('[data-percorso="ven-pomeriggio"]').first()
  ok('acceso: il percorso del pomeriggio passa da Palau Macaya (link nuovo, verificato)', (await pc.getAttribute('href')) === 'https://www.google.com/maps/dir/?api=1&origin=41.386162,2.1786073&destination=41.3915035,2.1715182&travelmode=walking&waypoints=41.395437,2.179608|41.4054703,2.1759774|41.395437,2.179608|41.3997726,2.1694894')
  ok('acceso: il conto del pomeriggio parla di margine fino alle 20:30', (await p.evaluate(() => [...document.querySelectorAll('.avviso')].map((a) => a.innerText).join(' | '))).includes('20:30'))
  ok('il toggle è salvato in b40:v1:macaya', (await p.evaluate(() => localStorage.getItem('b40:v1:macaya'))) === 'true')
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  ok('dopo il ricaricamento il toggle è ancora acceso e Palau Macaya c\'è', await p.isChecked('#macaya') && (await orari(p)).f12b === '17:28')
  await p.locator('#macaya').uncheck(); await p.waitForTimeout(600)
  ok('spento di nuovo: pomeriggio come prima', JSON.stringify((await pomeriggio(p)).card) === JSON.stringify(fix.card))
  await ctx.close()
}
// 2. Giulio e Manuel non la vedono, né il toggle né la card grigia (il venerdì non è il loro giorno)
for (const person of ['giulio', 'manuel']) {
  const { p, ctx } = await apri(person, '/#/programma/ven', { macaya: true })
  ok(`${person}: niente Palau Macaya, niente toggle, niente card grigia`, (await p.locator('.card[data-stop="f12b"], .card[data-stop="f12c"], #macaya, [data-macaya-off]').count()) === 0)
  await ctx.close()
}
// 3. Oggi, venerdì 17:40 con il toggle acceso: Adesso = Palau Macaya; con Piove acceso insieme, resta (è al coperto)
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-16T17:40#/oggi', { macaya: true })
  ok('Oggi venerdì 17:40 con il toggle: Adesso = Palau Macaya, Prossima = Rooftop 18:13', (await p.locator('.tile--accent .card').getAttribute('data-stop')) === 'f12b' && (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '18:13')
  await ctx.close()
  const { p: p2, ctx: c2 } = await apri('ale', '/#/programma/ven', { macaya: true, piove: true })
  const o = await orari(p2)
  ok('Piove e Palau Macaya insieme: la mattina al coperto e il pomeriggio con Macaya (17:28) convivono: è al coperto, resta', o.f2b === '10:00' && o.f12b === '17:28' && o.f15 === '~20:30', JSON.stringify(o))
  await c2.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK macaya')
