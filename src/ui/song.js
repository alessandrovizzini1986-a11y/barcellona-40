// Player dell'inno ufficiale. Controlli nativi: su mobile sono i più affidabili e accessibili.
import { SONG_MP3, SONG_MP4, SONG_POSTER, SONG_TITLE, SONG_URL, CANVAS_MP4, CANVAS_POSTER } from '../store.js'
import { icon } from './icons.js'
import { mosaicDataUri } from './mosaic.js'
import { esc } from './html.js'
import { evento } from '../stats.js'

// Il link condiviso è canzone.html: porta alla stessa card ma con l'anteprima della papera su WhatsApp
const SHARE_TEXT = `L'inno ufficiale del weekend. Alza il volume e impara il ritornello.\n\n${SONG_URL}`

// Testo di "Disonesti". Le etichette tra parentesi quadre sono riferimenti, non si cantano.
// Le sezioni il cui nome contiene "ritornello" vengono evidenziate.
export const LYRICS = [
  { section: 'Intro', lines: ['(strumentale)'] },
  { section: 'Strofa 1', lines: ["Quaranta e sto una bomba", 'Stasera Barcellona', 'Quattro scemi in aeroporto', 'Il weekend più storto'] },
  { section: 'Build', lines: ["Se arrivo a quarant'anni", 'Io faccio mille danni'] },
  { section: 'Ritornello', lines: ['Mi tiro su la bamba', "Ci lascio un'altra gamba", 'Disonesti! (Bar-ça!)', 'Non finiamo mai'] },
  { section: 'Strofa 2', lines: ['Il volo di mattina', 'La notte non finiva', 'Un vermut e una risata', 'La città già spalancata'] },
  { section: 'Build', lines: ["Se arrivo a quarant'anni", 'Io faccio mille danni'] },
  { section: 'Ritornello', lines: ['Mi tiro su la bamba', "Ci lascio un'altra gamba", 'Disonesti! (Bar-ça!)', 'Non finiamo mai'] },
  { section: 'Break', lines: ['Ale! Monne! Giulio! Manuel!', 'Ale! Monne! Giulio! Manuel!', 'Non cresciamo mai', 'Non cresciamo mai'] },
  { section: 'Ritornello finale', lines: ['Mi tiro su la bamba', "Ci lascio un'altra gamba", 'Disonesti! (Bar-ça!)', 'Non finiamo mai'] },
  { section: 'Outro', lines: ['La la la la', 'La la la la', 'Non finiamo mai'] }
]

// Le quattro righe del ritornello, usate anche dalla modalità coro
export const CHORUS = LYRICS.find((b) => b.section === 'Ritornello').lines

const isChorus = (section) => /ritornello/i.test(section)

// I cori tra parentesi tonde, tipo (Bar-ça!), vanno in giallo e più piccoli
export function shout(line) {
  return esc(line).replace(/\(([^)]+)\)/g, '<i class="song__shout">($1)</i>')
}

function lyricsHtml() {
  return LYRICS.map((b) => `<div class="song__block">
    <div class="song__section">[${esc(b.section)}]</div>
    <div class="song__lines${isChorus(b.section) ? ' song__lines--chorus' : ''}">${b.lines.map((l) => `<span>${shout(l)}</span>`).join('')}</div>
  </div>`).join('')
}

// Sfondo animato: video muto in loop. Con prefers-reduced-motion o risparmio dati resta il poster.
function canvasHtml() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true
  if (still) return `<div class="song__canvas song__canvas--still" style="background-image:url('${CANVAS_POSTER}')" aria-hidden="true"></div>`
  return `<video class="song__canvas" data-song-canvas autoplay muted loop playsinline preload="metadata" poster="${CANVAS_POSTER}" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback>
    <source src="${CANVAS_MP4}" type="video/mp4">
  </video>`
}

export function songCard({ line = "L'inno ufficiale dei quaranta. Alza il volume." } = {}) {
  return `<section class="song" style="--song-mosaic:${mosaicDataUri(2745, 26)}" aria-labelledby="song-title">
    ${canvasHtml()}
    <div class="song__shade" aria-hidden="true"></div>
    <div class="song__stage" aria-hidden="true"></div>
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
      <a class="btn song__cta" data-song-dl="mp3" href="${SONG_MP3}" download="${esc(SONG_TITLE)} - Barcelona 40.mp3" aria-label="Scarica l'audio di ${esc(SONG_TITLE)} in MP3">${icon('download')} Scarica MP3</a>
      <a class="btn song__cta" data-song-dl="video" href="${SONG_MP4}" download="${esc(SONG_TITLE)} - Barcelona 40.mp4" aria-label="Scarica il video di ${esc(SONG_TITLE)}">${icon('download')} Scarica video</a>
    </div>
    <a class="btn btn--ghost btn--block" href="https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}" target="_blank" rel="noopener" aria-label="Manda l'inno ai ragazzi su WhatsApp">${icon('whatsapp')} Manda ai ragazzi</a>

    <a class="btn btn--ghost btn--block" data-song-coro href="#/coro" aria-label="Modalità coro: il ritornello a schermo pieno">${icon('music')} Modalità coro</a>

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

  // Il canvas gira solo quando la card è sullo schermo: batteria e banda
  const canvas = container.querySelector('[data-song-canvas]')
  if (canvas && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) canvas.play().catch(() => {}); else canvas.pause() }
    }, { threshold: 0.1 })
    io.observe(canvas)
  }

  const spin = (on) => disc?.classList.toggle('song__disc--spin', on)
  audio.addEventListener('play', () => { video?.pause(); spin(true); evento('canzone-play') })
  audio.addEventListener('pause', () => spin(false))
  audio.addEventListener('ended', () => spin(false))
  video?.addEventListener('play', () => { audio.pause(); spin(false); evento('canzone-video') })

  // Download e modalità coro. Il listener va sulla card, non sul contenitore: #app sopravvive ai
  // re-render e ne accumulerebbe uno per volta, contando la stessa azione più volte.
  audio.closest('.song')?.addEventListener('click', (e) => {
    const dl = e.target.closest('[data-song-dl]')
    if (dl) evento(dl.dataset.songDl === 'mp3' ? 'canzone-scarica-mp3' : 'canzone-scarica-video')
    if (e.target.closest('[data-song-coro]')) evento('coro-apri')
  })

  toggle?.addEventListener('click', () => {
    const open = wrap.hidden
    wrap.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.innerHTML = open ? `${icon('x')} Nascondi il video` : `${icon('disc')} Guarda il video`
    if (open) { audio.pause(); audio.hidden = true } else { audio.hidden = false; video?.pause() }
  })
}
