// Distanze a piedi tra tappe consecutive (OSRM, profilo foot). Usa SOLO `distance` (metri):
// minFromPrev = round(m / 83.3) → 5 km/h. La `duration` di OSRM non viene usata.
// "Tappa precedente" = la tappa precedente dello stesso giorno che condivide almeno una persona.
// Se la distanza a piedi supera 5 km la tappa viene marcata distMode:"auto" e i minuti restano null
// (non abbiamo una regola verificata per la velocità in auto).
import { readJson, writeJson, sleep, updateSection } from './_shared.mjs'

const it = readJson('itinerary.json')
const { venues } = readJson('venues.json')
const coords = (stop) => { const v = venues[stop.venueId]; return v && v.lat != null ? [v.lng, v.lat] : null }
const notes = []
let calls = 0

async function walk(a, b) {
  const url = `https://router.project-osrm.org/route/v1/foot/${a[0]},${a[1]};${b[0]},${b[1]}?overview=false`
  const res = await fetch(url, { headers: { 'User-Agent': 'barcelona40-site' } })
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
  const j = await res.json()
  if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error(`OSRM ${j.code}`)
  return Math.round(j.routes[0].distance)
}

for (const day of it.days) {
  for (let i = 0; i < day.stops.length; i++) {
    const stop = day.stops[i]
    if (stop.distFromPrevM != null) continue
    const prev = [...day.stops.slice(0, i)].reverse().find((p) => p.people.some((x) => stop.people.includes(x)))
    if (!prev) { stop.distFromPrevM = null; stop.minFromPrev = null; continue }
    const a = coords(prev), b = coords(stop)
    if (!a || !b) { notes.push(`${stop.id} ← ${prev.id}: coordinate mancanti, distanza non calcolata`); continue }
    if (prev.venueId === stop.venueId) { stop.distFromPrevM = 0; stop.minFromPrev = 0; continue }
    try {
      if (calls++) await sleep(300)
      const m = await walk(a, b)
      stop.distFromPrevM = m
      if (m > 5000) { stop.distMode = 'auto'; stop.minFromPrev = null }
      else stop.minFromPrev = Math.round(m / 83.3)
      console.log(`✓ ${prev.id} → ${stop.id}: ${m} m${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min` : ' · auto'}`)
    } catch (e) {
      notes.push(`${stop.id} ← ${prev.id}: OSRM non ha risposto (${e.message})`)
      console.log(`✗ ${prev.id} → ${stop.id}: ${e.message}`)
    }
  }
}
writeJson('itinerary.json', it)
updateSection('distanze', notes)
console.log(`Distanze: ${calls} chiamate OSRM, ${notes.length} problemi`)
