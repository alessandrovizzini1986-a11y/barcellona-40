// Card tappa: orario, titolo, "perché", chip distanza/prezzi, badge, azioni, dettagli, checkbox "Fatto"
import { icon } from './icons.js'
import { badges as badgeHtml } from './badge.js'
import { esc } from './html.js'
import { badgesFor, fmtDist, fmtEur, mapsUrl, taxiUrl, TAXI_FALLBACK, missionByStop, hasCoords, DAY_COLOR } from '../data.js'
import { store } from '../store.js'
import { toast } from './toast.js'
import { short as confettiShort } from './confetti.js'

export function distChip(stop) {
  if (stop.distFromPrevM == null) return ''
  if (stop.distFromPrevM === 0) return `<span class="chip">${icon('map-pin')} stesso posto</span>`
  const auto = stop.distMode === 'auto' || stop.distMode === 'taxi'
  const d = fmtDist(stop.distFromPrevM)
  if (auto) return `<span class="chip">${icon('taxi')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min` : ' · taxi'}</span>`
  return `<span class="chip">${icon('walk')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min a piedi` : ''}</span>`
}

export function stopCard(stop, { person = null, isNow = false, nowLabel = 'adesso', showCheck = true, reveal = false } = {}) {
  const done = store.isDone(stop.id)
  const mission = missionByStop(stop.id)
  const missionMine = mission && (!person || mission.people.includes(person))
  const v = stop.venue
  const prices = (stop.prices || []).map((p) => `<span class="chip chip--price">${esc(p.label)} · ${fmtEur(p.eur)}</span>`).join('')
  const details = (stop.details || []).map((d) => `<li class="${/ATTENZIONE|NON confermato|da verificare|da chiarire/i.test(d) ? 'alert' : ''}">${esc(d)}</li>`).join('')
  const acts = []
  if (stop.actions?.maps) acts.push(`<a class="btn" href="${mapsUrl(stop)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a>`)
  if (stop.actions?.taxi) acts.push(`<a class="btn" href="${taxiUrl(stop)}" data-taxi target="_blank" rel="noopener" title="Uber; in alternativa FREE NOW">${icon('taxi')} Taxi</a>`)
  if (stop.actions?.metro) acts.push(`<span class="btn btn--ghost" aria-label="Metro: ${esc(stop.actions.metro)}">${icon('train')} ${esc(stop.actions.metro)}</span>`)
  return `<article class="card${done ? ' card--done' : ''}${isNow ? ' card--now' : ''}" data-stop="${stop.id}" style="--dc:${DAY_COLOR[stop.dayKey]}" aria-label="${esc(stop.title)}">
    <div class="card__head">
      <div class="card__time tnum">${stop.timeStatus === 'stimato' ? '~' : ''}${stop.time}${isNow ? `<small>${esc(nowLabel)}</small>` : ''}</div>
      <div class="grow">
        <h3 class="card__title">${esc(stop.title)}</h3>
        ${v ? `<div class="card__venue">${esc(v.name)}${v.addr && v.addr !== 'Barcelona' ? ` · ${esc(v.addr)}` : ''}</div>` : ''}
      </div>
    </div>
    <p class="card__why">${esc(stop.why)}</p>
    <div class="chips">${distChip(stop)}${prices}${badgeHtml(badgesFor(stop), reveal)}</div>
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : ''}
    ${details ? `<details><summary><span>Dettagli</span>${icon('chevron')}</summary><div class="card__more"><div><ul>${details}</ul></div></div></details>` : ''}
    ${showCheck ? `<label class="check"><input type="checkbox" data-done="${stop.id}" ${done ? 'checked' : ''} aria-label="Fatto: ${esc(stop.title)}"><span>Fatto</span>${missionMine ? `<span class="check__xp">+${mission.xp} XP · ${esc(mission.title)}</span>` : ''}</label>` : ''}
    ${!hasCoords(stop) ? '' : ''}
  </article>`
}

// Eventi delegati: animazione <details>, checkbox Fatto, fallback taxi
export function bindCards(container, { person = null, onChange } = {}) {
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
  })
  container.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-done]')
    if (!cb) return
    const id = cb.dataset.done
    const nowDone = store.toggleDone(id)
    const card = cb.closest('.card')
    card?.classList.toggle('card--done', nowDone)
    const mission = missionByStop(id)
    if (nowDone && mission && (!person || mission.people.includes(person))) {
      store.completeMission(mission.id)
      confettiShort()
      toast(`+${mission.xp} XP · Zero fatica, tutto gusto`)
    } else if (nowDone) {
      toast('Fatto. Avanti così.')
    } else if (mission && store.isMissionDone(mission.id) && (!person || mission.people.includes(person))) {
      store.toggleMission(mission.id)
    }
    onChange?.(id, nowDone)
  })
}
