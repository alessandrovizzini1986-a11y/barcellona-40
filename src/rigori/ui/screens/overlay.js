// Overlay generico: pannello centrato, chiusura opzionale, promessa risolta dal click su [data-value]
export function overlay(ui, html, { label = 'Finestra', closable = false, cls = '' } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay ' + cls
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="${label}">${closable ? '<button class="rg-btn rg-btn--ghost rg-close" data-value="__close" aria-label="Chiudi">✕</button>' : ''}${html}</div>`
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-value]'); if (!b || b.disabled) return; el.remove(); resolve(b.dataset.value === '__close' ? null : b.dataset.value) })
    ui.appendChild(el)
    ;(el.querySelector('.rg-card--on') || el.querySelector('button'))?.focus()
    el.dataset.overlay = '1'
  })
}
