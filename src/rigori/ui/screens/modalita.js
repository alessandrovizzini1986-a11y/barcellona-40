import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { PASS_PLAY_NAMES } from '../../data/players.js'
export const MODES_INFO = [
  { id: 'shootout', title: 'Shootout', desc: 'Best of 5 contro Ale, poi sudden death.' },
  { id: 'sfidaAle', title: 'Sfida Ale', desc: 'Tiri finché Ale ne para tre. Quanti gol fai?' },
  { id: 'passAndPlay', title: 'Pass-and-play', desc: 'Da 2 a 4 sullo stesso telefono. Classifica di serata.' },
  { id: 'skill', title: 'Skill', desc: 'Bersagli, incrocio, traversa. Trenta secondi.' },
  { id: 'boss', title: 'Boss: Ale in forma', desc: 'Tell quasi assenti, reattività +40%. Si sblocca al livello 5.' }
]
export async function modalita(ui, { bossUnlocked = false, level = 1 } = {}) {
  const html = `<h2 class="rg-title">Modalità</h2><div class="rg-modes">${MODES_INFO.map((m) => {
    const locked = m.id === 'boss' && !bossUnlocked
    return `<button class="rg-mode" data-value="${m.id}" ${locked ? 'disabled aria-disabled="true"' : ''} aria-label="${esc(m.title)}: ${esc(m.desc)}${locked ? ' (bloccata)' : ''}"><b>${esc(m.title)}${locked ? ' 🔒' : ''}</b><span>${esc(m.desc)}</span></button>`
  }).join('')}</div><div class="rg-row"><button class="rg-btn rg-btn--ghost" data-value="__opzioni" aria-label="Opzioni">Opzioni</button><button class="rg-btn rg-btn--ghost" data-value="__sblocchi" aria-label="Sblocchi e traguardi">Sblocchi</button><button class="rg-btn rg-btn--ghost" data-value="__chi" aria-label="Cambia tiratore">Cambia tiratore</button></div>`
  const v = await overlay(ui, html, { label: 'Scelta della modalità', cls: 'rg-overlay--top' })
  if (v === 'passAndPlay') {
    const names = await passPlayNames(ui)
    if (!names) return modalita(ui, { bossUnlocked, level })
    return { id: v, opts: { names } }
  }
  return { id: v, opts: {} }
}
// Scelta dei giocatori (2–4) tra i nomi ammessi
export function passPlayNames(ui) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay'
    const chosen = new Set(['Ale', 'Monne'])
    const render = () => { el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="Chi gioca">
      <h2 class="rg-title">Chi gioca?</h2><p class="rg-sub">Da due a quattro. Tira uno, para il prossimo.</p>
      <div class="rg-names">${PASS_PLAY_NAMES.map((n) => `<button class="rg-btn rg-name${chosen.has(n) ? ' rg-name--on' : ''}" data-name="${n}" aria-pressed="${chosen.has(n)}" aria-label="${n}">${n}</button>`).join('')}</div>
      <div class="rg-row"><button class="rg-btn rg-btn--ghost" data-back aria-label="Indietro">Indietro</button><button class="rg-btn rg-btn--primary" data-go ${chosen.size < 2 ? 'disabled' : ''} aria-label="Inizia con ${[...chosen].join(', ')}">Inizia (${chosen.size})</button></div></div>` }
    render()
    el.addEventListener('click', (e) => {
      const n = e.target.closest('[data-name]'); if (n) { const v = n.dataset.name; if (chosen.has(v)) chosen.delete(v); else if (chosen.size < 4) chosen.add(v); render(); return }
      if (e.target.closest('[data-back]')) { el.remove(); resolve(null) }
      if (e.target.closest('[data-go]') && chosen.size >= 2) { el.remove(); resolve(PASS_PLAY_NAMES.filter((x) => chosen.has(x))) }
    })
    ui.appendChild(el)
  })
}
