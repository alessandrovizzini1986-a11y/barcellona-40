// Distanze e tempi tra tappe consecutive, da Valhalla (OpenStreetMap, senza API key).
//
// Perché non OSRM: il server demo router.project-osrm.org ignora il profilo /foot/ e restituisce
// sempre percorsi stradali per auto (verificato: /foot/ e /driving/ danno risultati identici),
// quindi gonfiava tutte le distanze a piedi. Sostituito.
//
// Regole:
// - POST https://valhalla1.openstreetmap.de/route con costing "pedestrian";
//   per le tratte già marcate distMode "auto" o "taxi" si usa costing "auto".
// - distFromPrevM = round(trip.summary.length * 1000)
// - minFromPrev   = round(trip.summary.time / 60)  ← il tempo di Valhalla, non una conversione a 5 km/h.
// - Oltre 5 km a piedi la tratta diventa distMode "auto" e viene ricalcolata con costing "auto".
// - Se Valhalla non risponde: nessun numero inventato. La tappa prende il badge `da_verificare`,
//   finisce in DA_VERIFICARE.md e viene ritentata in coda all'esecuzione.
// - 600 ms tra una chiamata e l'altra.
//
// "Tappa precedente" = la tappa precedente dello stesso giorno che condivide almeno una persona.
import { readJson, writeJson, sleep, updateSection } from './_shared.mjs'

const ENDPOINT = 'https://valhalla1.openstreetmap.de/route'
const UA = 'barcelona40-site'
const GAP_MS = 600
const WALK_MAX_M = 5000

const it = readJson('itinerary.json')
const { venues } = readJson('venues.json')
const coords = (stop) => { const v = venues[stop.venueId]; return v && v.lat != null ? [v.lat, v.lng] : null }

let calls = 0
async function route(a, b, costing) {
  if (calls++) await sleep(GAP_MS)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ locations: [{ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }], costing, units: 'kilometers' })
  })
  if (!res.ok) throw new Error(`Valhalla HTTP ${res.status}`)
  const j = await res.json()
  const s = j.trip?.summary
  if (!s) throw new Error(`Valhalla: ${j.error || 'nessun percorso'}`)
  return { m: Math.round(s.length * 1000), min: Math.round(s.time / 60) }
}

// Tratte da calcolare: distFromPrevM null e coordinate disponibili da entrambi i lati
const jobs = []
for (const day of it.days) {
  for (let i = 0; i < day.stops.length; i++) {
    const stop = day.stops[i]
    if (stop.distFromPrevM != null) continue
    const prev = [...day.stops.slice(0, i)].reverse().find((p) => p.people.some((x) => stop.people.includes(x)))
    if (!prev) { stop.distFromPrevM = null; stop.minFromPrev = null; continue }
    const a = coords(prev), b = coords(stop)
    if (!a || !b) { jobs.push({ stop, prev, skip: 'coordinate mancanti' }); continue }
    if (prev.venueId === stop.venueId) { stop.distFromPrevM = 0; stop.minFromPrev = 0; continue }
    jobs.push({ stop, prev, a, b })
  }
}

const addBadge = (stop) => { if (!stop.badges.includes('da_verificare')) stop.badges.push('da_verificare') }
const dropBadgeIfEarned = (stop) => { /* il badge da_verificare resta: lo tolgono i dati, non lo script */ }

async function attempt(job) {
  const { stop, prev, a, b } = job
  const forced = stop.distMode === 'auto' || stop.distMode === 'taxi'
  let r = await route(a, b, forced ? 'auto' : 'pedestrian')
  let mode = forced ? stop.distMode : 'piedi'
  if (!forced && r.m > WALK_MAX_M) {
    stop.distMode = 'auto'
    r = await route(a, b, 'auto')
    mode = 'auto'
  }
  stop.distFromPrevM = r.m
  stop.minFromPrev = r.min
  console.log(`✓ ${prev.id} → ${stop.id}: ${r.m} m · ${r.min} min (${mode})`)
}

const failures = []
for (const job of jobs) {
  if (job.skip) { failures.push({ ...job, err: job.skip }); continue }
  try { await attempt(job) } catch (e) { failures.push({ ...job, err: e.message }) }
}

// Secondo tentativo per chi non ha risposto
const stillFailing = []
for (const job of failures) {
  if (job.skip) { stillFailing.push(job); continue }
  console.log(`… riprovo ${job.prev.id} → ${job.stop.id}`)
  try { await attempt(job) } catch (e) { stillFailing.push({ ...job, err: e.message }) }
}

const notes = []
for (const job of stillFailing) {
  addBadge(job.stop)
  notes.push(`${job.stop.id} ← ${job.prev.id}: distanza non calcolata (${job.err}). Tappa marcata \`da_verificare\`.`)
  console.log(`✗ ${job.prev.id} → ${job.stop.id}: ${job.err}`)
}

writeJson('itinerary.json', it)
updateSection('distanze', notes)
console.log(`Distanze: ${jobs.length - stillFailing.length} tratte calcolate con Valhalla, ${stillFailing.length} non risolte`)
