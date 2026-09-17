import { esc } from '../components/esc.js'
// Esito: parola grande sul replay + riga di sfottò. Sparisce a replayEnd.
// Riceve SOLO campi del record del tiro (esito, incrocio, chi tirava) e il testo già scelto: non legge
// nessuno stato globale, così non può mai mostrare l'esito o il turno di un altro tiro.
const WORD = { goal: 'GOL', save: 'PARATA', post: 'PALO', crossbar: 'TRAVERSA', miss: 'FUORI' }
export function showEsito(ui, { outcome, corner = false, shooterId = null, taunt = '' }) {
  hideEsito(ui)
  const el = document.createElement('div'); el.className = `rg-esito rg-esito--${outcome}`
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'assertive')
  if (shooterId) el.dataset.shooter = shooterId
  el.innerHTML = `<b>${corner ? 'INCROCIO' : (WORD[outcome] || outcome)}</b>${taunt ? `<span>${esc(taunt)}</span>` : ''}` +
    `<button class="rg-btn rg-btn--ghost rg-esito__share" data-share aria-label="Condividi questo momento">Condividi</button>`
  ui.appendChild(el)
}
export function hideEsito(ui) { ui.querySelectorAll('.rg-esito').forEach((e) => e.remove()) }
