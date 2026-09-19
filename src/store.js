// Album condiviso del weekend (link verificato: 302 verso un album Google Foto condiviso)
export const PHOTO_ALBUM = 'https://photos.app.goo.gl/mqfbvmyvrwXwRLPF6'
// URL pubblico del sito, iniettato in fase di build (vedi vite.config.js)
export const SITE_URL = __SITE_URL__

// L'inno ufficiale. I percorsi passano da BASE_URL: il sito è pubblicato sotto
// /barcellona-40/, quindi un percorso assoluto "/media/..." darebbe 404.
const MEDIA = import.meta.env.BASE_URL.replace(/\/$/, '') + '/media/'
export const SONG_MP3 = MEDIA + 'vizzo_barcellona_hit.mp3'
export const SONG_MP4 = MEDIA + 'vizzo_barcellona_hit.mp4'
export const SONG_POSTER = MEDIA + 'song-poster.jpg'
export const SONG_TITLE = 'Disonesti'
// Canvas: la papera in loop dietro la card della canzone (video muto, 9 s, seamless)
export const CANVAS_MP4 = MEDIA + 'disonesti-canvas.mp4'
export const CANVAS_POSTER = MEDIA + 'disonesti-canvas-poster.jpg'
// Pagina statica con l'Open Graph della papera: è quella da condividere su WhatsApp
export const SONG_URL = SITE_URL.replace(/\/?$/, '/') + 'canzone.html'

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
// Idempotente: porta l'id allo stato richiesto, qualunque sia quello attuale.
// È la primitiva giusta per le checkbox: si legge `checked`, non si inverte alla cieca.
function setIn(key, id, on) {
  const arr = read(key, [])
  const has = arr.includes(id)
  if (on && !has) write(key, [...arr, id])
  else if (!on && has) write(key, arr.filter((x) => x !== id))
  return !!on
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
  // Modalità pioggia del venerdì: ottobre è il mese più piovoso a Barcellona
  get piove() { return read('piove', false) },
  set piove(v) { write('piove', !!v) },

  get done() { return read('done', []) },
  isDone: (stopId) => read('done', []).includes(stopId),
  toggleDone: (stopId) => toggleIn('done', stopId),
  setDone: (stopId, on) => setIn('done', stopId, on),

  get missions() { return read('missions', []) },
  isMissionDone: (id) => read('missions', []).includes(id),
  toggleMission: (id) => toggleIn('missions', id),
  setMission: (id, on) => setIn('missions', id, on),
  completeMission(id) { const arr = read('missions', []); if (!arr.includes(id)) write('missions', [...arr, id]); return true },

  get checks() { return read('checks', []) },
  isChecked: (id) => read('checks', []).includes(id),
  toggleCheck: (id) => toggleIn('checks', id),
  setCheck: (id, on) => setIn('checks', id, on),

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
