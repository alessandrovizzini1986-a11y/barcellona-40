import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
// Sblocchi e traguardi: lista con stato
export function sblocchi(ui, { unlocks = [], achievements = [], level }) {
  return overlay(ui, `<h2 class="rg-title">Sblocchi</h2><p class="rg-sub">Livello ${level.n}: ${esc(level.title)}</p>
    <ul class="rg-unlocks">${unlocks.map((u) => `<li class="${u.unlocked ? 'on' : ''}"><b>${u.unlocked ? '✓' : '🔒'} ${esc(u.title)}</b><span>${esc(u.unlocked ? u.desc : u.rule)}</span></li>`).join('')}</ul>
    <h3 class="rg-h3">Traguardi</h3>
    <ul class="rg-unlocks">${achievements.map((a) => `<li class="${a.unlocked ? 'on' : ''}"><b>${a.unlocked ? '🏆' : '·'} ${esc(a.title)}</b><span>${esc(a.desc)}</span></li>`).join('')}</ul>
    <div class="rg-row"><button class="rg-btn rg-btn--primary" data-value="ok" aria-label="Chiudi">Chiudi</button></div>`, { label: 'Sblocchi e traguardi' })
}
