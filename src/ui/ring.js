// Anello di progresso SVG (stroke-dasharray)
export function ring(value, max, label, sub = '', color = '') {
  const r = 42, c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const off = c * (1 - pct)
  return `<div class="ring" role="img" aria-label="${label}${sub ? ', ' + sub : ''}" ${color ? `style="--rc:${color}"` : ''}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="${r}"/><circle class="fg" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <div class="ring__label" aria-hidden="true">${label}${sub ? `<small>${sub}</small>` : ''}</div>
  </div>`
}
