// L'avviso che conta davvero: al Mirador c'è una prenotazione a nome per domenica alle 13:30, e il programma di
// domenica ora è al coperto (Casa Batlló, Bar Celta, Maremagnum). Se resta così, va cancellata entro sabato.
// Sta in cima al programma di domenica e, sabato e domenica mattina, anche in Oggi; sparisce con "Se torna il sole".
import { icon } from './icons.js'
import { esc } from './html.js'

export const TEL_MIRADOR = '+34 931 64 20 22'
export const PRENOTAZIONE_MIRADOR = new Date(2026, 9, 18, 13, 30, 0)

export function avvisoMiradorPioggia() {
  return `<div class="avviso avviso--pioggia avviso--mirador" data-avviso-mirador>${icon('alert')}<span>El Mirador è prenotato per domenica alle 13:30. Se la domenica resta al coperto (Batlló, Bar Celta, Maremagnum), cancella la prenotazione entro sabato, dal link nella mail di Google Maps. Tel ${esc(TEL_MIRADOR)}.</span><a class="btn btn--sm" href="tel:${TEL_MIRADOR.replace(/\s/g, '')}" aria-label="Chiama El Mirador, ${esc(TEL_MIRADOR)}">${icon('phone')} Chiama</a></div>`
}
