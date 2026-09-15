import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { shooters, keeper as keeperData } from '../../data/players.js'
// CHI TIRA?: card dei tiratori (Monne con anteprima a figura intera), Ale annunciato in porta
export function chiTira(ui, ASSETS, { current = null } = {}) {
  const ale = keeperData()
  const cards = shooters().map((p) => {
    const sw = p.maglia.tipo === 'strisce' ? `linear-gradient(90deg, ${p.maglia.colori[0]} 0 25%, ${p.maglia.colori[1]} 25% 50%, ${p.maglia.colori[0]} 50% 75%, ${p.maglia.colori[1]} 75%)` : p.maglia.colore
    const img = p.faceBust || p.face
    return `<button class="rg-card${current === p.id ? ' rg-card--on' : ''}" data-value="${p.id}" aria-label="Tira ${esc(p.nome)}, numero ${p.numero}">
      <span class="rg-card__jersey" style="background:${sw}"><b style="color:${p.maglia.numeroColore || '#F2E9DE'}">${p.numero}</b></span>
      <img class="rg-card__face${p.faceBust ? ' rg-card__face--bust' : ''}" src="${ASSETS}${img}" alt="" width="160" height="160" loading="eager" decoding="async">
      <span class="rg-card__name">${esc(p.nome)}</span>
    </button>`
  }).join('')
  return overlay(ui, `<h2 class="rg-title">Chi tira?</h2><p class="rg-sub">Tocca il tuo nome. In porta c'è ${esc(ale.nome)}, e parla troppo.</p><div class="rg-cards">${cards}</div>`, { label: 'Scelta del tiratore', cls: 'rg-overlay--top' })
}
