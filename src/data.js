// Accesso ai dati: itinerario appiattito, venue, persone, missioni, check. Nessun dato inventato qui:
// tutto arriva dai JSON in /data.
import itinerary from '../data/itinerary.json'
import peopleJson from '../data/people.json'
import venuesJson from '../data/venues.json'
import missionsJson from '../data/missions.json'
import checksJson from '../data/checks.json'
import { stopDate, pad2, canzoneVisibile } from './time.js'
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
// Secondo interruttore, solo venerdì: Palau Macaya. Non è un'opzionale senza orario come il Casinò: se si fa, ha
// la sua fascia e sposta il pomeriggio. Spento, il pomeriggio è byte per byte quello di sempre.
export const macaya = () => !!store.get('macaya', false)

// TAPPE OPZIONALI. Non hanno orario: sono posti dove si può finire, non impegni. Non entrano nei totali
// della giornata, non diventano mai "Adesso" o "Prossima", e in fondo alla timeline stanno sotto una riga
// tratteggiata. La spunta "Fatto" resta: se ci andate, si segna.
export const senzaOrario = (s) => s.time == null
export const conOrario = (s) => s.time != null
const oraDi = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
export const durataDi = (s) => (piove() && s.durataPioggiaMin != null ? s.durataPioggiaMin : s.durataMin)

// Cascata su un giorno solo: si parte dall'orario della prima tappa con durata e si somma
// durata + minuti di cammino fino alla tappa dopo. Si ferma dove la catena delle durate finisce:
// il check-in delle 15:00 e la sera restano dove sono, perché non dipendono da quanto ci metti la mattina.
function ricalcola(giorno) {
  const out = giorno.map((s) => (s.distPioggia ? { ...s, distFromPrevM: s.distPioggia.m, minFromPrev: s.distPioggia.min } : { ...s }))
  const i0 = out.findIndex((s) => conOrario(s) && s.durataMin != null)
  if (i0 < 0) return out
  let t = new Date(out[i0].at)
  for (let i = i0; i < out.length && conOrario(out[i]) && out[i].durataMin != null; i++) {
    // `apertura`: non si arriva prima che apra (El Born alle 10:00): si aspetta lì, la cascata riparte da lì
    if (out[i].apertura) { const [h, m] = out[i].apertura.split(':').map(Number); const ap = new Date(t); ap.setHours(h, m, 0, 0); if (ap > t) t = ap }
    out[i].at = new Date(t)
    out[i].time = oraDi(t)
    t = new Date(t.getTime() + (durataDi(out[i]) + (out[i + 1]?.minFromPrev || 0)) * 60000)
  }
  return out
}
// Con la pioggia alcune tappe si SALTANO (`saltaPioggia`: la Ciutadella, i Bunkers): escono dalla catena e
// dai conti, e restano in coda alla giornata, grigie, con il motivo. Altre cambiano orario (`timePioggia`).
export const attiva = (s) => !s.saltata
function conPioggia(list) {
  const giorni = [...new Set(list.map((s) => s.dayKey))]
  return giorni.flatMap((k) => {
    const delGiorno = list.filter((s) => s.dayKey === k)
    const saltate = delGiorno.filter((s) => s.saltaPioggia).map((s) => ({ ...s, saltata: true }))
    const vive = delGiorno.filter((s) => !s.saltaPioggia).map((s) => (s.timePioggia ? { ...s, time: s.timePioggia, at: stopDate({ ...s, time: s.timePioggia }, s.day.date) } : s))
    return [...ricalcola(vive), ...saltate]
  }).sort((a, b) => (a.saltata ? 1 : 0) - (b.saltata ? 1 : 0) || a.at - b.at)
}

// Conto della mattina: soste, cammino e margine, tutti calcolati dalle durate reali (mai scritti a mano).
// La finestra va dalla prima tappa con durata alla tappa subito dopo la catena (il rientro verso casa).
export function contoDelGiorno(lista) {
  // Le tappe senza orario non fanno parte della giornata: non hanno durata, non hanno cammino,
  // e contarle vorrebbe dire far dipendere il margine da una cosa che forse non si fa.
  const giorno = lista.filter(conOrario).filter(attiva)
  const i0 = giorno.findIndex((s) => s.durataMin != null)
  if (i0 < 0) return null
  let i1 = i0
  while (i1 + 1 < giorno.length && giorno[i1 + 1].durataMin != null) i1++
  const catena = giorno.slice(i0, i1 + 1)
  const dopo = giorno[i1 + 1] || null
  const soste = catena.reduce((n, s) => n + durataDi(s), 0)
  // Si contano solo i tratti a piedi: il primo arrivo non si conta (alla Ciutadella ci si arriva
  // dall'aeroporto) e nemmeno i tratti in auto o taxi, che nel "cammino" non ci stanno.
  const aPiedi = (s) => s && s.distMode !== 'auto' && s.distMode !== 'taxi' ? (s.minFromPrev || 0) : 0
  const cammino = catena.slice(1).reduce((n, s) => n + aPiedi(s), 0) + aPiedi(dopo)
  const finestra = dopo ? Math.round((dopo.at - catena[0].at) / 60000) : soste + cammino
  return { inizio: catena[0].time, fine: dopo ? dopo.time : null, soste, cammino, finestra, margine: finestra - soste - cammino, tappe: catena.length }
}

// PERCORSI DI MEZZA GIORNATA. I link di Google Maps sono costruiti e verificati a mano e stanno in
// data/itinerary.json come stringhe: non si rigenerano dalle coordinate, perché una virgola fuori posto
// in un waypoint manda il percorso da un'altra parte senza che nessuno se ne accorga.
// Con la pioggia un percorso può cambiare link (venerdì: stesse tappe via El Born), oppure cambiare
// del tutto (domenica: taxi a Maremagnum e poi al T2, con etichetta, tappe e mezzo propri), oppure
// sparire (`soloAsciutto`: dal Mirador ai Bunkers a piedi non si va). I campi *Pioggia si sovrappongono
// a quelli normali solo quando il toggle è acceso: il resto del sito legge sempre `url`, `label`, `stops`, `mode`.
export function percorsiDi(dayKey) {
  let lista = days.find((d) => DAY_KEY[d.date] === dayKey)?.percorsi || []
  if (piove()) lista = lista.filter((pc) => !pc.soloAsciutto).map((pc) => (pc.urlPioggia
    ? { ...pc, url: pc.urlPioggia, label: pc.labelPioggia || pc.label, stops: pc.stopsPioggia || pc.stops, mode: pc.modePioggia || pc.mode }
    : pc))
  // Palau Macaya: il pomeriggio di venerdì passa dall'appartamento e da Passeig de Sant Joan (link verificato a mano)
  if (macaya()) lista = lista.map((pc) => (pc.urlMacaya ? { ...pc, url: pc.urlMacaya, stops: pc.stopsMacaya || pc.stops } : pc))
  return lista
}
// Totale del blocco, sommato dalle tappe vere: i tratti a piedi per i percorsi a piedi, quelli in auto
// o taxi per i percorsi coi mezzi (dove il tempo di Google non è il nostro e non lo si finge).
export function totaleTratta(percorso, list) {
  const dentro = list.filter((s) => percorso.stops.includes(s.id) && attiva(s))
  const aPiedi = (s) => s.distMode !== 'auto' && s.distMode !== 'taxi'
  const tratti = dentro.filter((s) => s.distFromPrevM != null && (percorso.mode === 'walking' ? aPiedi(s) : !aPiedi(s)))
  // Tappe che cadono dentro la finestra del blocco ma non sono nel link: succede in modalità pioggia,
  // dove entra El Born. Meglio dirlo sul pulsante che lasciarlo scoprire a Maps.
  const fuori = dentro.length
    ? list.filter((s) => !percorso.stops.includes(s.id) && attiva(s) && s.at > dentro[0].at && s.at < dentro[dentro.length - 1].at)
    : []
  return {
    m: tratti.reduce((n, s) => n + s.distFromPrevM, 0),
    min: tratti.reduce((n, s) => n + (s.minFromPrev || 0), 0),
    tappe: dentro.length,
    fuoriPercorso: fuori.map((s) => s.venue?.name || s.title)
  }
}

export const stopById = (id) => stops.find((s) => s.id === id) || null
export const personById = (id) => people.find((p) => p.id === id) || null
export const missionByStop = (stopId) => missions.find((m) => m.stopId === stopId) || null

// Tappe visibili per una persona (people della tappa + skips della persona)
export function stopsFor(personId) {
  const p = personById(personId)
  const pioggia = piove(), casaMacaya = macaya()
  let list = stops.filter((s) => (!s.soloPioggia || pioggia) && (!s.soloMacaya || casaMacaya))
  if (p) list = list.filter((s) => s.people.includes(personId) && !p.skips.includes(s.id))
  if (casaMacaya) list = conMacaya(list)
  if (pioggia) list = conPioggia(list)
  return numera(list)
}
// Palau Macaya acceso: le tappe del pomeriggio prendono durate e tratti del piano con Macaya (campo `macaya`),
// e la cascata riparte dalla prima tappa toccata (Taps, 16:30) fino a dove le durate finiscono (la Braseria
// delle 20:30 resta dov'è, prenotata). Spento, nessun campo `macaya` viene letto.
function conMacaya(list) {
  const out = list.map((s) => (s.macaya ? { ...s, ...(s.macaya.durataMin != null ? { durataMin: s.macaya.durataMin } : {}), ...(s.macaya.dist ? { distFromPrevM: s.macaya.dist.m, minFromPrev: s.macaya.dist.min } : {}) } : s))
  const giorni = [...new Set(out.filter((s) => s.macaya || s.soloMacaya).map((s) => s.dayKey))]
  for (const k of giorni) {
    const idx = out.map((s, i) => (s.dayKey === k && (s.macaya || s.soloMacaya) ? i : -1)).filter((i) => i >= 0)
    const i0 = idx[0]; let i1 = i0
    while (i1 + 1 < out.length && out[i1 + 1].dayKey === k && conOrario(out[i1 + 1]) && out[i1 + 1].durataMin != null) i1++
    const blocco = ricalcola(out.slice(i0, i1 + 1))
    out.splice(i0, blocco.length, ...blocco)
  }
  return out
}
// Il numero della tappa (quello dei marker sulla mappa) conta solo quelle che vedi davvero:
// senza pioggia El Born non c'è, e la numerazione non deve saltare un numero.
function numera(list) {
  const conta = {}
  // Le tappe opzionali non prendono un numero: sulla mappa sarebbero la "tappa 9" di una giornata
  // che di tappe ne ha otto.
  return list.map((s) => ({ ...s, order: senzaOrario(s) || s.saltata ? null : (conta[s.dayKey] = (conta[s.dayKey] || 0) + 1) }))
}
export function stopsForDay(personId, dayKey) { return stopsFor(personId).filter((s) => s.dayKey === dayKey) }
// m15 "Coro Ufficiale" è la missione della canzone: dal 19 ottobre sparisce con lei (conteggi e XP compresi)
export const MISSIONE_CANZONE = 'm15'
export function missionsFor(personId) { return missions.filter((m) => m.people.includes(personId) && (canzoneVisibile() || m.id !== MISSIONE_CANZONE)) }

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
  if (stop.timeStatus === 'opzionale') set.add('opzionale')
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
