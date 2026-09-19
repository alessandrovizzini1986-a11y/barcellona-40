// Accesso ai dati: itinerario appiattito, venue, persone, missioni, check. Nessun dato inventato qui:
// tutto arriva dai JSON in /data.
import itinerary from '../data/itinerary.json'
import peopleJson from '../data/people.json'
import venuesJson from '../data/venues.json'
import missionsJson from '../data/missions.json'
import checksJson from '../data/checks.json'
import { stopDate, pad2 } from './time.js'
import { store } from './store.js'

export const days = itinerary.days
export const venues = venuesJson.venues
export const people = peopleJson.people
export const missions = missionsJson.missions
export const levels = missionsJson.levels
export const badgeDefs = missionsJson.badges
export const checks = checksJson.checks

export const DAY_KEY = { '2026-10-16': 'ven', '2026-10-17': 'sab', '2026-10-18': 'dom' }
export const DAY_COLOR = { ven: 'var(--ven)', sab: 'var(--sab)', dom: 'var(--dom)' }

// Tappe appiattite, con riferimento al giorno e data assoluta
export const stops = days.flatMap((day, di) => day.stops.map((s, i) => ({
  ...s,
  day,
  dayKey: DAY_KEY[day.date],
  order: i + 1,
  dayIndex: di,
  at: stopDate(s, day.date),
  venue: venues[s.venueId] || null
}))).sort((a, b) => a.at - b.at)

// MODALITÀ PIOGGIA. Ottobre è il mese più piovoso a Barcellona e il venerdì mattina sta quasi tutto
// all'aperto: col toggle acceso entra El Born CCM (al coperto), la Ciutadella scende a un quarto d'ora e
// TUTTI gli orari successivi si ricalcolano a cascata dalle durate. Nessun orario di pioggia è scritto a mano.
export const piove = () => !!store.get('piove', false)
const oraDi = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
export const durataDi = (s) => (piove() && s.durataPioggiaMin != null ? s.durataPioggiaMin : s.durataMin)

// Cascata su un giorno solo: si parte dall'orario della prima tappa con durata e si somma
// durata + minuti di cammino fino alla tappa dopo. Si ferma dove la catena delle durate finisce:
// il check-in delle 15:00 e la sera restano dove sono, perché non dipendono da quanto ci metti la mattina.
function ricalcola(giorno) {
  const out = giorno.map((s) => (s.distPioggia ? { ...s, distFromPrevM: s.distPioggia.m, minFromPrev: s.distPioggia.min } : { ...s }))
  const i0 = out.findIndex((s) => s.durataMin != null)
  if (i0 < 0) return out
  let t = new Date(out[i0].at)
  for (let i = i0; i < out.length && out[i].durataMin != null; i++) {
    out[i].at = new Date(t)
    out[i].time = oraDi(t)
    t = new Date(t.getTime() + (durataDi(out[i]) + (out[i + 1]?.minFromPrev || 0)) * 60000)
  }
  return out
}
function conPioggia(list) {
  const giorni = [...new Set(list.map((s) => s.dayKey))]
  return giorni.flatMap((k) => ricalcola(list.filter((s) => s.dayKey === k))).sort((a, b) => a.at - b.at)
}

// Conto della mattina: soste, cammino e margine, tutti calcolati dalle durate reali (mai scritti a mano).
// La finestra va dalla prima tappa con durata alla tappa subito dopo la catena (il rientro verso casa).
export function contoDelGiorno(giorno) {
  const i0 = giorno.findIndex((s) => s.durataMin != null)
  if (i0 < 0) return null
  let i1 = i0
  while (i1 + 1 < giorno.length && giorno[i1 + 1].durataMin != null) i1++
  const catena = giorno.slice(i0, i1 + 1)
  const dopo = giorno[i1 + 1] || null
  const soste = catena.reduce((n, s) => n + durataDi(s), 0)
  // il primo arrivo non si conta: alla Ciutadella ci si arriva dall'aeroporto, non a piedi
  const cammino = catena.slice(1).reduce((n, s) => n + (s.minFromPrev || 0), 0) + (dopo?.minFromPrev || 0)
  const finestra = dopo ? Math.round((dopo.at - catena[0].at) / 60000) : soste + cammino
  return { inizio: catena[0].time, fine: dopo ? dopo.time : null, soste, cammino, finestra, margine: finestra - soste - cammino, tappe: catena.length }
}

export const stopById = (id) => stops.find((s) => s.id === id) || null
export const personById = (id) => people.find((p) => p.id === id) || null
export const missionByStop = (stopId) => missions.find((m) => m.stopId === stopId) || null

// Tappe visibili per una persona (people della tappa + skips della persona)
export function stopsFor(personId) {
  const p = personById(personId)
  const pioggia = piove()
  let list = stops.filter((s) => !s.soloPioggia || pioggia)
  if (p) list = list.filter((s) => s.people.includes(personId) && !p.skips.includes(s.id))
  if (pioggia) list = conPioggia(list)
  return numera(list)
}
// Il numero della tappa (quello dei marker sulla mappa) conta solo quelle che vedi davvero:
// senza pioggia El Born non c'è, e la numerazione non deve saltare un numero.
function numera(list) {
  const conta = {}
  return list.map((s) => ({ ...s, order: (conta[s.dayKey] = (conta[s.dayKey] || 0) + 1) }))
}
export function stopsForDay(personId, dayKey) { return stopsFor(personId).filter((s) => s.dayKey === dayKey) }
export function missionsFor(personId) { return missions.filter((m) => m.people.includes(personId)) }

export const hasCoords = (stop) => !!(stop.venue && stop.venue.lat != null && stop.venue.lng != null)

// Badge relativo alle coordinate, derivato dallo stato reale del venue
export function coordsBadge(stop) {
  if (!stop.venue) return 'da_verificare'
  if (stop.venue.verified) return null
  if (stop.venue.geocoded) return 'geocoded'
  return 'da_verificare'
}
// Badge da mostrare sulla card: quelli dichiarati + quello delle coordinate, senza duplicati
export function badgesFor(stop) {
  const set = new Set(stop.badges || [])
  const cb = coordsBadge(stop)
  if (cb) set.add(cb)
  if (stop.venue?.verified) set.delete('geocoded')
  return [...set]
}

export function fmtDist(m) {
  if (m == null) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}
export function fmtEur(n) { return `€${Number.isInteger(n) ? n : String(n).replace('.', ',')}` }

export function mapsUrl(stop) {
  if (!hasCoords(stop)) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.venue?.name + ', ' + (stop.venue?.addr || 'Barcelona'))}`
  const mode = stop.distMode === 'auto' || stop.distMode === 'taxi' ? 'driving' : 'walking'
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.venue.lat},${stop.venue.lng}&travelmode=${mode}`
}
export function taxiUrl(stop) {
  if (!hasCoords(stop)) return 'https://www.freenow.com'
  return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${stop.venue.lat}&dropoff[longitude]=${stop.venue.lng}`
}
export const TAXI_FALLBACK = 'https://www.freenow.com'
