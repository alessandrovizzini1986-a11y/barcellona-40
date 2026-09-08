// Geocodifica con Nominatim i venue senza coordinate (lat:null).
// Regola: query "<name>, Barcelona", User-Agent custom, 1 richiesta ogni 1100 ms.
// Se il risultato è assente o ambiguo (fuori dall'area di Barcellona) → lat/lng restano null
// e la voce finisce in DA_VERIFICARE.md. I venue con verified:true non vengono toccati.
import { readJson, writeJson, sleep, updateSection } from './_shared.mjs'

const UA = 'barcelona40-site'
// Bounding box generosa dell'area metropolitana di Barcellona (aeroporto incluso)
const BBOX = { latMin: 41.25, latMax: 41.50, lngMin: 2.00, lngMax: 2.30 }
const inBox = (lat, lng) => lat >= BBOX.latMin && lat <= BBOX.latMax && lng >= BBOX.lngMin && lng <= BBOX.lngMax

async function search(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ca,es,it' } })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  return res.json()
}

const data = readJson('venues.json')
const notes = []
let first = true
for (const [id, v] of Object.entries(data.venues)) {
  if (v.verified || (v.lat != null && v.lng != null)) continue
  if (!first) await sleep(1100)
  first = false
  const q = `${v.name}, Barcelona`
  let hit = null, reason = ''
  try {
    const [r] = await search(q)
    if (!r) reason = 'nessun risultato'
    else if (!inBox(+r.lat, +r.lon)) reason = `risultato fuori Barcellona (${r.display_name})`
    else hit = r
    // Fallback: se il nome non risolve ma l'indirizzo ha un civico, prova l'indirizzo.
    // Accettato solo se Nominatim restituisce proprio quel civico (altrimenti è ambiguo).
    if (!hit && /\d/.test(v.addr) && v.addr !== 'Barcelona') {
      await sleep(1100)
      const [a] = await search(v.addr)
      if (a && a.address?.house_number && inBox(+a.lat, +a.lon)) { hit = a; hit._by = 'indirizzo' }
      else reason += `; anche l'indirizzo "${v.addr}" non risolve a un civico preciso`
    }
  } catch (e) {
    reason = `errore rete: ${e.message}`
  }
  if (hit) {
    v.lat = +(+hit.lat).toFixed(7)
    v.lng = +(+hit.lon).toFixed(7)
    v.geocoded = true
    v.geocodedFrom = hit.display_name
    if (hit._by) v.geocodedBy = hit._by
    console.log(`✓ ${id}: ${v.lat}, ${v.lng} ← ${hit.display_name}`)
  } else {
    v.lat = null; v.lng = null; v.geocoded = false
    notes.push(`**${v.name}** (\`${id}\`): coordinate mancanti, ${reason}. Query: "${q}"`)
    console.log(`✗ ${id}: ${reason}`)
  }
}
writeJson('venues.json', data)
const geocoded = Object.entries(data.venues).filter(([, v]) => v.geocoded).map(([id, v]) => `**${v.name}** (\`${id}\`): coordinate automatiche da Nominatim (${v.lat}, ${v.lng}), da controllare sul posto`)
updateSection('geocoding', [...notes, ...geocoded])
console.log(`Geocoding: ${geocoded.length} ok, ${notes.length} mancanti`)
