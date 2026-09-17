// Opzioni: audio, musica, vibrazione, riduci flash e shake, qualità, timing bar, reset progressi
export function opzioni(ui, settings, { onChange, onReset }) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'rg-overlay'
    const sw = (key, label) => `<label class="rg-switch"><span>${label}</span><input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''} aria-label="${label}"></label>`
    el.innerHTML = `<div class="rg-panel" role="dialog" aria-modal="true" aria-label="Opzioni">
      <h2 class="rg-title">Opzioni</h2>
      ${sw('audio', 'Effetti sonori')}${sw('music', 'Musica')}${sw('vibration', 'Vibrazione')}${sw('reduceFx', 'Riduci flash e shake')}${sw('timing', 'Barra del tempismo')}
      <label class="rg-field"><span>Qualità grafica</span><select data-key="quality" aria-label="Qualità grafica"><option value="auto" ${settings.quality === 'auto' ? 'selected' : ''}>Auto</option><option value="bassa" ${settings.quality === 'bassa' ? 'selected' : ''}>Bassa</option><option value="alta" ${settings.quality === 'alta' ? 'selected' : ''}>Alta</option></select></label>
      <div class="rg-row"><button class="rg-btn rg-btn--ghost" data-reset aria-label="Reset dei progressi">Reset progressi</button><button class="rg-btn rg-btn--primary" data-ok aria-label="Chiudi le opzioni">Fatto</button></div></div>`
    el.addEventListener('change', (e) => { const i = e.target.closest('[data-key]'); if (!i) return; settings[i.dataset.key] = i.type === 'checkbox' ? i.checked : i.value; onChange?.(settings) })
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-ok]')) { el.remove(); resolve() }
      if (e.target.closest('[data-reset]')) { if (confirm('Cancellare XP, sblocchi e classifiche del gioco? Il sito non viene toccato.')) { onReset?.(); el.remove(); resolve() } }
    })
    ui.appendChild(el)
  })
}
