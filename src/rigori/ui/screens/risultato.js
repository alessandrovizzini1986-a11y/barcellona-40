import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { ring } from '../components/ring.js'
// Risultato di fine modalità: riepilogo, XP, traguardi, condividi, rigioca
export function risultato(ui, { title, lines = [], xpGained = 0, xp = 0, level, next, achievements = [], shareText = '' }) {
  const wa = shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : null
  return overlay(ui, `<h2 class="rg-title">${esc(title)}</h2>
    <ul class="rg-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="rg-xp">${ring(next ? next.progress : 1, 1, `+${xpGained}`, 'XP')}<div><b>${esc(level.title)}</b><span>${xp} XP${next ? ` · ${next.toNext} al prossimo` : ' · livello massimo'}</span></div></div>
    ${achievements.length ? `<div class="rg-ach">${achievements.map((a) => `<span class="rg-ach__item">🏆 ${esc(a.title)}</span>`).join('')}</div>` : ''}
    <div class="rg-row">${wa ? `<a class="rg-btn rg-btn--primary" href="${wa}" target="_blank" rel="noopener" aria-label="Condividi su WhatsApp">Manda ai ragazzi</a>` : ''}<button class="rg-btn" data-value="again" aria-label="Rigioca">Rigioca</button><button class="rg-btn rg-btn--ghost" data-value="menu" aria-label="Torna al menu">Menu</button></div>`, { label: 'Risultato' })
}
