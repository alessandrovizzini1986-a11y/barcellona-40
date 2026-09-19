// QA dei percorsi di mezza giornata e dei due dati corretti (Taps, Bunkers).
// I link sono verificati a mano: qui si controlla che siano copiati alla lettera, non rigenerati.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

// Gli otto link, riscritti qui a mano dal messaggio: se qualcuno li "ripulisce" nel JSON, questo test cade.
const ATTESI = {
  'ven-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.388123,2.1860152&destination=41.386162,2.1786073&travelmode=walking&waypoints=41.3838871,2.1820711|41.3850135,2.1810493|41.383302,2.1764228|41.383452,2.1750541|41.3819198,2.1753751',
  'ven-pomeriggio': 'https://www.google.com/maps/dir/?api=1&origin=41.386162,2.1786073&destination=41.3915035,2.1715182&travelmode=walking&waypoints=41.395437,2.179608|41.4054703,2.1759774',
  'ven-cena': 'https://www.google.com/maps/dir/?api=1&origin=41.3915035,2.1715182&destination=41.3925995,2.1344166&travelmode=transit',
  'sab-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.4066347,2.1799385&travelmode=walking&waypoints=41.4039406,2.1751597',
  'sab-sera': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.3744026,2.1695739&travelmode=walking&waypoints=41.3791891,2.1770567',
  'dom-mattina': 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.4169774,2.1589342&travelmode=transit',
  'dom-pomeriggio': 'https://www.google.com/maps/dir/?api=1&origin=41.4169774,2.1589342&destination=41.4193003,2.1618259&travelmode=walking',
  'dom-rientro': 'https://www.google.com/maps/dir/?api=1&origin=41.4193003,2.1618259&destination=41.3033401,2.076845&travelmode=transit'
}
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues
const stops = Object.fromEntries(it.days.flatMap((d) => d.stops).map((s) => [s.id, s]))
const percorsi = it.days.flatMap((d) => d.percorsi || [])

// ---- dati ----
ok('Taps: nome, indirizzo e coordinate nuovi', venues.taps.name === 'Taps Sagrada Familia' && venues.taps.addr.startsWith('Carrer de Provença 474') && venues.taps.lat === 41.4054703 && venues.taps.lng === 2.1759774, `${venues.taps.lat}, ${venues.taps.lng}`)
ok('Taps: coordinate verificate, niente geocoded', venues.taps.verified === true && venues.taps.geocoded === undefined)
ok('Taps: orari e telefono', /16:30/.test(venues.taps.hours) && venues.taps.phone === '+34 938 09 85 83')
ok('Taps: la tappa non è più da verificare e ha la distanza', stops.f13.badges.join() === 'verificato' && stops.f13.distFromPrevM > 0, `${stops.f13.distFromPrevM} m · ${stops.f13.minFromPrev} min`)
ok('Bunkers: nome MUHBA e orario ufficiale', venues.bunkers.name.includes('MUHBA Turó de la Rovira') && venues.bunkers.hours.includes('16:00–19:00'))
ok('Bunkers: coordinate verificate', venues.bunkers.verified === true && venues.bunkers.lat === 41.4193003 && !venues.bunkers.geocoded)
ok('Bunkers: avviso sull\'apertura', /Aprono alle 16:00, non prima/.test(stops.d2.avviso || ''))
ok('Bunkers: tre ore di sosta, dalle 16:00', stops.d2.durataMin === 180 && stops.d2.time === '16:00')
ok('domenica: nessun arrivo ai Bunkers alle 15:15', !JSON.stringify(it.days[2]).includes('15:15'))

// ---- link ----
ok('otto percorsi in tutto', percorsi.length === 8, String(percorsi.length))
for (const pc of percorsi) ok(`link copiato alla lettera: ${pc.id}`, pc.url === ATTESI[pc.id], pc.url === ATTESI[pc.id] ? '' : pc.url)
ok('ogni percorso punta a tappe vere', percorsi.every((pc) => pc.stops.every((id) => stops[id])))

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
// somma attesa, calcolata qui dai dati e confrontata con quella a schermo
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`)
const fmtMin = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`)
function totale(pc) {
  const dentro = pc.stops.map((id) => stops[id])
  const aPiedi = (s) => s.distMode !== 'auto' && s.distMode !== 'taxi'
  const t = dentro.filter((s) => s.distFromPrevM != null && (pc.mode === 'walking' ? aPiedi(s) : !aPiedi(s)))
  return { m: t.reduce((n, s) => n + s.distFromPrevM, 0), min: t.reduce((n, s) => n + (s.minFromPrev || 0), 0) }
}
for (const [giorno, attesi] of [['ven', ['ven-mattina', 'ven-pomeriggio', 'ven-cena']], ['sab', ['sab-mattina', 'sab-sera']], ['dom', ['dom-mattina', 'dom-pomeriggio', 'dom-rientro']]]) {
  const { p, ctx, errs } = await vista('ale', `/#/programma/${giorno}`)
  const bottoni = await p.evaluate(() => [...document.querySelectorAll('.percorso')].map((a) => ({
    id: a.dataset.percorso, href: a.getAttribute('href'), testo: a.querySelector('small').textContent,
    target: a.getAttribute('target'), rel: a.getAttribute('rel'), aria: a.getAttribute('aria-label')
  })))
  ok(`${giorno}: un pulsante per blocco, in ordine`, JSON.stringify(bottoni.map((x) => x.id)) === JSON.stringify(attesi), bottoni.map((x) => x.id).join(' '))
  ok(`${giorno}: href identici al dato`, bottoni.every((x) => x.href === ATTESI[x.id]))
  ok(`${giorno}: aprono in una scheda nuova, con rel noopener`, bottoni.every((x) => x.target === '_blank' && x.rel === 'noopener'))
  ok(`${giorno}: aria-label esplicito`, bottoni.every((x) => (x.aria || '').startsWith('Apri su Google Maps il percorso ')), bottoni[0]?.aria || '')
  for (const x of bottoni) {
    const pc = percorsi.find((q) => q.id === x.id)
    const t = totale(pc)
    const atteso = pc.mode === 'walking' && t.m ? `${fmtDist(t.m)} · ${fmtMin(t.min)} a piedi` : 'Mezzi pubblici'
    ok(`${x.id}: il totale coincide con la somma delle tappe`, x.testo.includes(atteso), `atteso "${atteso}" · trovato "${x.testo}"`)
  }
  ok(`${giorno}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// Oggi: il percorso della mezza giornata in corso
{
  const { p, ctx } = await vista('ale', '/?now=2026-10-16T10:40#/oggi')
  ok('Oggi · Adesso: il percorso è quello del blocco in corso', (await p.locator('.tile--accent .percorso').getAttribute('data-percorso')) === 'ven-mattina')
  await ctx.close()
}
{
  const { p, ctx } = await vista('ale', '/?now=2026-10-18T16:30#/oggi')
  ok('Oggi · domenica pomeriggio: percorso dei Bunkers', (await p.locator('.tile--accent .percorso').getAttribute('data-percorso')) === 'dom-pomeriggio')
  ok('Oggi · avviso dei Bunkers visibile nella card di adesso', /Aprono alle 16:00/.test(await p.locator('.tile--accent .avviso').innerText()))
  await ctx.close()
}
// Chi non c'è non vede il percorso di quella mezza giornata
{
  const { p, ctx } = await vista('giulio', '/#/programma/ven')
  ok('Giulio, che venerdì non c\'è, non vede i percorsi del venerdì', await p.locator('.percorso').count() === 0)
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
