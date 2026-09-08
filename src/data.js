// Accesso ai dati: itinerario appiattito, venue, persone, missioni, check. Nessun dato inventato qui:
// tutto arriva dai JSON in /data.
import itinerary from '../data/itinerary.json'
import peopleJson from '../data/people.json'
import venuesJson from '../data/venues.json'
import missionsJson from '../data/missions.json'
import checksJson from '../data/checks.json'
import { stopDate } from './time.js'

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

export const stopById = (id) => stops.find((s) => s.id === id) || null
export const personById = (id) => people.find((p) => p.id === id) || null
export const missionByStop = (stopId) => missions.find((m) => m.stopId === stopId) || null

// Tappe visibili per una persona (people della tappa + skips della persona)
export function stopsFor(personId) {
  const p = personById(personId)
  if (!p) return stops
  return stops.filter((s) => s.people.includes(personId) && !p.skips.includes(s.id))
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
