// Banner "Album del weekend": una sola cartella condivisa per tutti e quattro. Visibile a ogni profilo.
import { PHOTO_ALBUM } from '../store.js'
import { icon } from './icons.js'
import { toast } from './toast.js'
import { mosaicDataUri } from './mosaic.js'
import { esc } from './html.js'
import { evento } from '../stats.js'

export function albumBanner({ line = "Carica le tue, guarda quelle degli altri. Una sola cartella per tutti e quattro.", cta = "Apri l'album" } = {}) {
  return `<section class="album" style="--album-mosaic:${mosaicDataUri(1610, 28)}" aria-labelledby="album-title">
    <div class="album__icon" aria-hidden="true">${icon('camera')}</div>
    <div class="album__body">
      <h2 class="album__title" id="album-title">Album del weekend</h2>
      <p class="album__line">${esc(line)}</p>
      <div class="actions">
        <a class="btn album__cta" href="${PHOTO_ALBUM}" target="_blank" rel="noopener" aria-label="${esc(cta)}, si apre in una nuova scheda">${icon('camera')} ${esc(cta)}</a>
        <button class="btn btn--ghost" data-album-copy aria-label="Copia il link dell'album negli appunti">${icon('copy')} Copia link</button>
      </div>
    </div>
  </section>`
}

// Un solo listener delegato per contenitore
export function bindAlbum(container) {
  if (!container || container.dataset.albumBound) return
  container.dataset.albumBound = '1'
  container.addEventListener('click', async (e) => {
    if (e.target.closest('.album__cta')) evento('album-apri')
    if (!e.target.closest('[data-album-copy]')) return
    evento('album-copia-link')
    try {
      await navigator.clipboard.writeText(PHOTO_ALBUM)
      toast('Link copiato, mandalo nel gruppo')
    } catch {
      toast('Appunti non disponibili: tieni premuto sul pulsante Apri l\'album e copia il link')
    }
  })
}
