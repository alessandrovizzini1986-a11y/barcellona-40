// Onboarding "Chi sei?": overlay a schermo intero, 4 card grandi
import { people } from '../data.js'
import { store } from '../store.js'
import { esc } from '../ui/html.js'
import { short as confettiShort } from '../ui/confetti.js'
import { toast } from '../ui/toast.js'

export function renderOnboarding(root, onDone) {
  root.innerHTML = `<div class="overlay" role="dialog" aria-labelledby="ob-title">
    <div class="overlay__hero">
      <h1 id="ob-title">Barcelona <b>40</b></h1>
      <p>16–18 ottobre 2026 · Zero fatica, tutto gusto</p>
    </div>
    <h2 class="sr-only">Chi sei?</h2>
    <p class="muted" style="text-align:center;padding:0 var(--space-4)">Chi sei? Tocca il tuo nome: il programma si adatta a te.</p>
    <div class="people-grid">
      ${people.map((p) => `<button class="person-card" data-person="${p.id}" style="--pc:var(${p.color})" aria-label="Sono ${esc(p.name)}, ${esc(p.role)}">
        <span class="person-card__dot" aria-hidden="true"></span>
        <span class="person-card__name">${esc(p.name)}</span>
        <span class="person-card__role">${esc(p.role)}</span>
      </button>`).join('')}
    </div>
    <p class="faint" style="text-align:center;padding:0 var(--space-4) var(--space-6)">Puoi cambiare persona in ogni momento da Info → Profilo.</p>
  </div>`
  const onClick = (e) => {
    const b = e.target.closest('[data-person]')
    if (!b) return
    store.person = b.dataset.person
    confettiShort()
    const p = people.find((x) => x.id === b.dataset.person)
    toast(`Ciao ${p.name}. Zero fatica, tutto gusto.`)
    onDone?.()
  }
  root.addEventListener('click', onClick)
  return () => root.removeEventListener('click', onClick)
}
