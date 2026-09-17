// Ponte sito → gioco dei rigori. SOLA LETTURA: il sito legge `b40:v1:rigori:xp` e `b40:v1:rigori:stats`,
// che scrive il gioco, e non tocca nessuna chiave del gioco. Allo stesso modo il gioco non scrive chiavi del sito.
// Se il profilo del sito non è ancora stato scelto, questi numeri esistono lo stesso: verranno mostrati al primo
// profilo selezionato.
const PREFIX = 'b40:v1:rigori:'
const leggi = (chiave, fallback) => {
  try {
    const v = localStorage.getItem(PREFIX + chiave)
    return v == null ? fallback : JSON.parse(v)
  } catch { return fallback }
}
export const URL_GIOCO = 'rigori/'
export const URL_GIOCO_CLASSICO = 'rigori-classic.html'
export const rigoriXp = () => { const n = leggi('xp', 0); return Number.isFinite(n) ? n : 0 }
export const rigoriStats = () => Object.assign({ gol: 0, parate: 0, partite: 0, record: 0, vittorie: 0 }, leggi('stats', {}) || {})
// Ha senso mostrare il riepilogo solo se ci si ha davvero giocato
export const haGiocato = () => rigoriXp() > 0 || rigoriStats().partite > 0
