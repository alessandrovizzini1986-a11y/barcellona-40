// QA del piano pioggia di domenica (il venerdì sta in venerdi.mjs): toggle anche qui, Bunkers saltati, pranzo lungo al
// Mirador, rientro anticipato con la lounge dalle 17, nota sulla timeline del viaggio, mappa senza la tappa saltata.
//   node scripts/qa/pioggia.mjs http://localhost:4173
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
async function apri(person, path, piove) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(({ person, piove }) => { try { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true'); if (piove) localStorage.setItem('b40:v1:piove', 'true') } catch {} }, { person, piove })
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
const orari = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
// 1. domenica asciutta: toggle presente, piano normale
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/dom', false)
  ok('domenica: il toggle Piove c\'è e parla dei Bunkers', (await p.locator('#piove').count()) === 1 && /Bunkers/.test(await p.locator('.switch--piove').innerText()) && !(await p.isChecked('#piove')))
  const o = await orari(p)
  ok('domenica asciutta: Mirador 13:30, Bunkers 16:00, rientro ~20:00', o.d1 === '13:30' && o.d2 === '16:00' && o.d3 === '~20:00', JSON.stringify(o))
  ok('domenica asciutta: nessuna tappa saltata, nessun avviso di pioggia', (await p.locator('.card--saltata, .avviso--pioggia').count()) === 0)
  // si accende qui: il toggle è lo stesso del venerdì (piove o non piove)
  await p.locator('#piove').check(); await p.waitForTimeout(600)
  const op = await orari(p)
  ok('domenica con pioggia: Mirador 13:30 per 2 h, rientro alle 15:30, Bunkers saltati in coda', op.d1 === '13:30' && /2 h/.test(await p.locator('.card[data-stop="d1"] .chips').innerText()) && op.d3 === '~15:30' && (await p.locator('.timeline__saltata .card[data-stop="d2"].card--saltata').count()) === 1, JSON.stringify(op))
  ok('domenica con pioggia: avviso del piano B (Mirador fino alle 15:30, lounge dalle 17)', /niente Bunkers/.test(await p.locator('.avviso').first().innerText()) && /lounge Canudas dalle 17:00/.test(await p.locator('.avviso').first().innerText()))
  ok('domenica con pioggia: il rientro spiega il piano (T2 in anticipo, Canudas dalle 17:00 invece delle 20:20)', /Canudas dalle 17:00 circa invece delle 20:20/.test(await p.locator('.card[data-stop="d3"] details').evaluate((d) => d.textContent)))
  ok('domenica con pioggia: il Mirador dice che si resta fino alle 15:30', /fino alle 15:30/.test(await p.locator('.card[data-stop="d1"] details').evaluate((d) => d.textContent)))
  ok('la stessa preferenza vale per il venerdì', (await p.evaluate(() => localStorage.getItem('b40:v1:piove'))) === 'true')
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 2. Oggi, domenica alle 14:00 con la pioggia: Adesso il Mirador, Prossima il rientro delle 15:30, nota sul viaggio
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T14:00#/oggi', true)
  ok('Oggi domenica 14:00: Adesso = Mirador', (await p.locator('.tile--accent .card').getAttribute('data-stop')) === 'd1')
  ok('Oggi domenica 14:00: Prossima = rientro alle 15:30, non i Bunkers', (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '15:30')
  ok('Oggi domenica: la timeline del viaggio avverte del piano pioggia', /Piano pioggia: niente Bunkers/.test(await p.locator('.viaggio-oggi .avviso--pioggia').innerText()))
  ok('Oggi domenica: i Bunkers non stanno nel piano del giorno', (await p.locator('.timeline .card[data-stop="d2"]').count()) === 0)
  await ctx.close()
}
// 3. mappa: le tappe saltate non ci sono
{
  const { p, ctx } = await apri('ale', '/#/mappa', true)
  await p.waitForTimeout(800)
  const alt = await p.evaluate(() => [...document.querySelectorAll('.leaflet-marker-icon')].map((m) => m.getAttribute('alt') || ''))
  ok('mappa con pioggia: niente Ciutadella né Bunkers fra i marker', alt.length > 5 && !alt.some((a) => /Ciutadella|Bunkers/.test(a)), alt.filter((a) => /Ciutadella|Bunkers/.test(a)).join(' | ') || `${alt.length} marker`)
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK pioggia')
