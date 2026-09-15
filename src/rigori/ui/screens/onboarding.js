// Primo avvio: un tiro guidato. Freccia animata dal pallone, testo, saltabile, sparisce da solo dopo 10 s
export function onboarding(ui, ballOnScreen) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-onb'
    const b = ballOnScreen()
    el.innerHTML = `<div class="rg-onb__arrow" style="left:${b.x}px;top:${b.y}px" aria-hidden="true"></div><div class="rg-onb__text"><b>Trascina dal pallone</b><span>Verso l'angolo che vuoi. Più lungo, più forte. Curva il gesto per curvare il tiro.</span></div><button class="rg-btn rg-btn--ghost rg-onb__skip" data-skip aria-label="Salta il tutorial">Salta</button>`
    const done = () => { if (el.isConnected) el.remove(); resolve() }
    el.addEventListener('click', (e) => { if (e.target.closest('[data-skip]')) done() })
    ui.appendChild(el)
    setTimeout(done, 10000)
    el.done = done
  })
}
