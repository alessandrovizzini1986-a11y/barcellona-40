// "Manda l'album ai ragazzi": messaggio già pronto per WhatsApp. Solo per Alessandro:
// per gli altri profili questo componente non viene proprio creato.
import { PHOTO_ALBUM, SITE_URL } from '../store.js'
import { icon } from './icons.js'
import { toast } from './toast.js'
import { esc } from './html.js'

export const MESSAGGIO_ALBUM = `Ragazzi, album unico per le foto del weekend a Barcellona 🦆

👉 ${PHOTO_ALBUM}

Come funziona, in 30 secondi:

1. Apri il link qui sopra. Si apre direttamente nel browser, l'app Google Foto NON serve.
2. Se ti chiede di accedere, usa il tuo account Google (quello di Gmail, ce l'hai già).
3. Per caricare: tocca "Aggiungi foto" in alto, scegli quelle che vuoi, fine.
4. Le foto degli altri le vedi lì dentro, in tempo reale.

Niente app da scaricare, niente iscrizioni. Carica quando vuoi, anche una volta tornati a casa.

E qui c'è il programma completo del weekend, orari e mappa:
${SITE_URL}`

export const MESSAGGIO_SITO = `Il programma del weekend a Barcellona, con orari, mappa e distanze:
${SITE_URL}

Salvalo tra i preferiti, ti serve tutto il weekend.`

const wa = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`

export function shareAlbum() {
  return `<section class="share-album" aria-labelledby="share-title">
    <div class="share-album__head">
      <span class="share-album__icon" aria-hidden="true">${icon('whatsapp')}</span>
      <div>
        <h2 class="album__title" id="share-title">Manda l'album ai ragazzi</h2>
        <p class="album__line">Messaggio già pronto, con le istruzioni per chi non usa Google Foto.</p>
      </div>
    </div>
    <div class="actions">
      <a class="btn share-album__cta" href="${wa(MESSAGGIO_ALBUM)}" target="_blank" rel="noopener" aria-label="Invia il messaggio dell'album su WhatsApp">${icon('whatsapp')} Invia su WhatsApp</a>
      <button class="btn btn--ghost" data-share-copy aria-label="Copia il messaggio dell'album negli appunti">${icon('copy')} Copia il messaggio</button>
    </div>
    <a class="btn btn--sm btn--ghost" href="${wa(MESSAGGIO_SITO)}" target="_blank" rel="noopener" aria-label="Manda solo il link del sito su WhatsApp">${icon('share')} Manda solo il link del sito</a>
    <details class="share-album__preview"><summary>Vedi il messaggio${icon('chevron')}</summary><pre>${esc(MESSAGGIO_ALBUM)}</pre></details>
  </section>`
}

export function bindShareAlbum(container) {
  if (!container || container.dataset.shareBound) return
  container.dataset.shareBound = '1'
  container.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-share-copy]')) return
    try {
      await navigator.clipboard.writeText(MESSAGGIO_ALBUM)
      toast('Messaggio copiato')
    } catch {
      toast('Appunti non disponibili: apri "Vedi il messaggio" e copia il testo a mano')
    }
  })
}
