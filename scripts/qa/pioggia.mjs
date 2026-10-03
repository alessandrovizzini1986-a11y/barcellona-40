// QA del piano pioggia di domenica (il venerdì sta in venerdi.mjs): toggle anche qui, Mirador e Bunkers saltati,
// pranzo al Time Out Market e pomeriggio a Maremagnum, taxi al T2 alle 19:30, avviso della prenotazione da cancellare
// (nel Programma e in Oggi la mattina), percorsi in taxi, nota sulla timeline del viaggio, mappa con le tappe giuste.
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
const ordine = (p) => p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => c.dataset.stop).join(' '))
const percorsi = (p) => p.evaluate(() => [...document.querySelectorAll('.percorso')].map((a) => ({ id: a.dataset.percorso, href: a.getAttribute('href'), testo: a.querySelector('small').textContent })))
const AVVISO = 'El Mirador è prenotato per le 13:30. Se resta la pioggia, cancella la prenotazione dal link nella mail di Google Maps, entro la mattina. Tel +34 931 64 20 22.'
// 1. domenica asciutta: toggle presente, piano normale, niente Maremagnum
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/dom', false)
  ok('domenica: il toggle Piove c\'è, parla dei Bunkers e di Maremagnum, ed è spento', (await p.locator('#piove').count()) === 1 && /Bunkers/.test(await p.locator('.switch--piove').innerText()) && /Maremagnum/.test(await p.locator('.switch--piove').innerText()) && !(await p.isChecked('#piove')))
  const o = await orari(p)
  ok('domenica asciutta: Mirador 13:30, Bunkers 16:00, rientro ~20:00', o.d1 === '13:30' && o.d2 === '16:00' && o.d3 === '~20:00', JSON.stringify(o))
  ok('domenica asciutta: Time Out Market e Maremagnum non ci sono', !o.d1b && !o.d1c && (await ordine(p)) === 'd1 d2 d3', await ordine(p))
  ok('domenica asciutta: nessuna tappa saltata, nessun avviso di pioggia, nessun avviso sulla prenotazione', (await p.locator('.card--saltata, .avviso--pioggia, [data-avviso-mirador]').count()) === 0)
  const pc = await percorsi(p)
  ok('domenica asciutta: tre percorsi, verso il Mirador coi mezzi e dal Mirador ai Bunkers a piedi', pc.length === 3 && pc[0].id === 'dom-mattina' && /destination=41\.4169774,2\.1589342&travelmode=transit/.test(pc[0].href) && pc[1].id === 'dom-pomeriggio' && /a piedi/.test(pc[1].testo), JSON.stringify(pc.map((x) => x.id + ' ' + x.testo)))
  // si accende qui: il toggle è lo stesso del venerdì (piove o non piove)
  await p.locator('#piove').check(); await p.waitForTimeout(600)
  const op = await orari(p)
  ok('domenica con pioggia: Time Out Market 13:00, Maremagnum 14:30, rientro ~20:05', op.d1b === '13:00' && op.d1c === '14:30' && op.d3 === '~20:05', JSON.stringify(op))
  ok('domenica con pioggia: Mirador e Bunkers in coda, grigi, sotto la riga "Saltate per pioggia"', (await ordine(p)) === 'd1b d1c d3 d1 d2' && (await p.locator('.timeline__saltata .card[data-stop="d1"].card--saltata').count()) === 1 && (await p.locator('.timeline__saltata .card[data-stop="d2"].card--saltata').count()) === 1 && (await p.locator('.timeline__saltate').textContent()).trim() === 'Saltate per pioggia', await ordine(p))
  ok('domenica con pioggia: il Mirador dice perché salta e che la prenotazione va cancellata', /saltato per pioggia/.test(await p.locator('.card[data-stop="d1"] .card__time--saltata').innerText()) && /cancellata entro la mattina/.test(await p.locator('.card[data-stop="d1"] .card__time--saltata').innerText()))
  const avv = p.locator('[data-avviso-mirador]')
  ok('AVVISO OBBLIGATORIO in cima, giallo, col testo esatto e il pulsante "Chiama"', (await avv.count()) === 1 && (await avv.innerText()).replace(/\s+/g, ' ').trim() === `${AVVISO} Chiama` && (await avv.evaluate((e) => e.classList.contains('avviso--pioggia'))), (await avv.innerText().catch(() => '')).replace(/\s+/g, ' '))
  ok('l\'avviso sta sopra il toggle', await p.evaluate(() => { const a = document.querySelector('[data-avviso-mirador]'); const t = document.querySelector('.switch--piove'); return !!a && !!t && (a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 }))
  ok('"Chiama" telefona al Mirador', (await avv.locator('a').getAttribute('href')) === 'tel:+34931642022' && (await avv.locator('a').innerText()).trim() === 'Chiama')
  ok('il pulsante "Chiama" è alto almeno 36 px (si tocca col pollice)', (await avv.locator('a').boundingBox()).height >= 36)
  ok('l\'avviso del piano racconta la giornata (taxi alle 12:45, Time Out Market, taxi al T2 alle 19:30)', /12:45/.test(await p.locator('.avviso:not(.avviso--pioggia)').first().innerText()) && /Time Out Market/.test(await p.locator('.avviso:not(.avviso--pioggia)').first().innerText()) && /19:30 taxi al T2/.test(await p.locator('.avviso:not(.avviso--pioggia)').first().innerText()))
  const dett = (id) => p.locator(`.card[data-stop="${id}"] details`).evaluate((d) => d.textContent)
  ok('Time Out Market: i dettagli dati (banchi, tavoli comuni, taxi delle 12:45, 3 km e 9 minuti)', /Tanti banchi diversi, ognuno sceglie il suo\. Citati nelle recensioni: paella di verdure, pizza, fish & chips\./.test(await dett('d1b')) && /Si mangia seduti ai tavoli comuni\./.test(await dett('d1b')) && /12:45: 3 km, circa 9 minuti/.test(await dett('d1b')))
  ok('Maremagnum: i dettagli dati (negozi, terrazza, aperto fino alle 22, taxi al T2 alle 19:30)', /Negozi, caffè, terrazza sul porto\. Aperto fino alle 22: si esce solo per andare in aeroporto\./.test(await dett('d1c')) && /19:30 taxi al T2: 20 km, circa 32 minuti/.test(await dett('d1c')))
  ok('Maremagnum dura fino alle 19:30 (5 h) e sta nello stesso posto del mercato', /5 h/.test(await p.locator('.card[data-stop="d1c"] .chips').innerText()) && /stesso posto/.test(await p.locator('.card[data-stop="d1c"] .chips').innerText()))
  ok('il rientro spiega il piano (taxi da Maremagnum alle 19:30, poi lounge 20:20 e volo 23:05) e il tratto è 20 km · 32 min', /taxi da Maremagnum alle 19:30/.test(await dett('d3')) && /lounge Canudas dalle 20:20, volo alle 23:05/.test(await dett('d3')) && /20,0 km · 32 min/.test(await p.locator('.card[data-stop="d3"] .chips').innerText()))
  const pp = await percorsi(p)
  ok('domenica con pioggia: due percorsi in taxi, Appartamento → Maremagnum e Maremagnum → Terminal 2', pp.length === 2 && pp[0].id === 'dom-mattina' && pp[0].href === 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.3746496,2.1823721&travelmode=driving' && pp[0].testo === 'Appartamento → Maremagnum · 3,0 km · 9 min in taxi' && pp[1].id === 'dom-rientro' && pp[1].href === 'https://www.google.com/maps/dir/?api=1&origin=41.3746496,2.1823721&destination=41.3033401,2.076845&travelmode=driving' && pp[1].testo === 'Maremagnum → Terminal 2 · 20,0 km · 32 min in taxi', JSON.stringify(pp))
  ok('il percorso verso Maremagnum sta sopra il Time Out Market, quello verso il T2 sopra il rientro', await p.evaluate(() => { const sopra = (id) => document.querySelector(`.card[data-stop="${id}"]`)?.closest('li')?.previousElementSibling?.querySelector('.percorso')?.dataset.percorso; return sopra('d1b') === 'dom-mattina' && sopra('d3') === 'dom-rientro' }))
  ok('la stessa preferenza vale per il venerdì', (await p.evaluate(() => localStorage.getItem('b40:v1:piove'))) === 'true')
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  // si spegne: tutto torna come prima
  await p.locator('#piove').uncheck(); await p.waitForTimeout(600)
  ok('spento: il piano normale torna identico', (await ordine(p)) === 'd1 d2 d3' && (await p.locator('[data-avviso-mirador]').count()) === 0)
  await ctx.close()
}
// 2. Oggi, domenica mattina con la pioggia: l'avviso della prenotazione c'è; alle 14 non più, Adesso il mercato
{
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-18T10:00#/oggi', true)
  const avv = p.locator('[data-avviso-mirador]')
  ok('Oggi domenica 10:00 con pioggia: l\'avviso della prenotazione c\'è, col testo esatto e "Chiama"', (await avv.count()) === 1 && (await avv.innerText()).replace(/\s+/g, ' ').trim() === `${AVVISO} Chiama` && (await avv.locator('a').getAttribute('href')) === 'tel:+34931642022')
  ok('Oggi domenica 10:00: l\'avviso è la prima cosa della pagina', await p.evaluate(() => document.querySelector('.view')?.firstElementChild?.hasAttribute('data-avviso-mirador')))
  ok('Oggi domenica 10:00: Prossima = Time Out Market alle 13:00', (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '13:00' && /Time Out Market/.test(await p.locator('.tile:has(.tile__label:text-is("Prossima"))').innerText()))
  ok('Oggi domenica: la timeline del viaggio avverte del piano pioggia (Maremagnum, taxi alle 19:30, arrivo 20:05)', /Maremagnum/.test(await p.locator('.viaggio-oggi .avviso--pioggia').innerText()) && /19:30/.test(await p.locator('.viaggio-oggi .avviso--pioggia').innerText()) && /20:05/.test(await p.locator('.viaggio-oggi .avviso--pioggia').innerText()))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T14:00#/oggi', true)
  ok('Oggi domenica 14:00: Adesso = Time Out Market, col percorso in taxi', (await p.locator('.tile--accent .card').getAttribute('data-stop')) === 'd1b' && (await p.locator('.tile--accent .percorso').getAttribute('data-percorso')) === 'dom-mattina')
  ok('Oggi domenica 14:00: Prossima = Maremagnum alle 14:30', (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '14:30')
  ok('Oggi domenica 14:00: l\'avviso della prenotazione non c\'è più (le 13:30 sono passate)', (await p.locator('[data-avviso-mirador]').count()) === 0)
  ok('Oggi domenica: Mirador e Bunkers non stanno nel piano del giorno', (await p.locator('.timeline .card[data-stop="d1"], .timeline .card[data-stop="d2"]').count()) === 0)
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T10:00#/oggi', false)
  ok('Oggi domenica 10:00 senza pioggia: nessun avviso, Prossima = Mirador 13:30', (await p.locator('[data-avviso-mirador], .viaggio-oggi .avviso--pioggia').count()) === 0 && (await p.locator('.tile:has(.tile__label:text-is("Prossima")) .tile__big').innerText()) === '13:30')
  await ctx.close()
}
// 3. mappa: con la pioggia i marker di domenica sono mercato, Maremagnum e T2; senza, Mirador, Bunkers e T2
for (const [piove, attesi] of [[true, ['Pranzo · Time Out Market', 'Pomeriggio al coperto · Maremagnum', 'Rientro a Bologna']], [false, ['Pranzo · El Mirador', 'Bunkers del Carmel — MUHBA Turó de la Rovira', 'Rientro a Bologna']]]) {
  const { p, ctx } = await apri('ale', '/#/mappa', piove)
  await p.waitForTimeout(800)
  const titoli = []
  const n = await p.locator('.marker[style*="--dom"]').count()
  // mercato e Maremagnum stanno a 70 m: a questo zoom i marker si coprono, quindi il click va dato all'elemento, non alle coordinate
  for (let i = 0; i < n; i++) { await p.locator('.marker[style*="--dom"]').nth(i).dispatchEvent('click'); await p.waitForTimeout(250); titoli.push(await p.locator('.popup__title').last().innerText().catch(() => '?')); await p.evaluate(() => document.querySelector('.leaflet-popup-close-button')?.click()); await p.waitForTimeout(150) }
  ok(`mappa, pioggia ${piove ? 'accesa' : 'spenta'}: i marker di domenica sono ${attesi.length} e sono quelli giusti`, n === attesi.length && attesi.every((t) => titoli.includes(t)), titoli.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK pioggia')
