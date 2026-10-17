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
// appartamento→BO&MIE, BO&MIE→Sagrada, Sagrada→Olimpo, Olimpo→Teixidó, Teixidó→casa, casa→pomeriggio (la cena è in taxi: non si cammina)
ok('cammino del sabato ricalcolato con le tappe nuove', camminoM === 1291 + 162 + 527 + 1189 + 574 + 672 && camminoMin === 16 + 2 + 7 + 15 + 7 + 8, `${camminoM} m · ${camminoMin} min`)

// ---- BO&MIE: il ritrovo con Giulio ----
const bm = venues.bomie
ok('BO&MIE: nome, indirizzo e coordinate', bm.name === 'BO&MIE Barcelona' && bm.addr === 'Carrer de Provença 433, Eixample' && bm.lat === 41.4041701 && bm.lng === 2.1736931)
ok('BO&MIE: verificato, orari e telefono', bm.verified === true && /8:30-20:30/.test(bm.hours) && bm.phone === '+34 934 84 74 60')
ok('BO&MIE: voto e recensioni', bm.rating === 4.4 && bm.reviews === 2657)
ok('sta fra l\'uscita di casa e la Sagrada', sab.map((s) => s.id).join(' ').includes('s3c s4'), sab.map((s) => s.id).join(' '))
ok('orario e durata: 09:45 per mezz\'ora', stops.s3c.time === '09:45' && stops.s3c.durataMin === 30)
// 09:45 + 30 di sosta + 2 di strada = 10:17, contro un ingresso alle 10:30: il margine è quello, calcolato
ok('margine vero prima della Sagrada: 13 minuti', (() => {
  const [h, m] = stops.s3c.time.split(':').map(Number)
  const fine = h * 60 + m + stops.s3c.durataMin + stops.s4.minFromPrev
  const ingresso = 10 * 60 + 30
  return ingresso - fine === 13
})())
ok('la card dice quanto margine c\'è e cosa accorciare', stops.s3c.details.some((d) => /Tredici minuti di margine/.test(d) && /non la Sagrada/.test(d)))
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

// ---- cena dei 40: Local Tapas (dal 17/10, al posto della Bodega Biarritz) ----
const b8 = venues.localtapas
ok('Local Tapas: indirizzo, coordinate di Google Places, telefono', b8.addr === "Carrer d'Aribau 37, Eixample Esquerra" && b8.lat === 41.3876228 && b8.lng === 2.1602109 && b8.verified === true && b8.phone === '+34 645 58 15 09')
ok('Local Tapas: voto, recensioni, fascia, orari', b8.rating === 4.7 && b8.reviews === 12026 && b8.fascia === '€€' && /13:00–24:00/.test(b8.hours) && /cucina fino a mezzanotte/.test(b8.hours))
ok('cena: stesso orario (19:30), prenotata per 3, verificata', stops.s8.time === '19:30' && stops.s8.timeStatus === 'verificato' && stops.s8.prenotazione === '19:30 · 3 persone' && stops.s8.details.some((d) => /Prenotato: sabato 17 alle 19:30, 3 persone/.test(d)))
ok('cena: in taxi da casa (2,5 km · 8 min), col blocco da dare al tassista', stops.s8.distMode === 'taxi' && stops.s8.distFromPrevM === 2521 && stops.s8.minFromPrev === 8 && stops.s8.tassista?.indirizzo === "Carrer d'Aribau, 37 · 08011 Barcelona" && /dropoff\[latitude\]=41\.3876228&dropoff\[longitude\]=2\.1602109/.test(stops.s8.tassista.uber))
ok('cena: il consiglio dalle recensioni, con Said o David', /tartare di manzo galiziano/.test(stops.s8.consiglio) && /Chiedi di Said o David/.test(stops.s8.consiglio))
ok('cena: il budget sta fra gli stimati', stops.s8.detailsStimati.some((d) => /circa 30 € a testa/.test(d)) && !stops.s8.details.some((d) => /30 €/.test(d)))
ok('cena: verso Apolo oltre 1,2 km, taxi consigliato; s9 prende la tratta nuova', stops.s8.details.some((d) => /Verso Sala Apolo: 2,0 km · 23 min a piedi, taxi consigliato/.test(d)) && stops.s9.distFromPrevM === 4088 && stops.s9.minFromPrev === 14 && stops.s9.distMode === 'taxi')
ok('cena: telefono cliccabile e foto del locale', stops.s8.actions.tel === true && stops.s8.img === 'localtapas.webp')
ok('niente più Biarritz nel programma, nei venue e nelle missioni', !JSON.stringify(it).includes('Biarritz') && !venues.biarritz && JSON.parse(readFileSync('data/missions.json', 'utf8')).missions.find((m) => m.id === 'm9').title === 'Compleanno a Local Tapas')
ok('il percorso di sabato sera è in taxi: casa → Local Tapas → Apolo', (() => { const d = it.days.find((x) => x.label === 'Sabato').percorsi.find((x) => x.id === 'sab-sera'); return d.mode === 'driving' && d.label === 'Appartamento → Local Tapas → Sala Apolo' && d.url === 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.3744026,2.1695739&travelmode=driving&waypoints=41.3876228,2.1602109' })())
// il pomeriggio di sabato non insegue più eventi che nessuno ha confermato
ok('pomeriggio libero: niente eventi non confermati', stops.s7.title === 'Pomeriggio libero' && !JSON.stringify(stops.s7).includes('NON confermato') && !/SOUNDIT|Resident Advisor/.test(JSON.stringify(stops.s7)))
ok('pomeriggio libero: badge stimato, non da verificare', JSON.stringify(stops.s7.badges) === JSON.stringify(['stimato']))
ok('nessuna tappa porta più il badge da_verificare (tranne Casa Batlló, finché il biglietto non è comprato)', !sab.concat(it.days.flatMap((d) => d.stops)).some((s) => s.id !== 'd0' && (s.badges || []).includes('da_verificare')))
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
  ok('niente riquadro del conto sul sabato: non è una mezza giornata (gli avvisi di allerta non contano)', await p.locator('.avviso--forte:not(.avviso--allerta)').count() === 0)
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
  ok('cena: foto del locale con il credito "foto: Local Tapas", badge PRENOTATO · 19:30 · 3 persone', (await cena.locator('.card__foto img').getAttribute('src')).endsWith('localtapas.webp') && (await cena.locator('.card__credito').innerText()).trim() === 'foto: Local Tapas' && /PRENOTATO · 19:30 · 3 PERSONE/i.test(await cena.locator('.badge--prenotato').innerText()))
  ok('cena: telefono cliccabile, Bolt e Uber, blocco "Da dare al tassista" con Aribau 37', (await cena.locator('a[data-tel]').getAttribute('href')) === 'tel:+34645581509' && (await cena.locator('[data-taxi-bolt]').count()) === 1 && (await cena.locator('[data-taxi-uber]').count()) === 1 && /Carrer d'Aribau, 37/.test(await cena.locator('.tassista__addr').innerText()))
  ok('cena: chip del taxi 2,5 km · 8 min e il consiglio in terracotta', /2,5 km · 8 min/.test(await cena.locator('.chips').innerText()) && /Said o David/.test(await cena.locator('.card__consiglio').innerText()))
  await cena.locator('summary').click(); await p.waitForTimeout(350)
  ok('cena: nei dettagli la prenotazione, gli orari e il taxi consigliato verso Apolo', /Prenotato: sabato 17 alle 19:30/.test(await cena.innerHTML()) && /cucina fino a mezzanotte/.test(await cena.innerHTML()) && /taxi consigliato/.test(await cena.innerHTML()))
  ok('cena: indirizzo vero sotto il titolo', /Carrer d'Aribau 37/.test(await cena.locator('.card__venue').innerText()))
  ok('cena: niente overflow a 380px', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0)
  ok('cena: nessuna traccia di Biarritz nella pagina di sabato', !/Biarritz/.test(await p.locator('.timeline').innerText()))
  await ctx.close()
}
// Oggi alle 19:45 di sabato: "Adesso" è la cena da Local Tapas
{
  const { p, ctx, errs } = await vista('ale', '/?now=2026-10-17T19:45#/oggi')
  ok('Oggi 19:45: Adesso = Local Tapas', (await p.locator('.tile--accent .card[data-stop]').getAttribute('data-stop').catch(() => null)) === 's8' && /Local Tapas/.test(await p.locator('.tile--accent .card__title').innerText().catch(() => '')))
  ok('Oggi 19:45: nessun errore JS', errs.length === 0, errs.join(' | '))
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
  ok('venerdì: il conto della mezza giornata non è cambiato', /Soste 4 h 10 min \+ cammino 1 h 2 min/.test(conto), conto.slice(0, 60))
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
