// Stato persistente in localStorage con prefisso b40:v1:. Safari privato può lanciare eccezioni:
// ogni accesso è protetto da try/catch e ha un fallback in memoria.
const PREFIX = 'b40:v1:'
const memory = new Map()
const listeners = new Set()

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return memory.has(key) ? memory.get(key) : fallback
    return JSON.parse(raw)
  } catch {
    return memory.has(key) ? memory.get(key) : fallback
  }
}
function write(key, value) {
  memory.set(key, value)
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* storage non disponibile: resta in memoria */ }
  for (const fn of listeners) fn(key, value)
}

function toggleIn(key, id) {
  const arr = read(key, [])
  const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
  write(key, next)
  return next.includes(id)
}

// Base64 sicuro per UTF-8
const b64e = (s) => btoa(unescape(encodeURIComponent(s)))
const b64d = (s) => decodeURIComponent(escape(atob(s)))

export const store = {
  get: read,
  set: write,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },

  get person() { return read('person', null) },
  set person(v) { write('person', v) },
  get theme() { return read('theme', 'dark') },
  set theme(v) { write('theme', v) },
  get gamificationHidden() { return read('gamificationHidden', false) },
  set gamificationHidden(v) { write('gamificationHidden', !!v) },

  get done() { return read('done', []) },
  isDone: (stopId) => read('done', []).includes(stopId),
  toggleDone: (stopId) => toggleIn('done', stopId),

  get missions() { return read('missions', []) },
  isMissionDone: (id) => read('missions', []).includes(id),
  toggleMission: (id) => toggleIn('missions', id),
  completeMission(id) { const arr = read('missions', []); if (!arr.includes(id)) write('missions', [...arr, id]); return true },

  get checks() { return read('checks', []) },
  isChecked: (id) => read('checks', []).includes(id),
  toggleCheck: (id) => toggleIn('checks', id),

  get scores() { return read('scores', {}) },
  setScore(person, data) { write('scores', { ...read('scores', {}), [person]: data }) },

  // Classifica: stringa "b40:" + base64 di {person, xp, done[]}
  export(person, xp, done) { return 'b40:' + b64e(JSON.stringify({ person, xp, done })) },
  import(str) {
    const s = String(str || '').trim()
    if (!s.startsWith('b40:')) throw new Error('Formato non valido: deve iniziare con b40:')
    const obj = JSON.parse(b64d(s.slice(4)))
    if (!obj || typeof obj.person !== 'string' || typeof obj.xp !== 'number' || !Array.isArray(obj.done)) throw new Error('Contenuto non valido')
    this.setScore(obj.person, { xp: obj.xp, done: obj.done, at: Date.now() })
    return obj
  },

  storageAvailable() { try { const k = PREFIX + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true } catch { return false } }
}
