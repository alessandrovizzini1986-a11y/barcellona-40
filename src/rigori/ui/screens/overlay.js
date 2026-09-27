// Overlay generico: pannello centrato, chiusura opzionale, promessa risolta dal click su [data-value]
import { linkSito } from '../sito.js'
// `sito`: in fondo al pannello il pulsante per tornare al programma del weekend (un tocco, stessa scheda)
export function overlay(ui, html, { label = 'Finestra', closable = false, cls = '', sito = false } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay ' + cls
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="${label}">${closable ? '<button class="rg-btn rg-btn--ghost rg-close" data-value="__close" aria-label="Chiudi">✕</button>' : ''}${html}${sito ? linkSito() : ''}</div>`
    el.addEventListener('click', (e) => {
      // [data-share-toggle] apre e chiude il gruppo "Condividi" restando nel pannello
      const t = e.target.closest('[data-share-toggle]')
      if (t) { const box = el.querySelector('#' + t.getAttribute('aria-controls')); if (box) { box.hidden = !box.hidden; t.setAttribute('aria-expanded', String(!box.hidden)) } return }
      const b = e.target.closest('[data-value]'); if (!b || b.disabled) return; el.remove(); resolve(b.dataset.value === '__close' ? null : b.dataset.value)
    })
    ui.appendChild(el)
    ;(el.querySelector('[data-tira-io]') || el.querySelector('.rg-card--tu') || el.querySelector('button'))?.focus()
    el.dataset.overlay = '1'
  })
}
