// QA delle tappe nuove del sabato: il pane da Teixidó fra Olimpo e il bocadillo.
// (BO&MIE, il ritrovo con Giulio, non c'è ancora: la foto è arrivata corrotta, vedi DA_VERIFICARE.md)
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues
const sab = it.days.find((d) => d.label === 'Sabato').stops
const stops = Object.fromEntries(sab.map((s) => [s.id, s]))

// ---- dati ----
const t = venues.teixido
ok('venue: nome, indirizzo e coordinate', t.name === 'Teixidó Barcelona · Forn de Pa' && t.addr === 'Carrer de Nàpols 194, Eixample' && t.lat === 41.3989914 && t.lng === 2.174836)
ok('venue: verificato, orari col sabato fino alle 14, telefono', t.verified === true && /sab 8:00-14:00/.test(t.hours) && t.phone === '+34 686 21 08 40', t.hours)
ok('venue: voto e recensioni', t.rating === 4.6 && t.reviews === 292)
ok('la tappa sta fra Olimpo e il bocadillo', sab.map((s) => s.id).join(' ').includes('s5 s5b s6'), sab.map((s) => s.id).join(' '))
ok('non sta prima della Sagrada', sab.findIndex((s) => s.id === 's5b') > sab.findIndex((s) => s.id === 's4'))
ok('orario e durata', stops.s5b.time === '13:00' && stops.s5b.durataMin === 10)
ok('titolo e perché', stops.s5b.title === 'Il pane, da Teixidó' && /strada del rientro/.test(stops.s5b.why))
ok('il pa de pagès, non la baguette', stops.s5b.details.some((d) => /pa de pagès, non baguette/.test(d)))
ok('le due frasi da dire al banco', stops.s5b.details.some((d) => d.includes('recién horneado')) && stops.s5b.details.some((d) => d.includes('por la mitad a lo largo')))
ok('il piano B è Forn Oriol', stops.s5b.details.some((d) => /Forn Oriol/.test(d) && /69 metri/.test(d)))
ok('la chiusura delle 14:00 è un avviso, non un dettaglio nascosto', /chiude alle 14:00/.test(stops.s5b.avviso || '') && /entro le 13:30/.test(stops.s5b.avviso || ''), stops.s5b.avviso)
ok('da Olimpo: 1.189 m e 15 min a piedi', stops.s5b.distFromPrevM === 1189 && stops.s5b.minFromPrev === 15 && !stops.s5b.distMode)
ok('il bocadillo ora dista 574 m e 7 min da Teixidó', stops.s6.distFromPrevM === 574 && stops.s6.minFromPrev === 7)
ok('il bocadillo dice da dove arriva il pane', stops.s6.details.some((d) => /Pane di Teixidó preso tornando/.test(d)))
ok('foto vera, nessuna card stilizzata', stops.s5b.img === 'teixido.webp')
ok('ci vanno tutti e tre', JSON.stringify(stops.s5b.people) === JSON.stringify(['ale', 'giulio', 'manuel']))

// Il cammino del sabato, sommato qui dai dati: è il numero che il sito deve rispettare
const aPiedi = (s) => s.distMode !== 'auto' && s.distMode !== 'taxi' && s.minFromPrev != null && s.time != null
const visibili = sab.filter((s) => s.people.includes('ale'))
const camminoM = visibili.filter(aPiedi).reduce((n, s) => n + s.distFromPrevM, 0)
const camminoMin = visibili.filter(aPiedi).reduce((n, s) => n + s.minFromPrev, 0)
ok('cammino del sabato ricalcolato con le due tratte nuove', camminoM === 1309 + 527 + 1189 + 574 + 672 + 2823 && camminoMin === 16 + 7 + 15 + 7 + 8 + 34, `${camminoM} m · ${camminoMin} min`)

// ---- nel browser ----
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function vista(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  return { p, ctx, errs }
}
{
  const { p, ctx, errs } = await vista('ale', '/#/programma/sab')
  const ids = await p.evaluate(() => [...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => c.dataset.stop))
  ok('in timeline sta fra Olimpo e il bocadillo', ids.join(' ').includes('s5 s5b s6'), ids.join(' '))
  const card = p.locator('.card[data-stop="s5b"]')
  ok('avviso sulla chiusura visibile senza aprire i dettagli', /chiude alle 14:00/.test(await card.locator('.avviso').innerText()))
  ok('la foto si vede', (await card.locator('.card__foto img').getAttribute('src')).endsWith('teixido.webp'))
  ok('attribuzione: per gentile concessione', (await card.locator('.card__credito').innerText()).trim() === 'foto: per gentile concessione')
  ok('chip della distanza a piedi da Olimpo', /1,2 km · 15 min a piedi/.test(await card.locator('.chips').innerText()), await card.locator('.chips').innerText())
  await card.locator('summary').click(); await p.waitForTimeout(350)
  ok('le frasi in spagnolo si leggono', /recién horneado/.test(await card.innerHTML()))
  ok('niente riquadro del conto sul sabato: non è una mezza giornata', await p.locator('.avviso--forte').count() === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  ok('niente overflow a 380px', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  await ctx.close()
}
{
  const { p, ctx } = await vista('ale', '/#/programma/ven')
  const conto = await p.locator('.avviso--forte').innerText().catch(() => '')
  ok('venerdì: il conto della mezza giornata non è cambiato', /Soste 3 h 45 min \+ cammino 54 min/.test(conto), conto.slice(0, 60))
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
