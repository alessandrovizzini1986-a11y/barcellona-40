// Card tappa: orario, titolo, "perché", chip distanza/prezzi, badge, azioni, dettagli, checkbox "Fatto"
import { icon } from './icons.js'
import { badges as badgeHtml } from './badge.js'
import { esc } from './html.js'
import { badgesFor, fmtDist, fmtEur, mapsUrl, taxiUrl, TAXI_FALLBACK, missionByStop, hasCoords, DAY_COLOR } from '../data.js'
import { store } from '../store.js'
import fotoTappe from '../../data/foto-tappe.json'
import { setStopDone } from '../game.js'
import { toast } from './toast.js'
import { short as confettiShort } from './confetti.js'

// Foto delle tappe: Wikimedia Commons, licenza libera, attribuzione sempre visibile sotto la card.
// Le foto di Google Places non si possono ripubblicare: vedi CREDITS.md.
const FOTO = Object.fromEntries(fotoTappe.foto.map((f) => [f.id, f]))
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/'
// Il Duck Store è un negozio privato: nessuna foto libera, ci va una paperella disegnata qui.
const PAPERELLA = `<svg class="paperella" viewBox="0 0 64 48" aria-hidden="true" focusable="false">
  <path d="M6 34c0-6 6-10 13-10h10c7 0 12-4 12-10 0-5 4-9 9-9s9 4 9 9c0 4-2 7-5 9l-3 2c1 9-6 17-16 17H20C12 42 6 39 6 34z" fill="#F2B705"/>
  <circle cx="47" cy="13" r="2" fill="#0E1116"/>
  <path d="M55 15l7 2-7 3z" fill="#E8552E"/>
  <path d="M10 42h30c-3 3-8 4-14 4s-12-1-16-4z" fill="#E8552E"/>
</svg>`

export const haFoto = (stop) => !!FOTO[stop.venueId] || stop.venueId === 'duckstore'
// Blocco foto in cima alla card: 16:9, orario in sovrimpressione, fallback al mosaico se manca o non carica
function fotoBlocco(stop, eager) {
  const f = FOTO[stop.venueId]
  const ora = `<span class="card__foto-time tnum">${stop.timeStatus === 'stimato' ? '~' : ''}${esc(stop.time)}</span>`
  if (stop.venueId === 'duckstore') return `<div class="card__foto card__foto--icona">${PAPERELLA}${ora}</div>`
  if (!f) return ''
  return `<div class="card__foto">
    <img src="${BASE}${f.file}" width="800" height="450" alt="${esc(stop.venue?.name || stop.title)}" ${eager ? '' : 'loading="lazy" '}decoding="async">
    ${ora}
  </div>`
}
function attribuzione(stop) {
  const f = FOTO[stop.venueId]
  if (!f) return ''
  return `<p class="card__credito">foto: <a href="${esc(f.pagina)}" target="_blank" rel="noopener">${esc(f.autore || 'autore ignoto')} / ${esc(f.licenza)}</a></p>`
}

export function distChip(stop) {
  if (stop.distFromPrevM == null) return ''
  if (stop.distFromPrevM === 0) return `<span class="chip">${icon('map-pin')} stesso posto</span>`
  const auto = stop.distMode === 'auto' || stop.distMode === 'taxi'
  const d = fmtDist(stop.distFromPrevM)
  if (auto) return `<span class="chip">${icon('taxi')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min` : ' · taxi'}</span>`
  return `<span class="chip">${icon('walk')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min a piedi` : ''}</span>`
}

export function stopCard(stop, { person = null, isNow = false, nowLabel = 'adesso', showCheck = true, reveal = false, eager = false } = {}) {
  const done = store.isDone(stop.id)
  const mission = missionByStop(stop.id)
  const missionMine = mission && (!person || mission.people.includes(person))
  const v = stop.venue
  const prices = (stop.prices || []).map((p) => `<span class="chip chip--price">${esc(p.label)} · ${fmtEur(p.eur)}</span>`).join('')
  // Alcuni venue hanno il voto senza il numero di recensioni: si mostra quello che c'è, senza inventare
  const voto = v?.rating ? `<span class="chip">★ ${String(v.rating).replace('.', ',')}${v.reviews ? ` · ${v.reviews.toLocaleString('it-IT')}` : ''}</span>` : ''
  const details = (stop.details || []).map((d) => `<li class="${/ATTENZIONE|NON confermato|da verificare|da chiarire/i.test(d) ? 'alert' : ''}">${esc(d)}</li>`).join('')
  const acts = []
  if (stop.actions?.maps) acts.push(`<a class="btn" href="${mapsUrl(stop)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a>`)
  if (stop.actions?.taxi) acts.push(`<a class="btn" href="${taxiUrl(stop)}" data-taxi target="_blank" rel="noopener" title="Uber; in alternativa FREE NOW">${icon('taxi')} Taxi</a>`)
  if (stop.actions?.metro) acts.push(`<span class="btn btn--ghost" aria-label="Metro: ${esc(stop.actions.metro)}">${icon('train')} ${esc(stop.actions.metro)}</span>`)
  // Il nome del posto si ripete solo se non è già nel titolo: "Basílica de Santa Maria del Mar" due volte no
  const nomeFuoriDalTitolo = v && !stop.title.includes(v.name)
  const indirizzo = v?.addr && v.addr !== 'Barcelona' ? v.addr : ''
  const venueLine = v && (nomeFuoriDalTitolo || indirizzo)
    ? `<div class="card__venue">${[nomeFuoriDalTitolo ? esc(v.name) : '', indirizzo ? esc(indirizzo) : ''].filter(Boolean).join(' · ')}</div>`
    : ''
  const foto = fotoBlocco(stop, eager)
  return `<article class="card${done ? ' card--done' : ''}${isNow ? ' card--now' : ''}${foto ? ' card--conFoto' : ''}" data-stop="${stop.id}" style="--dc:${DAY_COLOR[stop.dayKey]}" aria-label="${esc(stop.title)}">
    ${foto}
    <div class="card__head">
      ${foto ? (isNow ? `<div class="card__time tnum card__time--adesso">${esc(nowLabel)}</div>` : '') : `<div class="card__time tnum">${stop.timeStatus === 'stimato' ? '~' : ''}${stop.time}${isNow ? `<small>${esc(nowLabel)}</small>` : ''}</div>`}
      <div class="grow">
        <h3 class="card__title">${esc(stop.title)}</h3>
        ${venueLine}
      </div>
    </div>
    <p class="card__why">${esc(stop.why)}</p>
    <div class="chips">${distChip(stop)}${voto}${prices}${badgeHtml(badgesFor(stop), reveal)}</div>
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : ''}
    ${details ? `<details><summary><span>Dettagli</span>${icon('chevron')}</summary><div class="card__more"><div><ul>${details}</ul></div></div></details>` : ''}
    ${showCheck ? `<label class="check"><input type="checkbox" data-done="${stop.id}" ${done ? 'checked' : ''} aria-label="Fatto: ${esc(stop.title)}"><span>Fatto</span>${missionMine ? `<span class="check__xp">+${mission.xp} XP · ${esc(mission.title)}</span>` : ''}</label>` : ''}
    ${attribuzione(stop)}
  </article>`
}

// Eventi delegati: animazione <details>, checkbox Fatto, fallback taxi.
// `signal` viene dall'AbortController della vista: al cambio vista i listener spariscono.
// Senza, si accumulavano su #app a ogni render e un tocco faceva più toggle.
export function bindCards(container, { signal, onChange } = {}) {
  container.addEventListener('error', (e) => {
    const img = e.target.closest?.('.card__foto img')
    if (!img) return
    const box = img.parentElement
    box.classList.add('card__foto--vuoto')
    img.remove()
  }, { signal, capture: true })
  container.addEventListener('click', (e) => {
    const sum = e.target.closest('summary')
    if (sum && container.contains(sum)) {
      const det = sum.parentElement
      if (det.open) {
        // chiusura animata: prima riduci la griglia, poi togli [open]
        e.preventDefault()
        const more = det.querySelector('.card__more')
        if (!more || getComputedStyle(more).transitionDuration === '0s') { det.open = false; return }
        more.style.gridTemplateRows = '0fr'
        const end = () => { more.style.gridTemplateRows = ''; det.open = false; more.removeEventListener('transitionend', end) }
        more.addEventListener('transitionend', end)
        setTimeout(end, 500)
      }
    }
    const taxi = e.target.closest('[data-taxi]')
    if (taxi) {
      // Se Uber non si apre entro 1,5 s (nessuna app), proponi FREE NOW
      setTimeout(() => { if (document.visibilityState === 'visible' && taxi.dataset.fb !== '1') { taxi.dataset.fb = '1'; taxi.href = TAXI_FALLBACK; taxi.innerHTML = `${icon('taxi')} FREE NOW` } }, 1500)
    }
  }, { signal })
  container.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-done]')
    if (!cb) return
    const id = cb.dataset.done
    const on = cb.checked // la verità è la casella, non un toggle
    const { mission, changed } = setStopDone(id, on, store.person)
    // Tutte le card della stessa tappa sulla pagina restano allineate
    container.querySelectorAll(`.card[data-stop="${id}"]`).forEach((card) => {
      card.classList.toggle('card--done', on)
      const other = card.querySelector('input[data-done]')
      if (other && other !== cb) other.checked = on
    })
    if (on && mission && changed) {
      confettiShort()
      toast(`+${mission.xp} XP · Zero fatica, tutto gusto`)
    } else if (on) {
      toast('Fatto. Avanti così.')
    } else if (mission && changed) {
      toast(`Tolta: ${mission.xp} XP in meno. Puoi rifarla quando vuoi.`)
    }
    onChange?.(id, on)
  }, { signal })
}
