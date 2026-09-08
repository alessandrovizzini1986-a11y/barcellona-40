// Bottom sheet con focus trap leggero e chiusura con Esc / tap sullo sfondo
import { icon } from './icons.js'
let current = null
export function openSheet({ title, body, onOpen }) {
  closeSheet()
  const host = document.createElement('div')
  host.className = 'sheet-host'
  host.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
    <div class="sheet__handle" aria-hidden="true"></div>
    <div class="row"><h2 class="sheet__title grow">${title}</h2><button class="btn btn--icon btn--ghost" data-close aria-label="Chiudi">${icon('x')}</button></div>
    ${body}
  </div>`
  const prev = document.activeElement
  const close = () => { host.remove(); removeEventListener('keydown', onKey); current = null; prev?.focus?.() }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  host.addEventListener('click', (e) => { if (e.target === host || e.target.closest('[data-close]')) close() })
  addEventListener('keydown', onKey)
  document.body.appendChild(host)
  host.querySelector('[data-close]')?.focus()
  current = { close }
  onOpen?.(host.querySelector('.sheet'), close)
  return close
}
export function closeSheet() { current?.close() }
