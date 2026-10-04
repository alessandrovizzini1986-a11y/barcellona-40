// Overlay generico: pannello centrato, chiusura opzionale, promessa risolta dal click su [data-value]
import { linkSito } from '../sito.js'

// GUARDIA DEI TOCCHI. Il tocco che chiude una schermata finisce (pointerup, click) quando la schermata nuova è
// già sotto il dito: su Android "Tocca per iniziare" mandava al programma perché il click atterrava su
// "Torna al programma" di "Chi tira?". Ogni schermata nuova ignora quindi i tocchi per 350 ms, a due livelli:
// pointer-events:none (vale anche per i link <a>) e un flag nel gestore dei click.
export const GUARDIA_MS = 350
export function guardia(el, ms = GUARDIA_MS) {
  const nata = performance.now()
  el.classList.add('rg-overlay--nata')
  setTimeout(() => el.classList.remove('rg-overlay--nata'), ms)
  return () => performance.now() - nata < ms
}
// Il focus programmatico serve solo a chi usa la tastiera: dopo un tocco farebbe comparire l'anello giallo
// (:focus-visible eredita dallo stato di prima) sul primo pulsante, che in "Chi tira?" sembra un "Sei tu".
let daTastiera = false
document.addEventListener('keydown', () => { daTastiera = true }, { capture: true })
document.addEventListener('pointerdown', () => { daTastiera = false }, { capture: true })
export const focusSeTastiera = (el) => { if (daTastiera && el) el.focus() }

// `sito`: in fondo al pannello il pulsante per tornare al programma del weekend (un tocco, stessa scheda)
export function overlay(ui, html, { label = 'Finestra', closable = false, cls = '', sito = false } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay ' + cls
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="${label}">${closable ? '<button class="rg-btn rg-btn--ghost rg-close" data-value="__close" aria-label="Chiudi">✕</button>' : ''}${html}${sito ? linkSito() : ''}</div>`
    const appenaNata = guardia(el)
    el.addEventListener('click', (e) => {
      if (appenaNata()) { e.preventDefault(); return }
      // [data-share-toggle] apre e chiude il gruppo "Condividi" restando nel pannello
      const t = e.target.closest('[data-share-toggle]')
      if (t) { const box = el.querySelector('#' + t.getAttribute('aria-controls')); if (box) { box.hidden = !box.hidden; t.setAttribute('aria-expanded', String(!box.hidden)) } return }
      const b = e.target.closest('[data-value]'); if (!b || b.disabled) return; el.remove(); resolve(b.dataset.value === '__close' ? null : b.dataset.value)
    })
    ui.appendChild(el)
    focusSeTastiera(el.querySelector('[data-tira-io]') || el.querySelector('.rg-card--tu') || el.querySelector('button'))
    el.dataset.overlay = '1'
  })
}
