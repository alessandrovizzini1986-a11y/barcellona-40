// Bagni puliti vicino a ogni tappa (data/bagni.json): la riga "Bagno più vicino" sotto i dettagli della card,
// il pannello con come fare / orario / discrezione / telefono / Maps, l'elenco della sezione Info e i marker
// del layer "Bagni" della mappa. Hall di hotel 4-5 stelle dove si prende un caffè e si usano i bagni, più i
// pochi posti con biglietto che valgono: niente bagni pubblici, niente bar qualsiasi. Nessuna foto, solo testo.
import bagniJson from '../../data/bagni.json'
import { icon } from './icons.js'
import { badge } from './badge.js'
import { esc } from './html.js'
import { openSheet } from './sheet.js'
import { fmtDist } from '../data.js'
import { evento } from '../stats.js'

export const BAGNI = bagniJson.bagni
export const REGOLA = bagniJson.regola
export const DA_TENERE = bagniJson.daTenereAMente
export const PULIZIA = bagniJson.pulizia
const SEMPLICI = bagniJson.semplici
export const bagnoById = (id) => BAGNI.find((b) => b.id === id) || null

// Cosa c'è per una tappa: il bagno principale (hotel, con pannello) oppure una riga semplice (appartamento,
// ristorante), l'alternativa e le distanze calcolate da scripts/bagni-distanze.mjs.
export function bagnoDi(stopId) {
  const t = bagniJson.tappe[stopId]
  if (!t) return null
  const risolvi = (id) => (id ? bagnoById(id) || { id, semplice: SEMPLICI[id] || id } : null)
  return { ...t, prima: risolvi(t.prima), seconda: risolvi(t.seconda), dist: t.dist || {} }
}
export const distTesto = (d) => (d ? (d.m === 0 ? 'qui' : `${fmtDist(d.m)}${d.min ? ` · ${d.min} min` : ''}`) : '')
const hotel = (b) => /^Hotel/.test(b.cat)

// La riga nella card: una riga sola a 380 px (nome breve, metri, orario breve); i minuti stanno nel pannello.
// Con "appartamento" o "ristorante" è testo e basta; se c'è un piano B in hotel, il tocco apre quello.
export function rigaBagno(stop) {
  const b = bagnoDi(stop.id)
  if (!b) return ''
  const principale = b.prima?.lat ? b.prima : b.seconda?.lat ? b.seconda : null
  if (!principale) {
    return `<div class="bagno bagno--semplice" data-bagno-riga="${esc(stop.id)}" aria-label="Bagno più vicino: ${esc(b.semplice)}">${icon('bath')}<span class="bagno__txt"><b>${esc(b.semplice)}</b>${b.stimato ? ` ${badge('stimato')}` : ''}</span></div>`
  }
  const d = b.dist[principale.id]
  const testo = b.prima?.lat
    ? `<b>${esc(principale.breve)}</b>${d ? ` · ${d.m === 0 ? 'qui' : fmtDist(d.m)}` : ''} · ${esc(principale.orarioBreve)}`
    : `<b>${esc(b.semplice)}</b> · o ${esc(principale.breve)}${d ? ` · ${fmtDist(d.m)}` : ''}`
  return `<button class="bagno" type="button" data-bagno="${esc(principale.id)}" data-bagno-tappa="${esc(stop.id)}" data-bagno-riga="${esc(stop.id)}" aria-label="Bagno più vicino: ${esc(principale.nome)}${d ? `, ${distTesto(d)} a piedi` : ''}. Apri i dettagli">${icon('bath')}<span class="bagno__txt">${testo}</span>${icon('chevron')}</button>`
}

// La voce di elenco (sezione Info): nome, categoria, orario; il tocco apre lo stesso pannello.
export function voceBagno(b) {
  return `<button class="bagno-voce" type="button" data-bagno="${esc(b.id)}">${icon('bath')}<span class="bagno-voce__txt"><b>${esc(b.nome)}</b><span class="faint">${esc(b.cat)} · ${esc(b.orario)}</span></span></button>`
}

// Il pannello: come fare, orario, dov'è, discrezione a pallini, telefono, Maps a piedi, l'alternativa della tappa.
export function apriBagno(id, stopId = null) {
  const b = bagnoById(id)
  if (!b) return
  evento('bagno-apri', id)
  const t = stopId ? bagnoDi(stopId) : null
  const d = t?.dist[id]
  const alt = t ? (t.prima?.id === id ? t.seconda : t.prima) : null
  const altD = alt?.lat ? t.dist[alt.id] : null
  const pallini = `<span class="bagno__pallini" role="img" aria-label="Discrezione ${b.discrezione} su 5">${'●'.repeat(b.discrezione)}${'○'.repeat(5 - b.discrezione)}</span>`
  // La pulizia è una regola nostra (hall di hotel 4-5★ = bagni curati), non una recensione: si dice
  const stimato = hotel(b) ? 'Hall di hotel: puliti per regola, non per recensione.' : b.stimato ? 'Ragionamento nostro, non un dato confermato.' : ''
  openSheet({
    title: 'Bagno più vicino',
    body: `<div class="bagno-sheet" data-bagno-sheet="${esc(b.id)}">
      <h3 class="bagno-sheet__nome">${esc(b.nome)}</h3>
      <p class="muted">${esc(b.cat)} · ${esc(b.addr)}${d ? ` · <b>${esc(distTesto(d))}</b> a piedi` : ''}</p>
      <dl class="bagno-sheet__dati">
        <dt>Come fare</dt><dd>${esc(b.come)}</dd>
        <dt>Orario</dt><dd>${esc(b.orario)}</dd>
        <dt>Dov'è</dt><dd>${esc(b.dove)}</dd>
        <dt>Discrezione</dt><dd>${pallini}</dd>
        ${b.tel ? `<dt>Telefono</dt><dd><a href="tel:${esc(b.tel.replace(/\s/g, ''))}">${esc(b.tel)}</a></dd>` : ''}
        ${b.rating ? `<dt>Voto</dt><dd>★ ${String(b.rating).replace('.', ',')}${b.reviews ? ` · ${b.reviews.toLocaleString('it-IT')} recensioni` : ''}</dd>` : ''}
      </dl>
      ${b.nota ? `<p class="faint">${esc(b.nota)}</p>` : ''}
      ${t?.nota ? `<p class="faint">${esc(t.nota)}</p>` : ''}
      ${stimato ? `<p class="bagno-sheet__stimato">${badge('stimato')}<span>${esc(stimato)}</span></p>` : ''}
      <a class="btn btn--block" href="https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking" target="_blank" rel="noopener" data-bagno-maps="${esc(b.id)}">${icon('map-pin')} Maps, a piedi fin lì</a>
      ${alt ? (alt.lat ? `<button class="btn btn--ghost btn--block" type="button" data-bagno="${esc(alt.id)}" data-bagno-tappa="${esc(stopId)}">${icon('bath')} In alternativa: ${esc(alt.breve)}${altD ? ` · ${esc(distTesto(altD))}` : ''}</button>` : `<p class="faint">In alternativa: ${esc(alt.semplice)}</p>`) : ''}
    </div>`
  })
}

// Un solo ascoltatore per tutta la pagina: righe delle card (Programma e Oggi), voci della sezione Info,
// "In alternativa" dentro il pannello, popup della mappa. Il pannello si chiude da solo prima di riaprirsi.
let montato = false
export function montaBagni() {
  if (montato) return
  montato = true
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-bagno]')
    if (!el) return
    e.preventDefault()
    apriBagno(el.dataset.bagno, el.dataset.bagnoTappa || null)
  })
}
