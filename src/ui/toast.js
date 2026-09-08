// Toast non bloccanti, con aria-live
let host = null
function ensureHost() {
  if (host) return host
  host = document.createElement('div')
  host.className = 'toast-host'
  host.setAttribute('role', 'status')
  host.setAttribute('aria-live', 'polite')
  document.body.appendChild(host)
  return host
}
export function toast(text, ms = 2600) {
  const h = ensureHost()
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = text
  h.appendChild(el)
  while (h.children.length > 3) h.firstChild.remove()
  setTimeout(() => { el.classList.add('toast--out'); setTimeout(() => el.remove(), 260) }, ms)
  return el
}
