// Pannello e sezione delle novità. La logica (cosa è nuovo per chi) sta in src/novita.js: qui c'è solo
// come si vede. Il pannello sale dal basso e si chiude in qualunque modo: comunque vada, quello che hai
// visto risulta visto, così non ti insegue a ogni apertura.
import { entries, nonLette, segnaLette, dataEstesa, conteggio, letta, testoAvviso } from '../novita.js'
import { openSheet } from './sheet.js'
import { icon } from './icons.js'
import { esc } from './html.js'
import { SITE_URL } from '../store.js'

const vociHtml = (e) => `<ul class="novita__voci">${e.voci.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>`
export const entryHtml = (e, { puntino = false } = {}) => `<article class="novita__entry">
  <div class="novita__data">${puntino ? '<span class="novita__punto" aria-label="Non letta"></span>' : ''}${esc(dataEstesa(e.data))}</div>
  <h3 class="novita__titolo">${esc(e.titolo)}</h3>
  ${vociHtml(e)}
</article>`

// Il pannello: solo se c'è davvero qualcosa di nuovo. Torna la funzione di chiusura, o null.
export function apriNovita() {
  const nuove = nonLette()
  if (!nuove.length) return null
  return openSheet({
    title: 'Cosa è cambiato',
    body: `<p class="muted">${esc(conteggio(nuove.length))}</p>
      <div class="novita">${nuove.map((e) => entryHtml(e)).join('')}</div>
      <div class="sheet__azione"><button class="btn btn--acqua btn--block" data-close>Ho capito</button></div>`,
    // il pulsante resta incollato in fondo sempre, non solo quando le entry sono tante: una soglia
    // sarebbe un caso limite in più da testare e un comportamento che cambia sotto gli occhi
    onOpen: (sheet) => sheet.classList.add('sheet--azione'),
    onClose: segnaLette
  })
}

// La sezione in Info: lo storico completo resta consultabile anche dopo averlo letto
export function sezioneNovita(person) {
  const nuove = nonLette()
  const avviso = person === 'ale' && entries.length
    ? `<a class="btn btn--block" href="https://wa.me/?text=${encodeURIComponent(testoAvviso(SITE_URL))}" target="_blank" rel="noopener" data-avvisa aria-label="Avvisa i ragazzi su WhatsApp dell'ultimo aggiornamento">${icon('whatsapp')} Avvisa i ragazzi</a>`
    : ''
  if (!entries.length) return `<p class="muted">Nessuna novità. Sei aggiornato.</p>`
  return `<p class="muted">${nuove.length ? esc(conteggio(nuove.length)) : 'Nessuna novità. Sei aggiornato.'}</p>
    ${avviso}
    <div class="novita">${entries.map((e) => entryHtml(e, { puntino: !letta(e) })).join('')}</div>`
}
