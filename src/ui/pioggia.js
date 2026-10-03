// L'avviso che conta davvero quando piove di domenica: al Mirador c'è una prenotazione a nome, e se non si va
// bisogna cancellarla. Sta in cima al programma di domenica e, la mattina di domenica, anche in Oggi.
import { icon } from './icons.js'
import { esc } from './html.js'

export const TEL_MIRADOR = '+34 931 64 20 22'
export const PRENOTAZIONE_MIRADOR = new Date(2026, 9, 18, 13, 30, 0)

export function avvisoMiradorPioggia() {
  return `<div class="avviso avviso--pioggia avviso--mirador" data-avviso-mirador>${icon('alert')}<span>El Mirador è prenotato per le 13:30. Se resta la pioggia, cancella la prenotazione dal link nella mail di Google Maps, entro la mattina. Tel ${esc(TEL_MIRADOR)}.</span><a class="btn btn--sm" href="tel:${TEL_MIRADOR.replace(/\s/g, '')}" aria-label="Chiama El Mirador, ${esc(TEL_MIRADOR)}">${icon('phone')} Chiama</a></div>`
}
