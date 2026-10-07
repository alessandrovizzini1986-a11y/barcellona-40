// Distanze a piedi dalla tappa al bagno assegnato (data/bagni.json → tappe[id].dist[bagno] = { m, min }).
// Stessa regola di distances.mjs: Valhalla (OpenStreetMap, costing "pedestrian"), metri e minuti di Valhalla,
// 600 ms fra una chiamata e l'altra. Le coordinate dei bagni NON si toccano: sono quelle di Google Places nel JSON.
// Si calcolano solo le coppie che non hanno ancora una distanza: per rifarne una, cancella la voce e rilancia.
//   node scripts/bagni-distanze.mjs
import { readJson, writeJson, sleep } from './_shared.mjs'

const ENDPOINT = 'https://valhalla1.openstreetmap.de/route'
const GAP_MS = 600
const it = readJson('itinerary.json')
const { venues } = readJson('venues.json')
const bagniJson = readJson('bagni.json')
const bagno = Object.fromEntries(bagniJson.bagni.map((b) => [b.id, b]))
const stops = Object.fromEntries(it.days.flatMap((d) => d.stops).map((s) => [s.id, s]))

let calls = 0
async function route(a, b) {
  if (calls++) await sleep(GAP_MS)
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'barcelona40-site' }, body: JSON.stringify({ locations: [{ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }], costing: 'pedestrian', units: 'kilometers' }) })
  if (!res.ok) throw new Error(`Valhalla HTTP ${res.status}`)
  const s = (await res.json()).trip?.summary
  if (!s) throw new Error('Valhalla: nessun percorso')
  return { m: Math.round(s.length * 1000), min: Math.round(s.time / 60) }
}

const errori = []
for (const [id, t] of Object.entries(bagniJson.tappe)) {
  const stop = stops[id]
  if (!stop) { errori.push(`${id}: tappa inesistente`); continue }
  const v = venues[stop.venueId]
  for (const bid of [t.prima, t.seconda].filter((x) => x && bagno[x])) {
    if (t.dist?.[bid]) continue
    if (!v || v.lat == null) { errori.push(`${id}: venue senza coordinate`); continue }
    const b = bagno[bid]
    if (v.lat === b.lat && v.lng === b.lng) { (t.dist ||= {})[bid] = { m: 0, min: 0 }; console.log(`✓ ${id} → ${bid}: stesso posto`); continue }
    try { const r = await route([v.lat, v.lng], [b.lat, b.lng]); (t.dist ||= {})[bid] = r; console.log(`✓ ${id} → ${bid}: ${r.m} m · ${r.min} min`) } catch (e) { errori.push(`${id} → ${bid}: ${e.message}`) }
  }
}
writeJson('bagni.json', bagniJson)
if (errori.length) { console.error('Non calcolate (nessun numero inventato):'); for (const e of errori) console.error('  - ' + e); process.exit(1) }
console.log('bagni-distanze: tutto ok')
