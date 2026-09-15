// Stato del gioco in localStorage, prefisso b40:v1:rigori: (chiavi separate da quelle del sito).
// try/catch ovunque: Safari in navigazione privata lancia eccezioni; fallback in memoria.
const PREFIX = 'b40:v1:rigori:'
const memory = new Map()
export const save = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(PREFIX + key); if (raw != null) return JSON.parse(raw) } catch { /* noop */ }
    return memory.has(key) ? memory.get(key) : fallback
  },
  set(key, value) {
    memory.set(key, value)
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* resta in memoria */ }
    return value
  },
  remove(key) { memory.delete(key); try { localStorage.removeItem(PREFIX + key) } catch { /* noop */ } },
  // Cancella solo le chiavi del gioco, mai quelle del sito
  reset() {
    memory.clear()
    try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)) } catch { /* noop */ }
  }
}
