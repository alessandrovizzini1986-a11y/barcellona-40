// Anello di progresso SVG (XP verso il prossimo livello)
export function ring(value, max, label, sub = '') {
  const r = 42, c = 2 * Math.PI * r, off = c * (1 - (max > 0 ? Math.min(1, value / max) : 0))
  return `<div class="rg-ring" role="img" aria-label="${label}${sub ? ', ' + sub : ''}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="${r}"/><circle class="fg" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><div class="rg-ring__label" aria-hidden="true">${label}${sub ? `<small>${sub}</small>` : ''}</div></div>`
}
