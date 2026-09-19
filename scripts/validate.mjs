// Validazione dati: esce con codice 1 se qualcosa non torna.
import { readJson } from './_shared.mjs'
import { existsSync, statSync } from 'node:fs'

const ALLOWED_PRICES = [430, 26, 60, 25, 12, 39, 28.5, 22.5, 7.5, 2.9, 3.9, 6, 8.5, 31.15, 65]
const it = readJson('itinerary.json')
const { venues } = readJson('venues.json')
const { people } = readJson('people.json')
const { missions } = readJson('missions.json')
const { checks } = readJson('checks.json')
const viaggio = readJson('viaggio.json')
const errors = []
const personIds = new Set(people.map((p) => p.id))
const stopIds = new Set()
let seenS2 = false

for (const day of it.days) {
  for (const stop of day.stops) {
    stopIds.add(stop.id)
    const v = venues[stop.venueId]
    if (!v) errors.push(`${stop.id}: venueId "${stop.venueId}" inesistente`)
    if (!Array.isArray(stop.badges) || stop.badges.length === 0) errors.push(`${stop.id}: nessun badge`)
    if (v && (v.lat == null || v.lng == null) && !(stop.badges || []).includes('da_verificare')) errors.push(`${stop.id}: venue "${stop.venueId}" senza coordinate e stop non marcato da_verificare`)
    for (const p of stop.prices || []) if (!ALLOWED_PRICES.includes(p.eur)) errors.push(`${stop.id}: prezzo ${p.eur} (${p.label}) non presente nell'elenco ammesso`)
    for (const p of stop.people || []) if (!personIds.has(p)) errors.push(`${stop.id}: persona "${p}" sconosciuta`)
    if (!/^\d{2}:\d{2}$/.test(stop.time)) errors.push(`${stop.id}: orario "${stop.time}" non valido`)
    if (!['verificato', 'stimato', 'da_verificare'].includes(stop.timeStatus)) errors.push(`${stop.id}: timeStatus "${stop.timeStatus}" non valido`)
    if (stop.id === 's2') seenS2 = true
    else if (seenS2 && stop.people.includes('monne')) errors.push(`${stop.id}: Monne è già partito (tappa dopo s2)`)
  }
}
for (const m of missions) if (m.stopId != null && !stopIds.has(m.stopId)) errors.push(`missione ${m.id}: stopId "${m.stopId}" inesistente`)
for (const m of missions) for (const p of m.people) if (!personIds.has(p)) errors.push(`missione ${m.id}: persona "${p}" sconosciuta`)
for (const c of checks) if (c.stopId != null && !stopIds.has(c.stopId)) errors.push(`check ${c.id}: stopId "${c.stopId}" inesistente`)
for (const c of checks) if (!personIds.has(c.who)) errors.push(`check ${c.id}: persona "${c.who}" sconosciuta`)
for (const p of people) for (const s of p.skips) if (!stopIds.has(s) && s !== 'f9') errors.push(`persona ${p.id}: skip "${s}" inesistente`)

// Viaggio: voli, parcheggio, lounge e i due percorsi. Il QR del parcheggio deve esistere ed essere un PNG:
// è l'unica cosa che alla colonnina non può mancare.
const BADGE_OK = ['verificato', 'stimato', 'da_verificare']
const oraOk = (t) => /^\d{2}:\d{2}$/.test(t)
for (const v of viaggio.voli) {
  for (const k of ['volo', 'partenza', 'arrivo', 'prenotazione', 'data']) if (!v[k]) errors.push(`volo ${v.id}: manca "${k}"`)
  if (!oraOk(v.partenza) || !oraOk(v.arrivo)) errors.push(`volo ${v.id}: orari "${v.partenza}"/"${v.arrivo}" non validi`)
  for (const b of v.badges || []) if (!BADGE_OK.includes(b)) errors.push(`volo ${v.id}: badge "${b}" non valido`)
  for (const p of v.persone || []) if (!personIds.has(p)) errors.push(`volo ${v.id}: persona "${p}" sconosciuta`)
}
const qr = 'public/' + viaggio.parcheggio.qr
if (!existsSync(qr)) errors.push(`parcheggio: QR mancante (${qr})`)
else if (statSync(qr).size < 1000) errors.push(`parcheggio: QR troppo piccolo per essere l'immagine giusta (${qr})`)
if (!viaggio.parcheggio.didascalia.includes(viaggio.parcheggio.prenotazione)) errors.push('parcheggio: la didascalia sotto il QR non riporta il codice prenotazione')
for (const [key, t] of Object.entries(viaggio.timeline)) {
  if (!['ven', 'sab', 'dom'].includes(key)) errors.push(`timeline "${key}": giorno sconosciuto`)
  for (const p of t.persone || []) if (!personIds.has(p)) errors.push(`timeline ${key}: persona "${p}" sconosciuta`)
  let prec = -1
  for (const s of t.step) {
    if (!oraOk(s.ora)) errors.push(`timeline ${key}, passo ${s.id}: orario "${s.ora}" non valido`)
    const [h, m] = s.ora.split(':').map(Number)
    const min = h * 60 + m + (s.giornoDopo ? 1440 : 0)
    if (min < prec) errors.push(`timeline ${key}, passo ${s.id}: orario fuori sequenza (${s.ora})`)
    prec = min
  }
}
const chiaveOk = /^[a-z:]+$/.test(viaggio.checklist.chiave)
if (!chiaveOk) errors.push(`checklist: chiave "${viaggio.checklist.chiave}" non valida`)

if (errors.length) {
  console.error(`✗ validate: ${errors.length} errori`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`✓ validate: ${stopIds.size} tappe, ${Object.keys(venues).length} venue, ${missions.length} missioni, ${checks.length} check, ${viaggio.voli.length} voli, ${Object.values(viaggio.timeline).reduce((n, t) => n + t.step.length, 0)} passi di viaggio. Tutto ok.`)
