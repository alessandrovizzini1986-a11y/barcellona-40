import { esc } from '../components/esc.js'
// Esito: parola grande sul replay + riga di sfottò. Sparisce a replayEnd.
const WORD = { goal: 'GOL', save: 'PARATA', post: 'PALO', crossbar: 'TRAVERSA', miss: 'FUORI' }
export function showEsito(ui, { result, corner, taunt = '' }) {
  hideEsito(ui)
  const el = document.createElement('div'); el.className = `rg-esito rg-esito--${result}`; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'assertive')
  el.innerHTML = `<b>${corner ? 'INCROCIO' : (WORD[result] || result)}</b>${taunt ? `<span>${esc(taunt)}</span>` : ''}`
  ui.appendChild(el)
}
export function hideEsito(ui) { ui.querySelectorAll('.rg-esito').forEach((e) => e.remove()) }
