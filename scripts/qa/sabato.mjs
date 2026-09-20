// QA delle due tappe nuove del sabato: il caffè con Giulio da BO&MIE prima della Sagrada,
// e il pane da Teixidó fra Olimpo e il bocadillo.
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
// appartamento→BO&MIE, BO&MIE→Sagrada, Sagrada→Olimpo, Olimpo→Teixidó, Teixidó→casa, casa→pomeriggio, →cena
ok('cammino del sabato ricalcolato con le tappe nuove', camminoM === 1291 + 162 + 527 + 1189 + 574 + 672 + 2823 && camminoMin === 16 + 2 + 7 + 15 + 7 + 8 + 34, `${camminoM} m · ${camminoMin} min`)

// ---- BO&MIE: il ritrovo con Giulio ----
const bm = venues.bomie
ok('BO&MIE: nome, indirizzo e coordinate', bm.name === 'BO&MIE Barcelona' && bm.addr === 'Carrer de Provença 433, Eixample' && bm.lat === 41.4041701 && bm.lng === 2.1736931)
ok('BO&MIE: verificato, orari e telefono', bm.verified === true && /8:30-20:30/.test(bm.hours) && bm.phone === '+34 934 84 74 60')
ok('BO&MIE: voto e recensioni', bm.rating === 4.4 && bm.reviews === 2657)
ok('sta fra l\'uscita di casa e la Sagrada', sab.map((s) => s.id).join(' ').includes('s3c s4'), sab.map((s) => s.id).join(' '))
ok('orario e durata: 09:55 per mezz\'ora', stops.s3c.time === '09:55' && stops.s3c.durataMin === 30)
ok('titolo e perché', stops.s3c.title === 'Caffè con Giulio · BO&MIE' && /prima di entrare/.test(stops.s3c.why))
ok('dice che Giulio è già atterrato e ha fatto il check-in', stops.s3c.details.some((d) => /atterrato alle 7:40/.test(d) && /check-in/.test(d)))
ok('dice i 162 m dall\'ingresso di Carrer de la Marina', stops.s3c.details.some((d) => /162 m/.test(d) && /Carrer de la Marina/.test(d)))
ok('dice che è piccola e si sta in piedi', stops.s3c.details.some((d) => /in piedi al bancone/.test(d)))
ok('dall\'appartamento: 1.291 m e 16 min a piedi', stops.s3c.distFromPrevM === 1291 && stops.s3c.minFromPrev === 16 && !stops.s3c.distMode)
ok('ci vanno solo Alessandro e Giulio', JSON.stringify(stops.s3c.people) === JSON.stringify(['ale', 'giulio']))
ok('foto vera', stops.s3c.img === 'bomie.webp')
ok('la Sagrada ora dista 162 m e 2 min, da BO&MIE', stops.s4.distFromPrevM === 162 && stops.s4.minFromPrev === 2)
ok('la Sagrada dice da dove si arriva', stops.s4.details.some((d) => /Due minuti da BO&MIE/.test(d)))
ok('il percorso della mattina comprende BO&MIE', it.days.find((d) => d.label === 'Sabato').percorsi.find((p) => p.id === 'sab-mattina').stops.join() === 's3c,s4,s5')
ok('Forn Oriol: dati verificati nella riga del piano B', stops.s5b.details.some((d) => /Forn Oriol, Carrer de Nàpols 113/.test(d) && /6:30-21:00/.test(d) && /938 74 77 54/.test(d)))

// ---- cena dei 40: Bodega Biarritz ----
const b8 = venues.biarritz
ok('Biarritz: indirizzo e coordinate verificate via Google Places', b8.addr === 'Carrer Nou de Sant Francesc 7, Ciutat Vella' && b8.lat === 41.3791891 && b8.lng === 2.1770567)
ok('Biarritz: niente più coordinate automatiche', b8.verified === true && b8.geocoded === undefined && b8.geocodedFrom === undefined)
ok('Biarritz: voto e recensioni', b8.rating === 4.7 && b8.reviews === 9353)
ok('Biarritz: orari col martedì e mercoledì chiuso', /gio-lun 12:30-23:00/.test(b8.hours) && /martedì e mercoledì chiuso/.test(b8.hours), b8.hours)
ok('cena: si sceglie la fascia di prezzo, non i piatti', stops.s8.details.some((d) => /fascia di prezzo prima di entrare/.test(d) && /a sorpresa/.test(d)))
ok('cena: la recensione col conto in due', stops.s8.details.some((d) => /8 tapas/.test(d) && /70 euro in due/.test(d)))
ok('cena: sabato 17 è dentro la finestra di apertura', stops.s8.details.some((d) => /sabato 17 siete nella finestra giusta/.test(d)))
ok('cena: nessun badge di coordinate automatiche', !stops.s8.badges.includes('geocoded'))
// Nessun venue del sito ha più coordinate automatiche
ok('nessun venue geocodificato in tutto il sito', !Object.values(venues).some((v) => v.geocoded))

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
  const { p, ctx } = await vista('ale', '/#/programma/sab')
  const bomie = p.locator('.card[data-stop="s3c"]')
  ok('BO&MIE: la card c\'è, prima della Sagrada', await bomie.count() === 1 && await p.evaluate(() => {
    const ids = [...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => c.dataset.stop)
    return ids.indexOf('s3c') === ids.indexOf('s4') - 1
  }))
  ok('BO&MIE: la foto si vede', (await bomie.locator('.card__foto img').getAttribute('src')).endsWith('bomie.webp'))
  ok('BO&MIE: per gentile concessione', (await bomie.locator('.card__credito').innerText()).trim() === 'foto: per gentile concessione')
  ok('BO&MIE: mezz\'ora e 1,3 km a piedi nei chip', /30 min/.test(await bomie.locator('.chips').innerText()) && /1,3 km · 16 min a piedi/.test(await bomie.locator('.chips').innerText()), await bomie.locator('.chips').innerText())
  ok('Sagrada: chip dei 162 m', /162 m · 2 min a piedi/.test(await p.locator('.card[data-stop="s4"] .chips').innerText()))
  await ctx.close()
}
{
  const { p, ctx } = await vista('manuel', '/#/programma/sab')
  const ids = await p.evaluate(() => [...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => c.dataset.stop))
  ok('Manuel non vede BO&MIE né la Sagrada: va dritto a Olimpo', !ids.includes('s3c') && !ids.includes('s4') && ids.includes('s5'), ids.join(' '))
  await ctx.close()
}
{
  const { p, ctx } = await vista('ale', '/#/programma/sab')
  const cena = p.locator('.card[data-stop="s8"]')
  ok('cena: nessun badge "coordinate automatiche" sulla card', await cena.locator('.badge--geocoded').count() === 0)
  await cena.locator('summary').click(); await p.waitForTimeout(350)
  ok('cena: la fascia di prezzo si legge nei dettagli', /fascia di prezzo prima di entrare/.test(await cena.innerHTML()))
  ok('cena: indirizzo vero sotto il titolo', /Carrer Nou de Sant Francesc 7/.test(await cena.locator('.card__venue').innerText()))
  await ctx.close()
}
{
  const { p, ctx } = await vista('ale', '/#/info/verifiche')
  await p.waitForTimeout(300)
  ok('Info: resta una sola voce da verificare', (await p.locator('#sec-verifiche input[data-check]').count()) === 1, String(await p.locator('#sec-verifiche input[data-check]').count()))
  ok('Info: è il civico della Braseria', (await p.locator('#sec-verifiche input[data-check]').getAttribute('data-check')) === 'c9')
  await ctx.close()
}
{
  const { p, ctx } = await vista('ale', '/#/programma/dom')
  const rientro = p.locator('.card[data-stop="d3"]')
  ok('rientro: niente più badge da verificare', await rientro.locator('.badge--da_verificare').count() === 0)
  ok('rientro: il badge è stimato', await rientro.locator('.badge--stimato').count() === 1)
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
