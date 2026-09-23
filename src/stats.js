// Statistiche anonime con GoatCounter (barcellona40.goatcounter.com).
// Serve a una cosa sola: sapere quali viste e quali pulsanti vengono usati davvero. Nessun cookie,
// nessun identificatore, nessun dato personale oltre al nome del profilo scelto su questo telefono
// (alessandro, monne, giulio, manuel), che finisce davanti al percorso: /giulio/programma.
//
// Regola di fondo: le statistiche non devono MAI rompere il sito. Se lo script non c'è — ad blocker,
// rete assente, pagina aperta da file:// — qui non succede niente: nessun errore in console, nessun
// effetto. Non si traccia in sviluppo (localhost) e non si traccia con ?now= nell'URL: quelle sono
// prove, non visite vere.
import { store } from './store.js'

// Nel pannello si legge "alessandro", non "ale": il profilo interno è un id, il percorso è per gli umani
const NOMI = { ale: 'alessandro', monne: 'monne', giulio: 'giulio', manuel: 'manuel' }
export const profilo = () => NOMI[store.person] || 'anonimo'

// Prove automatiche: con ?stats=prova il conteggio ragiona come in produzione (guardie comprese) ma,
// invece di arrivare a GoatCounter — che in locale non esiste — ogni chiamata resta in
// window.__b40stats.conte. È l'unico modo per verificare i percorsi senza contattare nessuno.
const PROVA = (() => { try { return /[?&]stats=prova\b/.test(location.href) } catch { return false } })()
if (PROVA) window.__b40stats = { conte: [] }

// Perché non si conta. Stringa vuota = si conta.
export function motivoSpento() {
  try {
    if (/[?&]now=/.test(location.href)) return 'prova con ?now='
    const h = location.hostname
    if (!PROVA && (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '' || h.endsWith('.local'))) return 'sviluppo'
    return ''
  } catch { return 'contesto non leggibile' }
}

function conta(dati) {
  try {
    if (motivoSpento()) return
    if (PROVA) { window.__b40stats.conte.push(dati); if (window.__b40stats.conte.length > 50) window.__b40stats.conte.shift() }
    const gc = window.goatcounter
    if (!gc || typeof gc.count !== 'function') return
    gc.count(dati)
  } catch { /* una statistica persa non è un problema: un errore in console sì */ }
}

// Una vista aperta: /alessandro/oggi, /giulio/programma, /anonimo/onboarding prima di scegliere il profilo.
// Il sito ridisegna la stessa vista anche per motivi suoi (tema, pannello novità letto): si conta solo
// quando la coppia profilo+vista cambia davvero, altrimenti un ri-render varrebbe come una visita.
let ultima = null
export function vista(nome, chi = profilo()) {
  const path = `/${chi}/${nome}`
  if (path === ultima) return
  ultima = path
  conta({ path, title: nome })
}

// Un'azione: album-apri, maps-tappa, taxi… Senza slash davanti, così nel pannello gli eventi stanno
// insieme e restano separati dalle viste. `dettaglio` finisce nel titolo (es. "maps-tappa f8").
export function evento(nome, dettaglio = '') {
  conta({ path: `${profilo()}/${nome}`, title: dettaglio ? `${nome} ${dettaglio}` : nome, event: true })
}
