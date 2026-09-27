import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { ring } from '../components/ring.js'
// Risultato di fine modalità: riepilogo, XP, traguardi, condividi, rigioca
// Un solo pulsante grande, Rigioca; Menu e Torna al sito normali; tutto il resto dentro "Condividi".
// `esito`: 'vinto' | 'perso' | null. Se hai perso, Ale te lo fa notare; se hai vinto, Ale chiede il VAR (e fuori piovono coriandoli).
const RIGA = { vinto: 'Ale chiede il VAR. Non c\'è.', perso: 'Ale ti aspetta per la rivincita.' }
export function risultato(ui, { title, lines = [], esito = null, xpGained = 0, xp = 0, level, next, achievements = [], shareText = '', sito = null, video = false }) {
  return overlay(ui, `<h2 class="rg-title">${esc(title)}</h2>
    <ul class="rg-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    ${esito && RIGA[esito] ? `<p class="rg-risultato__riga rg-risultato__riga--${esito}">${esc(RIGA[esito])}</p>` : ''}
    <div class="rg-xp">${ring(next ? next.progress : 1, 1, `+${xpGained}`, 'XP')}<div><b>${esc(level.title)}</b><span>${xp} XP${next ? ` · ${next.toNext} al prossimo` : ' · livello massimo'}</span></div></div>
    ${achievements.length ? `<div class="rg-ach">${achievements.map((a) => `<span class="rg-ach__item">🏆 ${esc(a.title)}</span>`).join('')}</div>` : ''}
    <button class="rg-btn rg-btn--giallo rg-btn--block" data-value="again" aria-label="Rigioca">Rigioca</button>
    <div class="rg-row">
      <button class="rg-btn" data-value="menu" aria-label="Torna al menu">Menu</button>
      ${sito ? `<a class="rg-btn" href="${sito}" aria-label="Torna al sito del weekend">Torna al sito</a>` : ''}
      <button class="rg-btn rg-btn--ghost" data-share-toggle aria-expanded="false" aria-controls="rg-share-opts" aria-label="Condividi il risultato">Condividi</button>
      <button class="rg-btn rg-btn--ghost" data-value="classifica" aria-label="Classifica di serata">Classifica</button>
    </div>
    <div class="rg-row rg-share-opts" id="rg-share-opts" hidden>
      <button class="rg-btn" data-share aria-label="Condividi l'immagine del momento">Immagine</button>
      ${video ? '<button class="rg-btn" data-share-video aria-label="Condividi il video del replay">Video</button>' : ''}
      <button class="rg-btn" data-copy="${esc(shareText)}" aria-label="Copia il risultato come testo">Copia risultato</button>
    </div>`, { label: 'Risultato' })
}
