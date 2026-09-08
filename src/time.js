// "Adesso", countdown e tappa corrente. Override per i test: ?now=2026-10-17T07:50 (query string,
// anche dopo l'hash: #/oggi?now=...). Gli orari del piano sono ora locale di Barcellona (stesso fuso dell'Italia).
export const WEEKEND_START = new Date(2026, 9, 16, 0, 0, 0)
// Fine del weekend: 30 minuti dopo l'ultima tappa (d3, rientro 20:00 del 18/10, orario da verificare)
export const WEEKEND_END = new Date(2026, 9, 18, 20, 30, 0)
export const BIRTHDAY = new Date(2026, 9, 17, 0, 0, 0)
export const SPEEDRUN_DEADLINE = new Date(2026, 9, 17, 8, 15, 0)

let override = null
export function readOverride() {
  try {
    const search = new URLSearchParams(location.search)
    const hashQ = location.hash.includes('?') ? new URLSearchParams(location.hash.slice(location.hash.indexOf('?'))) : null
    const v = search.get('now') || hashQ?.get('now')
    if (!v) { override = null; return null }
    const d = parseLocal(v)
    override = isNaN(d) ? null : d
  } catch { override = null }
  return override
}
export function parseLocal(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return new Date(NaN)
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))
}
export function now() { return override ? new Date(override) : new Date() }
export function isOverridden() { return !!override }

// Fase del weekend
export function phase(d = now()) {
  if (d < WEEKEND_START) return 'before'
  if (d >= WEEKEND_END) return 'after'
  return 'during'
}

// Data/ora assoluta di una tappa: orari prima delle 04:00 appartengono alla notte successiva (es. s9 00:15)
export function stopDate(stop, dayDate) {
  const [h, m] = stop.time.split(':').map(Number)
  const [y, mo, d] = dayDate.split('-').map(Number)
  const dt = new Date(y, mo - 1, d, h, m)
  if (h < 4) dt.setDate(dt.getDate() + 1)
  return dt
}

export function countdownTo(target, from = now()) {
  let ms = Math.max(0, target - from)
  const days = Math.floor(ms / 864e5); ms -= days * 864e5
  const hours = Math.floor(ms / 36e5); ms -= hours * 36e5
  const mins = Math.floor(ms / 6e4); ms -= mins * 6e4
  const secs = Math.floor(ms / 1e3)
  return { days, hours, mins, secs, total: Math.max(0, target - from) }
}

// Giorno del weekend per una data: 'ven' | 'sab' | 'dom' | null
export function dayKey(d = now()) {
  if (phase(d) !== 'during') return null
  return ['ven', 'sab', 'dom'][d.getDate() - 16] || null
}
export function todayIso(d = now()) {
  const k = dayKey(d)
  return k ? `2026-10-${16 + ['ven', 'sab', 'dom'].indexOf(k)}` : null
}

// Tappa corrente: ultima tappa (lista già filtrata per persona, ordinata) con inizio <= now
export function currentStop(stops, d = now()) {
  let cur = null
  for (const s of stops) { if (s.at <= d) cur = s; else break }
  return cur
}
export function nextStop(stops, d = now()) { return stops.find((s) => s.at > d) || null }

export function minutesUntil(target, from = now()) { return Math.round((target - from) / 6e4) }
export function fmtMinutes(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
export const pad2 = (n) => String(n).padStart(2, '0')
export function fmtClock({ hours, mins, secs }) { return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}` }
