// Player dell'inno ufficiale. Controlli nativi: su mobile sono i più affidabili e accessibili.
import { SONG_MP3, SONG_MP4, SONG_POSTER, SONG_TITLE, SITE_URL } from '../store.js'
import { icon } from './icons.js'
import { mosaicDataUri } from './mosaic.js'
import { esc } from './html.js'

const SHARE_TEXT = `L'inno ufficiale del weekend. Alza il volume e impara il ritornello.\n\n${SITE_URL}`

// Testo della canzone: non è nel repo. Finché non arriva resta un segnaposto dichiarato.
// Struttura pronta: { section: 'Strofa 1' | 'Ritornello' | …, lines: [...] }
export const LYRICS = null

function lyricsHtml() {
  if (!LYRICS) {
    return `<p class="song__missing"><span class="badge badge--da_verificare">${icon('alert')}da verificare</span>
      Il testo non è ancora nel sito. Mandalo e lo pubblichiamo qui, con il ritornello evidenziato.</p>`
  }
  return LYRICS.map((b) => `<div class="song__block">
    <div class="song__section">${esc(b.section)}</div>
    <div class="song__lines${/ritornello/i.test(b.section) ? ' song__lines--chorus' : ''}">${b.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
  </div>`).join('')
}

export function songCard({ line = "L'inno ufficiale dei quaranta. Alza il volume." } = {}) {
  return `<section class="song" style="--song-mosaic:${mosaicDataUri(2745, 26)}" aria-labelledby="song-title">
    <div class="song__head">
      <span class="song__disc" data-song-disc aria-hidden="true">${icon('disc')}</span>
      <div class="song__meta">
        <h2 class="song__title" id="song-title">${esc(SONG_TITLE)}</h2>
        <p class="song__line">${esc(line)}</p>
      </div>
    </div>

    <audio class="song__audio" data-song-audio controls preload="metadata" src="${SONG_MP3}" aria-label="Ascolta ${esc(SONG_TITLE)}"></audio>

    <button class="btn btn--block" data-song-toggle aria-expanded="false" aria-controls="song-video">${icon('disc')} Guarda il video</button>
    <div class="song__video" id="song-video" hidden>
      <video data-song-video controls playsinline preload="none" poster="${SONG_POSTER}" src="${SONG_MP4}" aria-label="Video di ${esc(SONG_TITLE)}"></video>
    </div>

    <div class="actions song__downloads">
      <a class="btn song__cta" href="${SONG_MP3}" download="${esc(SONG_TITLE)} - Barcelona 40.mp3" aria-label="Scarica l'audio di ${esc(SONG_TITLE)} in MP3">${icon('download')} Scarica MP3</a>
      <a class="btn song__cta" href="${SONG_MP4}" download="${esc(SONG_TITLE)} - Barcelona 40.mp4" aria-label="Scarica il video di ${esc(SONG_TITLE)}">${icon('download')} Scarica video</a>
    </div>
    <a class="btn btn--ghost btn--block" href="https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}" target="_blank" rel="noopener" aria-label="Manda l'inno ai ragazzi su WhatsApp">${icon('whatsapp')} Manda ai ragazzi</a>

    <details class="song__lyrics"><summary>Leggi il testo${icon('chevron')}</summary><div class="song__lyrics-body">${lyricsHtml()}</div></details>
  </section>`
}

// Audio e video non suonano mai insieme.
// Il flag sta sull'elemento audio, non sul contenitore: #app sopravvive ai re-render mentre
// audio e video vengono ricreati ogni volta, quindi un flag sul contenitore lascerebbe
// i nuovi elementi senza listener dalla seconda vista in poi.
export function bindSong(container) {
  const audio = container?.querySelector('[data-song-audio]')
  if (!audio || audio.dataset.songBound) return
  audio.dataset.songBound = '1'
  const video = container.querySelector('[data-song-video]')
  const disc = container.querySelector('[data-song-disc]')
  const wrap = container.querySelector('#song-video')
  const toggle = container.querySelector('[data-song-toggle]')
  if (!audio) return

  const spin = (on) => disc?.classList.toggle('song__disc--spin', on)
  audio.addEventListener('play', () => { video?.pause(); spin(true) })
  audio.addEventListener('pause', () => spin(false))
  audio.addEventListener('ended', () => spin(false))
  video?.addEventListener('play', () => { audio.pause(); spin(false) })

  toggle?.addEventListener('click', () => {
    const open = wrap.hidden
    wrap.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.innerHTML = open ? `${icon('x')} Nascondi il video` : `${icon('disc')} Guarda il video`
    if (open) { audio.pause(); audio.hidden = true } else { audio.hidden = false; video?.pause() }
  })
}
