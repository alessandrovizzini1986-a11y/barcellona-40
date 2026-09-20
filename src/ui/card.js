// Card tappa: orario, titolo, "perché", chip distanza/prezzi, badge, azioni, dettagli, checkbox "Fatto"
import { icon } from './icons.js'
import { badge, badges as badgeHtml } from './badge.js'
import { esc, escLink } from './html.js'
import { badgesFor, fmtDist, fmtEur, mapsUrl, taxiUrl, TAXI_FALLBACK, missionByStop, hasCoords, DAY_COLOR, durataDi, totaleTratta } from '../data.js'
import { fmtMinutes } from '../time.js'
import { store } from '../store.js'
import fotoTappe from '../../data/foto-tappe.json'
import { setStopDone } from '../game.js'
import { toast } from './toast.js'
import { short as confettiShort } from './confetti.js'

// Immagini delle tappe. Il file da mostrare sta nel dato (`img` in data/itinerary.json e data/viaggio.json):
// `.webp` = foto vera da Wikimedia Commons, con attribuzione obbligatoria sotto la card;
// `.svg` = card stilizzata generata da scripts/gen-cards.mjs, grafica originale del progetto, niente crediti.
// Le foto di Google Places non si possono ripubblicare: vedi CREDITS.md.
const CREDITI = Object.fromEntries(fotoTappe.foto.map((f) => [`${f.id}.webp`, f]))
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/assets/tappe/'
// Testo alternativo, uno per immagine: descrive cosa si vede, non ripete il titolo della card
const ALT = {
  'blq.webp': 'Il terminal dell\'aeroporto di Bologna visto dal piazzale',
  'bcn_t2.webp': 'La facciata del Terminal 2 dell\'aeroporto di Barcellona',
  'ciutadella.webp': 'Le fontane della Cascada Monumental al Parc de la Ciutadella',
  'santamaria.webp': 'La facciata illuminata della Basílica de Santa Maria del Mar, con il rosone e le due torri',
  'montcada.webp': 'La stradina della Placeta de Montcada, nel Born, con i balconi e la palma',
  'pontbisbe.webp': 'Il ponte gotico di Carrer del Bisbe visto dalla strada',
  'santfelip.webp': 'La fontana e la chiesa di Plaça de Sant Felip Neri',
  'santacaterina.webp': 'Il tetto ondulato e colorato del Mercat de Santa Caterina',
  'elpalace.webp': 'La facciata dell\'hotel El Palace',
  'sagrada.webp': 'Le torri della Sagrada Família viste dal basso',
  'monumental.webp': 'La Plaza Monumental, l\'ex arena di Barcellona',
  'apolo.webp': 'Un concerto alla Sala Apolo',
  'bunkers.webp': 'La vista su Barcellona dai Bunkers del Carmel',
  'elmirador.webp': 'L\'insegna di El Mirador, con la tenda blu e i tavoli all\'aperto',
  'elborn.webp': 'La sala in ferro e vetro dell\'antico mercato del Born, con le rovine del quartiere del 1714 visibili sotto il piano di calpestio',
  'parcheggio.svg': 'Illustrazione del parcheggio P2 di Bologna',
  'duckstore.svg': 'Illustrazione del Barcelona Duck Store',
  'barjoan.svg': 'Illustrazione del Bar Joan',
  'apt.svg': 'Illustrazione dell\'appartamento di Carrer de Nàpols',
  'taps.svg': 'Illustrazione dell\'Enoteca Taps',
  'braseria.svg': 'Illustrazione della Braseria Sarrià',
  'olimpo.svg': 'Illustrazione della Vermutería Olimpo',
  'biarritz.svg': 'Illustrazione della Bodega Biarritz 1881',
  'canudas.svg': 'Illustrazione della Sala VIP Canudas',
  'casino.svg': 'Illustrazione del Casino Barcelona'
}
export const haFoto = (stop) => !!stop.img

// Blocco immagine in cima alla card: 16:9, orario in sovrimpressione, mosaico se il file non carica
export function immagineCard(img, etichetta, { eager = false, classe = '', oraDebole = false } = {}) {
  if (!img) return ''
  return `<div class="card__foto ${classe}">
    <img src="${BASE}${esc(img)}" width="800" height="450" alt="${esc(ALT[img] || etichetta || '')}" ${eager ? '' : 'loading="lazy" '}decoding="async">
    ${etichetta ? `<span class="card__foto-time ${oraDebole ? 'card__foto-time--opz' : 'tnum'}">${esc(etichetta)}</span>` : ''}
  </div>`
}
// L'attribuzione è dovuta solo per le foto: le card stilizzate sono nostre
export function creditoImmagine(img) {
  const f = CREDITI[img]
  if (!f) return ''
  return `<p class="card__credito">foto: <a href="${esc(f.pagina)}" target="_blank" rel="noopener">${esc(f.autore || 'autore ignoto')} / ${esc(f.licenza)}</a></p>`
}
// Le tappe opzionali non hanno un orario da mostrare: al suo posto va detto cosa sono.
export const ORA_OPZIONALE = 'Se avete voglia'
export const etichettaOra = (stop) => (stop.time == null ? ORA_OPZIONALE : `${stop.timeStatus === 'stimato' ? '~' : ''}${stop.time}`)
const fotoBlocco = (stop, eager) => immagineCard(stop.img, etichettaOra(stop), { eager, oraDebole: stop.time == null })
const attribuzione = (stop) => creditoImmagine(stop.img)

export function distChip(stop) {
  if (stop.distFromPrevM == null) return ''
  if (stop.distFromPrevM === 0) return `<span class="chip">${icon('map-pin')} stesso posto</span>`
  const auto = stop.distMode === 'auto' || stop.distMode === 'taxi'
  const d = fmtDist(stop.distFromPrevM)
  if (auto) return `<span class="chip">${icon('taxi')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min` : ' · taxi'}</span>`
  return `<span class="chip">${icon('walk')} ${d}${stop.minFromPrev != null ? ` · ${stop.minFromPrev} min a piedi` : ''}</span>`
}

// Percorso di mezza giornata: apre Google Maps con tutte le tappe in fila. Il totale non è quello di
// Google, è la somma dei tratti delle nostre tappe: se i due numeri divergono, il nostro è verificabile.
export function percorsoLink(percorso, list) {
  const t = totaleTratta(percorso, list)
  const piedi = percorso.mode === 'walking'
  const totale = piedi && t.m ? `${fmtDist(t.m)} · ${fmtMinutes(t.min)} a piedi` : 'Mezzi pubblici'
  const nota = t.fuoriPercorso.length ? ` · ${t.fuoriPercorso[0]} non è nel percorso` : ''
  return `<a class="btn btn--ghost btn--block percorso" href="${esc(percorso.url)}" target="_blank" rel="noopener"
    data-percorso="${esc(percorso.id)}" aria-label="Apri su Google Maps il percorso ${esc(percorso.label)}, ${esc(totale)}">
    ${icon(piedi ? 'route' : 'train')}
    <span class="percorso__txt"><b>Apri il percorso su Maps</b><small>${esc(percorso.label)} · ${esc(totale)}${esc(nota)}</small></span>
  </a>`
}

// Quanto si sta in una tappa: è un dato, non il buco fra due orari
export function durataChip(stop) {
  const m = durataDi(stop)
  return m == null ? '' : `<span class="chip">${icon('clock')} ${fmtMinutes(m)}</span>`
}

export function stopCard(stop, { person = null, isNow = false, nowLabel = 'adesso', showCheck = true, reveal = false, eager = false } = {}) {
  const done = store.isDone(stop.id)
  const mission = missionByStop(stop.id)
  const missionMine = mission && (!person || mission.people.includes(person))
  const v = stop.venue
  const prices = (stop.prices || []).map((p) => `<span class="chip chip--price">${esc(p.label)} · ${fmtEur(p.eur)}</span>`).join('')
  // Alcuni venue hanno il voto senza il numero di recensioni: si mostra quello che c'è, senza inventare
  const voto = v?.rating ? `<span class="chip">★ ${String(v.rating).replace('.', ',')}${v.reviews ? ` · ${v.reviews.toLocaleString('it-IT')}` : ''}</span>` : ''
  const details = (stop.details || []).map((d) => `<li class="${/ATTENZIONE|NON confermato|da verificare|da chiarire/i.test(d) ? 'alert' : ''}">${escLink(d)}</li>`).join('')
  // Consigli nostri, non dati confermati: stanno nello stesso pannello ma sotto il badge "stimato",
  // così chi legge sa che è un ragionamento sulla zona e non un orario o un numero verificato.
  const stimati = (stop.detailsStimati || []).map((d) => `<li>${escLink(d)}</li>`).join('')
  const bloccoStimati = stimati ? `<div class="card__stimati"><p class="card__stimati-tit">${badge('stimato')}<span>ragionamento nostro, non un dato confermato</span></p><ul>${stimati}</ul></div>` : ''
  const acts = []
  if (stop.actions?.maps) acts.push(`<a class="btn" href="${mapsUrl(stop)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a>`)
  if (stop.actions?.taxi) acts.push(`<a class="btn" href="${taxiUrl(stop)}" data-taxi target="_blank" rel="noopener" title="Uber; in alternativa FREE NOW">${icon('taxi')} Taxi</a>`)
  if (stop.actions?.metro) acts.push(`<span class="btn btn--ghost" aria-label="Metro: ${esc(stop.actions.metro)}">${icon('train')} ${esc(stop.actions.metro)}</span>`)
  // Il nome del posto si ripete solo se non è già nel titolo: "Basílica de Santa Maria del Mar" due volte no
  const nomeFuoriDalTitolo = v && !stop.title.includes(v.name)
  const indirizzo = v?.addr && v.addr !== 'Barcelona' ? v.addr : ''
  const venueLine = v && (nomeFuoriDalTitolo || indirizzo)
    ? `<div class="card__venue">${[nomeFuoriDalTitolo ? esc(v.name) : '', indirizzo ? esc(indirizzo) : ''].filter(Boolean).join(' · ')}</div>`
    : ''
  const foto = fotoBlocco(stop, eager)
  return `<article class="card${done ? ' card--done' : ''}${isNow ? ' card--now' : ''}${foto ? ' card--conFoto' : ''}" data-stop="${stop.id}" style="--dc:${DAY_COLOR[stop.dayKey]}" aria-label="${esc(stop.title)}">
    ${foto}
    <div class="card__head">
      ${foto ? (isNow ? `<div class="card__time tnum card__time--adesso">${esc(nowLabel)}</div>` : '') : `<div class="card__time ${stop.time == null ? 'card__time--opz' : 'tnum'}">${esc(etichettaOra(stop))}${isNow ? `<small>${esc(nowLabel)}</small>` : ''}</div>`}
      <div class="grow">
        <h3 class="card__title">${esc(stop.title)}</h3>
        ${venueLine}
      </div>
    </div>
    <p class="card__why">${esc(stop.why)}</p>
    <div class="chips">${distChip(stop)}${durataChip(stop)}${voto}${prices}${badgeHtml(badgesFor(stop), reveal)}</div>
    ${stop.avviso ? `<div class="avviso">${icon('alert')}<span>${esc(stop.avviso)}</span></div>` : ''}
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : ''}
    ${details || bloccoStimati ? `<details><summary><span>Dettagli</span>${icon('chevron')}</summary><div class="card__more"><div>${details ? `<ul>${details}</ul>` : ''}${bloccoStimati}</div></div></details>` : ''}
    ${showCheck ? `<label class="check"><input type="checkbox" data-done="${stop.id}" ${done ? 'checked' : ''} aria-label="Fatto: ${esc(stop.title)}"><span>Fatto</span>${missionMine ? `<span class="check__xp">+${mission.xp} XP · ${esc(mission.title)}</span>` : ''}</label>` : ''}
    ${attribuzione(stop)}
  </article>`
}

// Eventi delegati: animazione <details>, checkbox Fatto, fallback taxi.
// `signal` viene dall'AbortController della vista: al cambio vista i listener spariscono.
// Senza, si accumulavano su #app a ogni render e un tocco faceva più toggle.
export function bindCards(container, { signal, onChange } = {}) {
  container.addEventListener('error', (e) => {
    const img = e.target.closest?.('.card__foto img')
    if (!img) return
    const box = img.parentElement
    box.classList.add('card__foto--vuoto')
    img.remove()
  }, { signal, capture: true })
  container.addEventListener('click', (e) => {
    const sum = e.target.closest('summary')
    if (sum && container.contains(sum)) {
      const det = sum.parentElement
      if (det.open) {
        // chiusura animata: prima riduci la griglia, poi togli [open]
        e.preventDefault()
        const more = det.querySelector('.card__more')
        if (!more || getComputedStyle(more).transitionDuration === '0s') { det.open = false; return }
        more.style.gridTemplateRows = '0fr'
        const end = () => { more.style.gridTemplateRows = ''; det.open = false; more.removeEventListener('transitionend', end) }
        more.addEventListener('transitionend', end)
        setTimeout(end, 500)
      }
    }
    const taxi = e.target.closest('[data-taxi]')
    if (taxi) {
      // Se Uber non si apre entro 1,5 s (nessuna app), proponi FREE NOW
      setTimeout(() => { if (document.visibilityState === 'visible' && taxi.dataset.fb !== '1') { taxi.dataset.fb = '1'; taxi.href = TAXI_FALLBACK; taxi.innerHTML = `${icon('taxi')} FREE NOW` } }, 1500)
    }
  }, { signal })
  container.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-done]')
    if (!cb) return
    const id = cb.dataset.done
    const on = cb.checked // la verità è la casella, non un toggle
    const { mission, changed } = setStopDone(id, on, store.person)
    // Tutte le card della stessa tappa sulla pagina restano allineate
    container.querySelectorAll(`.card[data-stop="${id}"]`).forEach((card) => {
      card.classList.toggle('card--done', on)
      const other = card.querySelector('input[data-done]')
      if (other && other !== cb) other.checked = on
    })
    if (on && mission && changed) {
      confettiShort()
      toast(`+${mission.xp} XP · Zero fatica, tutto gusto`)
    } else if (on) {
      toast('Fatto. Avanti così.')
    } else if (mission && changed) {
      toast(`Tolta: ${mission.xp} XP in meno. Puoi rifarla quando vuoi.`)
    }
    onChange?.(id, on)
  }, { signal })
}
