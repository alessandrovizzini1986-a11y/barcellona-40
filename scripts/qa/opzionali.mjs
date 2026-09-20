// QA delle tappe senza orario (il Casino di venerdì e sabato). La regola è una sola: sono un'opzione,
// non un impegno. Quindi non spostano i conti della giornata, non diventano mai "Adesso" né "Prossima",
// stanno in fondo alla timeline sotto la riga tratteggiata, e la spunta "Fatto" resta.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues
const stops = Object.fromEntries(it.days.flatMap((d) => d.stops).map((s) => [s.id, s]))

// ---- dati ----
const casino = venues.casino
ok('venue: nome, indirizzo e coordinate', casino.name === 'Casino Barcelona' && casino.addr.startsWith('Carrer de la Marina 19-21') && casino.lat === 41.3866938 && casino.lng === 2.1970601)
ok('venue: verificato, orari e telefono', casino.verified === true && /24 ore su 24/.test(casino.hours) && casino.phone === '+34 932 25 78 78')
ok('venue: voto e recensioni', casino.rating === 4.0 && casino.reviews === 8232)
for (const id of ['f99', 's99']) {
  const s = stops[id]
  ok(`${id}: nessun orario e nessuna durata`, s.time === null && s.durataMin === null && s.timeStatus === 'opzionale')
  ok(`${id}: titolo e perché`, s.title === 'Casino Barcelona' && /Si decide lì/.test(s.why))
  ok(`${id}: la riga sui documenti è in maiuscolo e dice la regola UE`, s.details.some((d) => d.startsWith('SERVE IL DOCUMENTO ORIGINALE') && /carta d'identità o passaporto/.test(d) && /minori di 18 anni/.test(d)))
  ok(`${id}: aperto 24 ore, minimi, ristorante`, ['Aperto 24 ore', 'Minimi alti', 'ristorante interno'].every((t) => s.details.some((d) => d.includes(t))))
  ok(`${id}: dress code, scarpe sì e infradito no`, s.details.some((d) => /Scarpe da ginnastica sì, infradito e canottiera no/.test(d)))
  ok(`${id}: gli zaini grandi non entrano`, s.details.some((d) => d === 'Zaini grandi non entrano'))
  ok(`${id}: guardaroba a pagamento solo per gli ingombranti`, s.details.some((d) => /Guardaroba a pagamento per valigie/.test(d) && /gratuito per il resto/.test(d)))
  ok(`${id}: niente registrazione online`, s.details.some((d) => /Non ci si registra online/.test(d)))
  ok(`${id}: posteggio taxi davanti all'ingresso`, s.details.some((d) => /Posteggio taxi davanti all'ingresso, Calle Marina 16/.test(d)))
  ok(`${id}: nessun accenno al casinò online`, !/casinobarcelona\.es/i.test(JSON.stringify(s)))
  ok(`${id}: le promozioni sono un dettaglio stimato, col link`, s.detailsStimati.length === 1 && /non è leggibile da qui/.test(s.detailsStimati[0]) && s.detailsStimati[0].includes('https://www.casinobarcelona.com/barcelona/promociones'))
  ok(`${id}: rientro all'appartamento nei dettagli`, s.details.some((d) => /Rientro all'appartamento: 2,1 km · 27 min a piedi/.test(d)))
  ok(`${id}: niente distanza dalla tappa precedente`, s.distFromPrevM === null && s.minFromPrev === null)
  ok(`${id}: foto dell'ingresso`, s.img === 'casino.webp')
  ok(`${id}: maps e taxi attivi`, s.actions.maps === true && s.actions.taxi === true)
}
ok('venerdì: la distanza è quella dalla Braseria', stops.f99.details.some((d) => d === 'Dalla Braseria Sarrià: 8,2 km · 22 min in auto'))
ok('sabato: le distanze sono due, Biarritz e Apolo', stops.s99.details.some((d) => d === 'Dalla Bodega Biarritz: 2,3 km · 28 min a piedi') && stops.s99.details.some((d) => d === 'Da Sala Apolo: 3,3 km · 8 min in auto'))
ok('venerdì è di Alessandro e Monne', JSON.stringify(stops.f99.people) === JSON.stringify(['ale', 'monne']))
ok('sabato è di chi c\'è sabato', JSON.stringify(stops.s99.people) === JSON.stringify(['ale', 'giulio', 'manuel']))
ok('domenica non ce l\'ha: si vola', !it.days[2].stops.some((s) => s.venueId === 'casino'))
ok('avviso zaini solo il venerdì', /Venerdì avete gli zaini/.test(stops.f99.avviso || '') && !stops.s99.avviso)

// ---- nel browser ----
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function vista(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  return { p, ctx, errs }
}
const conto = (p) => p.locator('.avviso--forte').innerText().catch(() => '')

for (const [giorno, id] of [['ven', 'f99'], ['sab', 's99']]) {
  const { p, ctx, errs } = await vista('ale', `/#/programma/${giorno}`)
  const card = p.locator(`.card[data-stop="${id}"]`)
  ok(`${giorno}: la tappa c'è`, await card.count() === 1)
  ok(`${giorno}: è l'ultima della timeline`, (await p.locator('.timeline .card[data-stop]').last().getAttribute('data-stop')) === id)
  // il testo è in maiuscolo via CSS: innerText lo restituisce già trasformato
  ok(`${giorno}: sta sotto la riga tratteggiata "Opzionale"`, /^opzionale$/i.test((await p.locator('.timeline__opzionale').innerText()).trim()), await p.locator('.timeline__opzionale').innerText())
  ok(`${giorno}: la riga tratteggiata viene prima della card`, await p.evaluate((x) => {
    const riga = document.querySelector('.timeline__opzionale'), c = document.querySelector(`.card[data-stop="${x}"]`)
    return !!riga && !!c && (riga.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) > 0
  }, id))
  ok(`${giorno}: il pallino sulla linea del tempo è vuoto`, await p.evaluate((x) => {
    const li = document.querySelector(`.card[data-stop="${x}"]`).closest('li')
    const st = getComputedStyle(li, '::before')
    return li.classList.contains('timeline__opz') && st.borderStyle === 'solid' && st.borderTopWidth === '2px' && /rgba\(0, 0, 0, 0\)|transparent/.test(st.backgroundColor) === false ? st.backgroundColor !== st.borderTopColor : false
  }, id))
  ok(`${giorno}: al posto dell'ora c'è "Se avete voglia"`, (await card.locator('.card__foto-time').innerText()) === 'Se avete voglia')
  ok(`${giorno}: badge OPZIONALE`, (await card.locator('.badge--opzionale').innerText()) === 'OPZIONALE')
  ok(`${giorno}: la spunta "Fatto" c'è`, await card.locator('input[data-done]').count() === 1)
  const avviso = await card.locator('.avviso').innerText().catch(() => '')
  if (giorno === 'ven') ok('ven: avviso zaini in giallo sulla card', /quelli grandi non entrano in sala/.test(avviso), avviso)
  else ok('sab: nessun avviso zaini, gli zaini sono già a casa', avviso === '')
  await card.locator('summary').click(); await p.waitForTimeout(350)
  ok(`${giorno}: la riga sui documenti si legge`, /SERVE IL DOCUMENTO ORIGINALE/.test(await card.innerHTML()))
  const link = card.locator('.card__stimati a')
  ok(`${giorno}: la pagina promozioni è un link vero`, await link.count() === 1 && (await link.getAttribute('href')) === 'https://www.casinobarcelona.com/barcelona/promociones')
  ok(`${giorno}: il link si apre in una scheda nuova`, (await link.getAttribute('target')) === '_blank' && (await link.getAttribute('rel')) === 'noopener')
  ok(`${giorno}: niente HTML finito nel testo`, !/&lt;a |&amp;lt;/.test(await card.innerHTML()))
  ok(`${giorno}: niente errori JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// I conti della giornata non si muovono: si confrontano con quelli calcolati qui, senza il Casino
{
  const { p, ctx } = await vista('ale', '/#/programma/ven')
  const testo = await conto(p)
  ok('venerdì: il conto della giornata resta quello della mattina', /Soste 3 h 45 min \+ cammino 54 min/.test(testo), testo)
  ok('venerdì: il conto non nomina il Casino', !/Casino/i.test(testo))
  ok('venerdì: intestazione "15 tappe · 1 opzionale"', /15 tappe · 1 opzionale/.test(await p.locator('.day-head .faint').innerText()), await p.locator('.day-head .faint').innerText())
  await ctx.close()
}

// Oggi: mai "Adesso", mai "Prossima", nemmeno a notte fonda quando sarebbe l'unica rimasta
for (const [quando, atteso] of [['2026-10-16T21:30', 'f15'], ['2026-10-17T02:00', 'f15'], ['2026-10-18T01:00', 's9']]) {
  const { p, ctx } = await vista('ale', `/?now=${quando}#/oggi`)
  const adesso = await p.locator('.tile--accent .card[data-stop]').getAttribute('data-stop').catch(() => null)
  const prossima = await p.locator('.tile:nth-child(2) .tile__big').innerText().catch(() => '')
  ok(`${quando}: "Adesso" non è mai il Casino`, adesso !== 'f99' && adesso !== 's99', String(adesso))
  ok(`${quando}: "Adesso" è la tappa vera`, adesso === atteso, String(adesso))
  ok(`${quando}: "Prossima" non dice "Se avete voglia"`, !/voglia/i.test(prossima), prossima)
  await ctx.close()
}
// Il progresso conta il piano, non le opzioni
{
  const { p, ctx } = await vista('ale', '/?now=2026-10-16T21:30#/oggi')
  const prog = await p.locator('#progress').innerText()
  ok('progresso: il denominatore di oggi è 15, non 16', /\b15\b/.test(prog) && !/\b16\b/.test(prog), prog.replace(/\n/g, ' '))
  const lista = await p.locator('.timeline .card[data-stop]').last().getAttribute('data-stop')
  ok('oggi: il Casino è in fondo anche nella lista "Oggi per te"', lista === 'f99')
  await ctx.close()
}
// Mappa: il marker c'è, senza numero, e la linea del giro non ci passa
{
  const { p, ctx } = await vista('ale', '/#/mappa')
  await p.waitForTimeout(1200)
  ok('mappa: un marker senza numero', await p.locator('.marker--opz').count() >= 1)
  ok('mappa: i marker numerati restano quelli del piano', !(await p.locator('.marker--opz span').count()))
  await ctx.close()
}
// Il riepilogo da copiare è il piano, non le opzioni
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await ctx.newPage()
  await p.goto(base + '/')
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('ale')) })
  await p.goto(base + '/?now=2026-10-16T21:30#/oggi', { waitUntil: 'networkidle' })
  await p.waitForTimeout(400)
  await p.locator('#copy').click()
  await p.waitForTimeout(300)
  const testo = await p.evaluate(() => navigator.clipboard.readText())
  ok('riepilogo: contiene le tappe vere', /Ciutadella|Braseria/i.test(testo), testo.split('\n')[1] || '')
  ok('riepilogo: nessuna riga del Casino', !/Casino/i.test(testo))
  ok('riepilogo: nessuna riga senza orario', testo.split('\n').slice(1).every((r) => /^\d{2}:\d{2} /.test(r)), testo.split('\n').filter((r) => r && !/^(📍|\d{2}:\d{2} )/.test(r)).join(' | '))
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
