// Modalità coro: solo le quattro righe del ritornello, a schermo pieno.
import { CHORUS, shout } from '../ui/song.js'
import { SONG_TITLE } from '../store.js'
import { icon } from '../ui/icons.js'
import { mosaicDataUri } from '../ui/mosaic.js'
import { esc } from '../ui/html.js'

export async function render(root) {
  root.innerHTML = `<section class="coro" style="--coro-mosaic:${mosaicDataUri(4040, 30)}" aria-label="Ritornello di ${esc(SONG_TITLE)}">
    <a class="coro__close btn btn--icon btn--ghost" href="#/info/canzone" aria-label="Chiudi la modalità coro">${icon('x')}</a>
    <p class="coro__kicker">${esc(SONG_TITLE)} · ritornello</p>
    <ol class="coro__lines">${CHORUS.map((l) => `<li>${shout(l)}</li>`).join('')}</ol>
    <p class="coro__foot">Tutti insieme. Dopo il terzo giro non serve più leggere.</p>
  </section>`
  return () => {}
}
