// Mercat de Mercats (extra di sabato, data/itinerary.json s98): il pannello "Programma completo" con il programma
// ufficiale tradotto (data/mercat.json). Tab per giorno con Sab 17 aperto di default, quattro sezioni ad accordion
// (La Bodegueta, Aula gastronomica, Palco del Lago, Palco degli Encants: quest'ultimo c'è solo sabato), le righe ★
// evidenziate in giallo, e in fondo la sezione fissa "Dove mangiare". Lo spazio famiglie non si mostra.
import mercatJson from '../../data/mercat.json'
import { icon } from './icons.js'
import { esc } from './html.js'
import { openSheet } from './sheet.js'
import { evento } from '../stats.js'

const GIORNO_DEFAULT = 'sab'
const giornoDi = (key) => mercatJson.giorni.find((g) => g.key === key) || mercatJson.giorni.find((g) => g.key === GIORNO_DEFAULT)

const riga = (e) => `<li class="mercat__riga${e.top ? ' mercat__riga--top' : ''}">
  <span class="mercat__ora tnum">${esc(e.ora)}</span>
  <span class="mercat__testo">${e.top ? '<span class="mercat__stella" aria-label="consigliata">★</span> ' : ''}${esc(e.testo)}</span>
</li>`

// Le sezioni di un giorno: la prima aperta, le altre chiuse. Una sezione senza eventi (gli Encants di venerdì
// e domenica) non si mostra: niente accordion vuoti.
export function sezioniHtml(key) {
  const g = giornoDi(key)
  const sezioni = mercatJson.sezioni.filter((s) => (g.eventi[s.id] || []).length)
  return `<div class="mercat__giorno" data-mercat-giorno="${esc(g.key)}">
    <p class="faint">${esc(g.label)} · ${esc(mercatJson.orari[g.key])} · ingresso gratuito</p>
    ${sezioni.map((s, i) => `<details class="mercat__sez" data-mercat-sez="${esc(s.id)}" ${i === 0 ? 'open' : ''}>
      <summary><span class="mercat__icona" aria-hidden="true">${s.icona}</span><span class="mercat__tit">${esc(s.titolo)}${s.sotto ? ` <small>${esc(s.sotto)}</small>` : ''}</span>${icon('chevron')}</summary>
      <ul class="mercat__lista">${g.eventi[s.id].map(riga).join('')}</ul>
    </details>`).join('')}
  </div>`
}

const mangiareHtml = () => `<div class="mercat__mangiare" data-mercat-mangiare>
  <h3 class="section-title">Dove mangiare</h3>
  ${mercatJson.mangiare.map((m) => `<p><b>${esc(m.titolo)}</b>${m.sotto ? ` <span class="faint">(${esc(m.sotto)})</span>` : ''}: ${m.voci.map(esc).join(' · ')}</p>`).join('')}
</div>`

export function pannelloMercat(key = GIORNO_DEFAULT) {
  const g = giornoDi(key)
  return `<div class="mercat-sheet" data-mercat-sheet>
    <div class="seg mercat__tabs" role="tablist" aria-label="Giorno del programma">
      ${mercatJson.giorni.map((x) => `<button type="button" role="tab" aria-selected="${x.key === g.key}" data-mercat-tab="${esc(x.key)}">${esc(x.label)}</button>`).join('')}
    </div>
    ${sezioniHtml(g.key)}
    <p class="mercat__legenda faint">★ = adatta a tre adulti senza programma fisso. Orari dal programma ufficiale del 13/10: con la pioggia possono cambiare.</p>
    ${mangiareHtml()}
    <a class="btn btn--ghost btn--block" href="${esc(mercatJson.fonte)}" target="_blank" rel="noopener">${icon('list')} Programma ufficiale (barcelona.cat)</a>
  </div>`
}

// Il pannello: si apre dal pulsante "Programma completo" della card. Il cambio di tab ridisegna solo il blocco
// del giorno, il resto del pannello resta fermo (e lo scroll pure).
export function apriMercat(key = GIORNO_DEFAULT) {
  evento('mercat-programma', key)
  openSheet({
    title: 'Mercat de Mercats · programma',
    body: pannelloMercat(key),
    onOpen: (sheet) => {
      sheet.querySelector('.mercat__tabs')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mercat-tab]')
        if (!b) return
        sheet.querySelectorAll('[data-mercat-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === b)))
        const giorno = sheet.querySelector('[data-mercat-giorno]')
        if (giorno) giorno.outerHTML = sezioniHtml(b.dataset.mercatTab)
      })
    }
  })
}

// Un solo ascoltatore sul documento, come per i bagni: la card si ridisegna, il listener no.
let montato = false
export function montaMercat() {
  if (montato) return
  montato = true
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-mercat-programma]')
    if (!el) return
    e.preventDefault()
    apriMercat(el.dataset.mercatProgramma || GIORNO_DEFAULT)
  })
}
