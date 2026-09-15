let host = null
export function toast(ui, text, ms = 2200) {
  if (!host || !host.isConnected) { host = document.createElement('div'); host.className = 'rg-toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); ui.appendChild(host) }
  const el = document.createElement('div'); el.className = 'rg-toast'; el.textContent = text; host.appendChild(el)
  while (host.children.length > 3) host.firstChild.remove()
  setTimeout(() => { el.classList.add('rg-toast--out'); setTimeout(() => el.remove(), 260) }, ms)
}
