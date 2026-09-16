import { esc } from '../components/esc.js'
// Sblocchi e traguardi: lista con stato; gli sblocchi ottenuti si equipaggiano con un tocco (pallone, esultanza, camera)
export function sblocchi(ui, data, { onEquip } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay rg-overlay--top'
    const render = () => {
      const { unlocks = [], achievements = [], level, xp = 0, next = null } = data
      el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="Sblocchi e traguardi">
      <h2 class="rg-title">Sblocchi</h2><p class="rg-sub">Livello ${level.n}: ${esc(level.title)} · ${xp} XP${next ? ` · ${next.toNext} al livello ${next.level.n}` : ''}</p>
      <ul class="rg-unlocks">${unlocks.map((u) => `<li class="${u.unlocked ? 'on' : ''}${u.equipped ? ' eq' : ''}">${u.unlocked && u.kind !== 'sfottò' ? `<button class="rg-unlock" data-equip="${u.id}" data-kind="${u.kind}" aria-pressed="${u.equipped}" aria-label="${esc(u.title)}${u.equipped ? ', in uso' : ', usa'}">` : '<div class="rg-unlock">'}<b>${u.unlocked ? (u.equipped ? '●' : '✓') : '🔒'} ${esc(u.title)}</b><span>${esc(u.unlocked ? u.desc : u.rule)}</span>${u.unlocked && u.kind !== 'sfottò' ? '</button>' : '</div>'}</li>`).join('')}</ul>
      <h3 class="rg-h3">Traguardi</h3>
      <ul class="rg-unlocks">${achievements.map((a) => `<li class="${a.unlocked ? 'on' : ''}"><div class="rg-unlock"><b>${a.unlocked ? '🏆' : '·'} ${esc(a.title)}</b><span>${esc(a.desc)}</span></div></li>`).join('')}</ul>
      <div class="rg-row"><button class="rg-btn rg-btn--primary" data-value="ok" aria-label="Chiudi">Chiudi</button></div></div>`
    }
    render()
    el.addEventListener('click', (e) => {
      const eq = e.target.closest('[data-equip]'); if (eq) { const upd = onEquip?.(eq.dataset.kind, eq.dataset.equip); if (upd) { data = upd; render() } return }
      if (e.target.closest('[data-value="ok"]')) { el.remove(); resolve('ok') }
    })
    ui.appendChild(el); el.querySelector('button')?.focus()
  })
}
