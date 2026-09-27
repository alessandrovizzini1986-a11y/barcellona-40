// Il gioco vive dentro il sito: /rigori/ sta sotto la stessa base. Da OGNI schermata si deve poter tornare al
// programma con un tocco, nella stessa scheda (non _blank). Un solo posto per l'indirizzo e per il pulsante.
export const SITO = new URL('../#/oggi', location.href).href
export const linkSito = (cls = '') => `<a class="rg-btn rg-btn--ghost rg-sito${cls ? ' ' + cls : ''}" href="${SITO}" aria-label="Torna al programma del weekend">← Torna al programma</a>`
