// Bottom sheet con focus trap leggero e chiusura con Esc / tap sullo sfondo
import { icon } from './icons.js'
let current = null
export function openSheet({ title, body, onOpen, onClose }) {
  closeSheet()
  const host = document.createElement('div')
  host.className = 'sheet-host'
  host.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
    <div class="sheet__handle" aria-hidden="true"></div>
    <div class="row"><h2 class="sheet__title grow">${title}</h2><button class="btn btn--icon btn--ghost" data-close aria-label="Chiudi">${icon('x')}</button></div>
    ${body}
  </div>`
  const prev = document.activeElement
  let chiuso = false
  // onClose viene chiamato da qualunque via d'uscita: pulsante, Esc, tap fuori, swipe.
  // Per le novità è quello che evita che il pannello ricompaia ossessivamente a chi lo scaccia.
  const close = () => {
    if (chiuso) return
    chiuso = true
    host.remove(); removeEventListener('keydown', onKey); current = null; prev?.focus?.()
    try { onClose?.() } catch { /* la chiusura non deve mai fallire */ }
  }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  host.addEventListener('click', (e) => { if (e.target === host || e.target.closest('[data-close]')) close() })
  addEventListener('keydown', onKey)
  // Swipe verso il basso: parte solo se il pannello è già in cima, altrimenti si sta scorrendo il testo
  const sheet = host.querySelector('.sheet')
  let y0 = null
  sheet.addEventListener('touchstart', (e) => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : null }, { passive: true })
  sheet.addEventListener('touchmove', (e) => {
    if (y0 == null) return
    const dy = e.touches[0].clientY - y0
    if (dy > 0) sheet.style.transform = `translateY(${Math.min(dy, 200)}px)`
  }, { passive: true })
  sheet.addEventListener('touchend', (e) => {
    if (y0 == null) return
    const dy = (e.changedTouches[0]?.clientY || y0) - y0
    sheet.style.transform = ''
    y0 = null
    if (dy > 60) close()
  })
  document.body.appendChild(host)
  host.querySelector('[data-close]')?.focus()
  current = { close }
  onOpen?.(host.querySelector('.sheet'), close)
  return close
}
export function closeSheet() { current?.close() }
