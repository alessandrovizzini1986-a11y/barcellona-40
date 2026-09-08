// Vista Mappa: import() lazy di Leaflet al primo accesso
import { stopsFor, hasCoords, DAY_COLOR, badgesFor } from '../data.js'
import { store } from '../store.js'
import { dayKey } from '../time.js'
import { icon } from '../ui/icons.js'
import { badges } from '../ui/badge.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'

const KEYS = ['ven', 'sab', 'dom']
const LABEL = { ven: 'Ven', sab: 'Sab', dom: 'Dom' }

export async function render(root, { person, header }) {
  const mine = stopsFor(person)
  const byDay = Object.fromEntries(KEYS.map((k) => [k, mine.filter((s) => s.dayKey === k)]))
  const active = new Set(KEYS.filter((k) => byDay[k].some(hasCoords)))
  const today = dayKey()
  if (today && active.has(today)) { active.clear(); active.add(today) }
  const missing = mine.filter((s) => !hasCoords(s))

  root.innerHTML = header('La città, tappa per tappa') + `<section class="view view--flush">
    <div class="map-wrap">
      <div id="map" aria-label="Mappa delle tappe" role="application"></div>
      <div class="map-skeleton" id="map-skel">${icon('map')}&nbsp; Carico la mappa…</div>
      <div class="map-controls">
        <div class="seg" role="group" aria-label="Giorni sulla mappa">
          ${KEYS.map((k) => `<button type="button" data-day="${k}" aria-pressed="${active.has(k)}" aria-selected="${active.has(k)}" style="--sc:${DAY_COLOR[k]}" ${byDay[k].some(hasCoords) ? '' : 'disabled'}>${LABEL[k]}</button>`).join('')}
        </div>
      </div>
      <button class="btn btn--icon map-locate" id="locate" aria-label="Dove sono">${icon('locate')}</button>
    </div>
    <div class="map-legend">
      <p class="faint">Numeri = ordine delle tappe del giorno. Tocca un marker per Maps.</p>
      ${missing.length ? `<h2 class="section-title">Senza coordinate <small>${missing.length}</small></h2>
      <div class="list">${missing.map((s) => `<div class="list-item" style="border-left:4px solid ${DAY_COLOR[s.dayKey]}"><div class="list-item__main"><span class="list-item__title">${s.time} · ${esc(s.title)}</span><span class="list-item__sub">${esc(s.venue?.name || '')}${s.venue?.addr && s.venue.addr !== 'Barcelona' ? ' · ' + esc(s.venue.addr) : ''}</span><span class="chips">${badges(badgesFor(s).filter((b) => b === 'geocoded' || b === 'da_verificare'))}</span></div></div>`).join('')}</div>` : ''}
    </section>`

  let ctl = null
  try {
    const { createMap } = await import('../map/leaflet.js')
    const el = root.querySelector('#map')
    if (!el) return () => {}
    ctl = createMap(el, byDay, { theme: store.theme })
    KEYS.forEach((k) => ctl.show(k, active.has(k)))
    ctl.fit([...active])
    root.querySelector('#map-skel')?.remove()
  } catch (e) {
    root.querySelector('#map-skel').textContent = 'Mappa non disponibile: usa i pulsanti Maps nel Programma.'
    toast('Mappa non caricata, apri Google Maps')
    return () => {}
  }
  root.querySelector('.map-controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]')
    if (!b || b.disabled) return
    const k = b.dataset.day
    if (active.has(k) && active.size === 1) return
    active.has(k) ? active.delete(k) : active.add(k)
    b.setAttribute('aria-pressed', active.has(k)); b.setAttribute('aria-selected', active.has(k))
    ctl.show(k, active.has(k))
    ctl.fit([...active])
  })
  root.querySelector('#locate').addEventListener('click', () => ctl.locate())
  return () => { try { ctl?.destroy() } catch { /* noop */ } }
}
