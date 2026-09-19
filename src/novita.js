// NOVITÀ. Il sito cambia spesso e gli altri ci rientrano senza sapere cosa: il changelog sta in
// data/changelog.json ed è l'unica cosa da aggiornare a mano. Viene importato come modulo, quindi
// finisce dentro il bundle con l'hash nel nome: nessuna cache può servire dati vecchi con codice nuovo.
import changelog from '../data/changelog.json'
import { store } from './store.js'
import { parseLocal } from './time.js'

// Le più recenti in cima, qualunque sia l'ordine nel file
export const entries = [...changelog.entries].sort((a, b) => b.v - a.v)
export const ultimaVersione = entries.length ? entries[0].v : 0

// Quante novità deve ancora vedere questa persona.
// - chiave presente: tutto quello che è uscito dopo
// - chiave assente ma dati già salvati: è uno che c'era prima che il changelog esistesse, vede tutto
// - chiave assente e memoria vuota: è il primo accesso in assoluto, non ha niente da recuperare
export function nonLette() {
  const v = store.lastSeenVersion
  if (v == null) return store.storageVuoto() ? [] : entries
  return entries.filter((e) => e.v > v)
}
export const ciSonoNovita = () => nonLette().length > 0
export const segnaLette = () => { store.lastSeenVersion = ultimaVersione }
export const letta = (entry) => {
  const v = store.lastSeenVersion
  return v == null ? store.storageVuoto() : entry.v <= v
}

export function dataEstesa(iso) {
  const d = parseLocal(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}
// "Un aggiornamento" / "3 aggiornamenti", da quando sei passato
export const conteggio = (n) => (n === 1 ? 'Un aggiornamento da quando sei passato.' : `${n} aggiornamenti da quando sei passato.`)

// Testo pronto per WhatsApp, costruito dall'ultima entry: si avvisa senza riscrivere ogni volta
export function testoAvviso(siteUrl) {
  const e = entries[0]
  if (!e) return ''
  return `Aggiornato il sito 🔧\n\n${e.titolo}\n${e.voci.map((v) => `- ${v}`).join('\n')}\n\n${siteUrl}`
}
