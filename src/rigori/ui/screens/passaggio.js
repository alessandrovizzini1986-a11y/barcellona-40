// Pass-and-play: scelta nascosta della zona e passaggio del telefono. Promesse: si risolvono al tocco.
import { ZONES } from '../../game/keeper.js'
const LABEL = ['Alto sx', 'Alto centro', 'Alto dx', 'Basso sx', 'Basso centro', 'Basso dx']
export function pickZone(ui, { who }) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay'
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-label="Scelta del tuffo">
      <h2 class="rg-title">${who}, para tu</h2><p class="rg-sub">Scegli di nascosto dove tuffarti. Poi passa il telefono.</p>
      <div class="rg-zones">${ZONES.map((z, i) => `<button class="rg-btn rg-zone" data-z="${i}" aria-label="${LABEL[i]}">${LABEL[i]}</button>`).join('')}</div></div>`
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-z]'); if (!b) return; el.remove(); resolve(+b.dataset.z) })
    ui.appendChild(el)
  })
}
export function handoff(ui, name, text = 'Trascina dal pallone quando sei pronto.') {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay'
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-label="Passaggio del telefono"><h2 class="rg-title">Passa il telefono a ${name}</h2><p class="rg-sub">${text}</p><button class="rg-btn rg-btn--primary" data-ok>Sono ${name}, tiro io</button></div>`
    el.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) { el.remove(); resolve() } })
    ui.appendChild(el)
  })
}
