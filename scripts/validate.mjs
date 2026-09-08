// Validazione dati: esce con codice 1 se qualcosa non torna.
import { readJson } from './_shared.mjs'

const ALLOWED_PRICES = [430, 26, 60, 25, 12, 39, 28.5, 22.5, 7.5, 2.9, 3.9, 6, 8.5, 31.15, 65]
const it = readJson('itinerary.json')
const { venues } = readJson('venues.json')
const { people } = readJson('people.json')
const { missions } = readJson('missions.json')
const { checks } = readJson('checks.json')
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

if (errors.length) {
  console.error(`✗ validate: ${errors.length} errori`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`✓ validate: ${stopIds.size} tappe, ${Object.keys(venues).length} venue, ${missions.length} missioni, ${checks.length} check. Tutto ok.`)
