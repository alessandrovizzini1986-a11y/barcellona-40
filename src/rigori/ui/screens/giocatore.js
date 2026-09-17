import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { byId, keeper as keeperData, STAT_LABELS } from '../../data/players.js'
// Conferma del giocatore: toccare una card in "Chi tira?" non fa partire la partita, apre questa.
// Volto grande, numero e maglia, due dritte sue e due sull'avversario in porta, statistiche a cinque tacche.
// Torna 'vai' (si gioca) oppure 'cambia' (si torna alla scelta).
const tacche = (n) => Array.from({ length: 5 }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')
const riga = (chiave, valore) => `<div class="rg-stat"><span>${STAT_LABELS[chiave] || chiave}</span><div class="rg-stat__bar" role="img" aria-label="${STAT_LABELS[chiave]}: ${valore} su 5">${tacche(valore)}</div></div>`
export function giocatore(ui, ASSETS, id) {
  const p = byId(id); if (!p) return Promise.resolve('vai')
  const ale = keeperData()
  const sw = p.maglia.tipo === 'strisce'
    ? `linear-gradient(90deg, ${p.maglia.colori[0]} 0 25%, ${p.maglia.colori[1]} 25% 50%, ${p.maglia.colori[0]} 50% 75%, ${p.maglia.colori[1]} 75%)`
    : p.maglia.colore
  const img = p.faceBust || p.face
  const stats = Object.entries(p.stats || {}).map(([k, v]) => riga(k, v)).join('')
  const dritte = (p.tips || []).map((t) => `<li>${esc(t)}</li>`).join('')
  const suAle = (ale.tips || []).map((t) => `<li>${esc(t)}</li>`).join('')
  return overlay(ui, `
    <div class="rg-player__top">
      <img class="rg-player__face" src="${ASSETS}${img}" alt="" width="200" height="200" loading="eager" decoding="async">
      <div class="rg-player__id">
        <h2 class="rg-title">${esc(p.nome)}</h2>
        <span class="rg-player__jersey" style="background:${sw}"><b style="color:${p.maglia.numeroColore || '#F2E9DE'}">${p.numero}</b></span>
      </div>
    </div>
    <div class="rg-stats">${stats}</div>
    <h3 class="rg-h3">Due dritte</h3>
    <ul class="rg-tips">${dritte}</ul>
    <h3 class="rg-h3">In porta c'è ${esc(ale.nome)}</h3>
    <ul class="rg-tips rg-tips--avv">${suAle}</ul>
    <div class="rg-row rg-player__actions">
      <button class="rg-btn rg-btn--giallo" data-value="vai">VAI</button>
      <button class="rg-btn rg-btn--ghost" data-value="cambia">Cambia</button>
    </div>`, { label: 'Conferma il giocatore: ' + p.nome, cls: 'rg-overlay--top rg-overlay--player' })
}
