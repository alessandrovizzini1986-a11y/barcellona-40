// QA della domenica al coperto (dal 12/10/2026) e della variante "Se torna il sole". Il venerdì con la pioggia sta in
// venerdi.mjs. Spento (default): Casa Batlló 12:30, taxi al Bar Celta 14:00 col blocco "Da dare al tassista", Maremagnum
// 15:30, rientro ~20:05 da Port Vell; quattro percorsi; avviso sulla prenotazione del Mirador da disdire (Programma e
// Oggi, sabato e domenica mattina). Acceso: Mirador 13:30, Bunkers 16:00 con l'avviso giallo sull'orario, rientro ~20:00
// dai Bunkers; tre percorsi di prima; l'avviso del Mirador sparisce. Mappa coerente. La preferenza sopravvive.
//   node scripts/qa/sole.mjs [url]
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
async function apri(person, path, { sole = false, piove = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(({ person, sole, piove }) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true'); if (sole) localStorage.setItem('b40:v1:sole', 'true'); if (piove) localStorage.setItem('b40:v1:piove', 'true') } catch {} }, { person, sole, piove })
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
const orari = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
const ordine = (p) => p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => c.dataset.stop).join(' '))
const percorsi = (p) => p.evaluate(() => [...document.querySelectorAll('.percorso')].map((a) => ({ id: a.dataset.percorso, href: a.getAttribute('href'), testo: a.querySelector('small').textContent })))
const dett = (p, id) => p.locator(`.card[data-stop="${id}"] details`).evaluate((d) => d.textContent)
const AVVISO = 'El Mirador è prenotato per domenica alle 13:30. Se la domenica resta al coperto (Batlló, Bar Celta, Maremagnum), cancella la prenotazione entro sabato, dal link nella mail di Google Maps. Tel +34 931 64 20 22.'
// 1. domenica al coperto (default)
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/dom')
  ok('domenica: niente toggle "Piove"; c\'è "Se torna il sole", spento, che parla di Batlló, Bar Celta, Maremagnum, Mirador e Bunkers', (await p.locator('#piove').count()) === 0 && (await p.locator('#sole').count()) === 1 && !(await p.isChecked('#sole')) && /Casa Batlló/.test(await p.locator('.switch--sole').innerText()) && /Bar Celta/.test(await p.locator('.switch--sole').innerText()) && /Bunkers/.test(await p.locator('.switch--sole').innerText()))
  const o = await orari(p)
  ok('al coperto: Casa Batlló 12:30, Bar Celta 14:00, Maremagnum 15:30, rientro ~20:05', o.d0 === '12:30' && o.d1b === '14:00' && o.d1c === '15:30' && o.d3 === '~20:05', JSON.stringify(o))
  ok('al coperto: Mirador e Bunkers non ci sono, niente tappe grigie', !o.d1 && !o.d2 && (await ordine(p)) === 'd0 d1b d1c d3' && (await p.locator('.card--saltata').count()) === 0, await ordine(p))
  ok('Casa Batlló: badge "da verificare" (biglietto da comprare), 75 min, 1,7 km a piedi dall\'appartamento', (await p.locator('.card[data-stop="d0"] .badge--da_verificare').count()) === 1 && /1 h 15 min/.test(await p.locator('.card[data-stop="d0"] .chips').innerText()) && /1,7 km · 20 min a piedi/.test(await p.locator('.card[data-stop="d0"] .chips').innerText()), await p.locator('.card[data-stop="d0"] .chips').innerText())
  ok('Casa Batlló: prezzo dinamico e scadenza di giovedì 15 nei dettagli', /prezzo dinamico/.test(await dett(p, 'd0')) && /entro giovedì 15/.test(await dett(p, 'd0')))
  const celta = p.locator('.card[data-stop="d1b"]')
  ok('Bar Celta: testo, consiglio stimato, badge "consigliato da un amico", 90 min, taxi 2,4 km · 10 min', /Polpo alla gallega, patate, pimientos de Padrón e un bianco galiziano\. Locale storico, ci vanno quelli del quartiere\./.test(await celta.locator('.card__why').innerText()) && /Prendete polpo e vino al bicchiere\. Evitate la sangria in caraffa: è piena di ghiaccio\./.test(await dett(p, 'd1b')) && (await celta.locator('.badge--consigliato').innerText()) === 'consigliato da un amico' && /1 h 30 min/.test(await celta.locator('.chips').innerText()) && /2,4 km · 10 min/.test(await celta.locator('.chips').innerText()), await celta.locator('.chips').innerText())
  ok('Bar Celta: sede di Simó Oller 3, non Princesa; domenica 12–24; telefono', /Simó Oller 3: NON quella di Carrer de la Princesa/.test(await dett(p, 'd1b')) && /Domenica 12:00–24:00/.test(await dett(p, 'd1b')) && /\+34 933 15 00 06/.test(await dett(p, 'd1b')))
  ok('Bar Celta: blocco "Da dare al tassista" con l\'indirizzo, Bolt e Uber verso Simó Oller 3', /Carrer de Simó Oller, 3 · 08003 Barcelona/.test(await celta.locator('.tassista__addr').innerText()) && (await celta.locator('[data-taxi-bolt]').count()) === 1 && /dropoff\[latitude\]=41\.379925&dropoff\[longitude\]=2\.180095/.test(await celta.locator('[data-taxi-uber]').getAttribute('href')))
  ok('Bar Celta: riga bagno "Ristorante" (siamo clienti)', /^Ristorante$/.test((await celta.locator('[data-bagno-riga] .bagno__txt').innerText()).trim()))
  ok('Maremagnum: 4 h, 935 m · 11 min a piedi dal Celta, bagni gratuiti, taxi alle 19:30 e alle 18:45 con allerta', /4 h/.test(await p.locator('.card[data-stop="d1c"] .chips').innerText()) && /935 m · 11 min a piedi/.test(await p.locator('.card[data-stop="d1c"] .chips').innerText()) && /Bagni gratuiti al 1° e 2° piano/.test(await dett(p, 'd1c')) && /Con allerta arancione o rossa si parte alle 18:45/.test(await dett(p, 'd1c')))
  ok('rientro: taxi da Maremagnum alle 19:30, 20,0 km · 32 min, 18:45 con allerta, lounge 20:20 e volo 23:05', /taxi da Maremagnum alle 19:30/i.test(await dett(p, 'd3')) && /18:45/.test(await dett(p, 'd3')) && /20,0 km · 32 min/.test(await p.locator('.card[data-stop="d3"] .chips').innerText()) && /lounge Canudas dalle 20:20, volo alle 23:05/.test(await dett(p, 'd3')))
  const pc = await percorsi(p)
  ok('quattro percorsi: a piedi a Batlló, taxi al Celta, a piedi a Maremagnum, taxi al T2', JSON.stringify(pc.map((x) => x.id)) === JSON.stringify(['dom-mattina', 'dom-pranzo', 'dom-pomeriggio', 'dom-rientro']) && /destination=41\.3917,2\.164918&travelmode=walking/.test(pc[0].href) && /origin=41\.3917,2\.164918&destination=41\.379925,2\.180095&travelmode=driving/.test(pc[1].href) && /destination=41\.3746496,2\.1823721&travelmode=walking/.test(pc[2].href) && /origin=41\.3746496,2\.1823721&destination=41\.3033401,2\.076845&travelmode=driving/.test(pc[3].href), pc.map((x) => x.id + ' ' + x.testo).join(' | '))
  ok('i percorsi dicono i totali veri (1,7 km a piedi; 2,4 km in taxi; 935 m a piedi; 20,0 km in taxi)', /1,7 km · 20 min a piedi/.test(pc[0].testo) && /2,4 km · 10 min in taxi/.test(pc[1].testo) && /935 m · 11 min a piedi/.test(pc[2].testo) && /20,0 km · 32 min in taxi/.test(pc[3].testo), pc.map((x) => x.testo).join(' | '))
  const avv = p.locator('[data-avviso-mirador]')
  ok('AVVISO in cima: la prenotazione del Mirador va disdetta entro sabato, col pulsante "Chiama"', (await avv.count()) === 1 && (await avv.innerText()).replace(/\s+/g, ' ').trim() === `${AVVISO} Chiama` && (await avv.locator('a').getAttribute('href')) === 'tel:+34931642022', (await avv.innerText().catch(() => '')).replace(/\s+/g, ' '))
  ok('l\'avviso sta sopra il toggle', await p.evaluate(() => { const a = document.querySelector('[data-avviso-mirador]'); const t = document.querySelector('.switch--sole'); return !!a && !!t && (a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 }))
  ok('il passo del taxi nella timeline parte da Port Vell, con l\'anticipo alle 18:45 in caso di allerta', /Da Port Vell/.test(await p.locator('.timeline').innerText()) && /18:45/.test(await p.locator('.timeline').innerText()) && (await p.locator('.avviso--sole').count()) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  // si accende: torna la domenica di prima
  await p.locator('#sole').check(); await p.waitForTimeout(600)
  const os = await orari(p)
  ok('col sole: Mirador 13:30, Bunkers 16:00, rientro ~20:00; Batlló, Celta e Maremagnum spariscono', os.d1 === '13:30' && os.d2 === '16:00' && os.d3 === '~20:00' && !os.d0 && !os.d1b && !os.d1c && (await ordine(p)) === 'd1 d2 d3', JSON.stringify(os))
  ok('col sole: l\'avviso giallo sui Bunkers (17:30) resta, quello del Mirador sparisce, l\'avviso della variante c\'è', (await p.locator('.card[data-stop="d2"] .avviso--orario').count()) === 1 && (await p.locator('[data-avviso-mirador]').count()) === 0 && /Variante sole/.test(await p.locator('.avviso:not(.avviso--orario)').first().innerText()))
  const ps = await percorsi(p)
  ok('col sole: tre percorsi di prima (mezzi al Mirador, a piedi ai Bunkers, mezzi al T2)', JSON.stringify(ps.map((x) => x.id)) === JSON.stringify(['dom-mattina', 'dom-pomeriggio', 'dom-rientro']) && /destination=41\.4169774,2\.1589342&travelmode=transit/.test(ps[0].href) && /origin=41\.4169774,2\.1589342&destination=41\.4193003,2\.1618259&travelmode=walking/.test(ps[1].href) && /origin=41\.4193003,2\.1618259.*travelmode=transit/.test(ps[2].href), ps.map((x) => x.id).join(' '))
  ok('col sole: il rientro torna 22,7 km · 36 min dai Bunkers', /22,7 km · 36 min/.test(await p.locator('.card[data-stop="d3"] .chips').innerText()))
  ok('la preferenza è salvata in b40:v1:sole', (await p.evaluate(() => localStorage.getItem('b40:v1:sole'))) === 'true')
  await p.locator('#sole').uncheck(); await p.waitForTimeout(600)
  ok('spento: la domenica al coperto torna identica', (await ordine(p)) === 'd0 d1b d1c d3' && (await p.locator('[data-avviso-mirador]').count()) === 1)
  await ctx.close()
}
// 2. il toggle Piove del venerdì non tocca la domenica
{
  const { p, ctx } = await apri('ale', '/#/programma/dom', { piove: true })
  ok('con "Piove" acceso la domenica non cambia (niente tappe saltate, stesso ordine)', (await ordine(p)) === 'd0 d1b d1c d3' && (await p.locator('.card--saltata').count()) === 0)
  await ctx.close()
}
// 3. Oggi: sabato e domenica mattina l'avviso del Mirador; domenica pomeriggio Adesso = Maremagnum
{
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-17T10:00#/oggi')
  ok('Oggi sabato 10:00: niente avviso del Mirador (sta in Programma › Domenica), l\'album resta il primo blocco', (await p.locator('[data-avviso-mirador]').count()) === 0 && await p.evaluate(() => document.querySelector('.view')?.firstElementChild?.classList.contains('album')))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T10:00#/oggi')
  ok('Oggi domenica 10:00: avviso del Mirador in cima e Prossima = Casa Batlló 12:30', (await p.locator('[data-avviso-mirador]').count()) === 1 && await p.evaluate(() => document.querySelector('.view')?.firstElementChild?.hasAttribute('data-avviso-mirador')) && (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '12:30')
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T16:30#/oggi')
  ok('Oggi domenica 16:30: Adesso = Maremagnum col percorso a piedi dal Celta, niente avviso del Mirador', (await p.locator('.tile--accent .card').getAttribute('data-stop')) === 'd1c' && (await p.locator('.tile--accent .percorso').getAttribute('data-percorso')) === 'dom-pomeriggio' && (await p.locator('[data-avviso-mirador]').count()) === 0)
  ok('Oggi domenica: Mirador e Bunkers non stanno nel piano del giorno', (await p.locator('.timeline .card[data-stop="d1"], .timeline .card[data-stop="d2"]').count()) === 0)
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T10:00#/oggi', { sole: true })
  ok('Oggi domenica 10:00 col sole: niente avviso del Mirador, Prossima = Mirador 13:30, la timeline del viaggio avverte del taxi dai Bunkers', (await p.locator('[data-avviso-mirador]').count()) === 0 && (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '13:30' && /taxi per il T2 parte dai Bunkers/.test(await p.locator('.viaggio-oggi .avviso--sole').innerText()))
  await ctx.close()
}
{
  const { p, ctx } = await apri('monne', '/?now=2026-10-17T10:00#/oggi')
  ok('Monne non vede l\'avviso del Mirador (domenica non c\'è)', (await p.locator('[data-avviso-mirador]').count()) === 0)
  await ctx.close()
}
// 4. mappa: al coperto Batlló, Celta, Maremagnum e T2; col sole Mirador, Bunkers e T2
for (const [sole, attesi] of [[false, ['Casa Batlló', 'Pranzo · Bar Celta Pulpería', 'Pomeriggio al coperto · Maremagnum', 'Rientro a Bologna']], [true, ['Pranzo · El Mirador', 'Bunkers del Carmel — MUHBA Turó de la Rovira', 'Rientro a Bologna']]]) {
  const { p, ctx } = await apri('ale', '/#/mappa', { sole })
  await p.waitForTimeout(800)
  const titoli = []
  const n = await p.locator('.marker[style*="--dom"]').count()
  for (let i = 0; i < n; i++) { await p.locator('.marker[style*="--dom"]').nth(i).dispatchEvent('click'); await p.waitForTimeout(250); titoli.push(await p.locator('.popup__title').last().innerText().catch(() => '?')); await p.evaluate(() => document.querySelector('.leaflet-popup-close-button')?.click()); await p.waitForTimeout(150) }
  ok(`mappa, sole ${sole ? 'acceso' : 'spento'}: i marker di domenica sono ${attesi.length} e sono quelli giusti`, n === attesi.length && attesi.every((t) => titoli.includes(t)), titoli.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK sole')
