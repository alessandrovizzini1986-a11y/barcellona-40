// Card tappa: orario, titolo, "perché", chip distanza/prezzi, badge, azioni, dettagli, checkbox "Fatto"
import { icon } from './icons.js'
import { badge, badges as badgeHtml } from './badge.js'
import { esc, escLink } from './html.js'
import { badgesFor, fmtDist, fmtEur, mapsUrl, taxiUrl, TAXI_FALLBACK, missionByStop, hasCoords, DAY_COLOR, durataDi, totaleTratta, piove } from '../data.js'
import { fmtMinutes } from '../time.js'
import { store } from '../store.js'
import fotoTappe from '../../data/foto-tappe.json'
import { setStopDone } from '../game.js'
import { toast } from './toast.js'
import { short as confettiShort } from './confetti.js'
import { evento, eventoGlobale } from '../stats.js'

// Immagini delle tappe. Il file da mostrare sta nel dato (`img` in data/itinerary.json e data/viaggio.json)
// e sono tutte foto vere: da Wikimedia Commons, con autore e licenza sotto la card, oppure private,
// fornite da chi c'era, con la riga "per gentile concessione". Le card disegnate non esistono più.
// Le foto di Google Places non si possono ripubblicare: vedi CREDITS.md.
const CREDITI = Object.fromEntries(fotoTappe.foto.map((f) => [`${f.id}.webp`, f]))
// Foto private: fornite da chi c'era, uso autorizzato. Non hanno una licenza libera e non stanno in
// CREDITS.md fra le Commons, ma un'attribuzione la meritano lo stesso.
const PRIVATE = new Set((fotoTappe.private || []).map((f) => `${f.id}.webp`))
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/assets/tappe/'
// Testo alternativo, uno per immagine: descrive cosa si vede, non ripete il titolo della card
const ALT = {
  'blq.webp': 'Il terminal dell\'aeroporto di Bologna visto dal piazzale',
  'bcn_t2.webp': 'La facciata del Terminal 2 dell\'aeroporto di Barcellona',
  'ciutadella.webp': 'Le fontane della Cascada Monumental al Parc de la Ciutadella',
  'brunells.webp': "L'ingresso della pasticceria Brunells, con l'insegna rossa e la vetrina del croissant",
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
  'macaya.webp': 'La facciata bianca del Palau Macaya, con i bassorilievi in pietra e il portale',
  'timeoutmarket.webp': 'Il palazzo di Maremagnum sul Moll d\'Espanya, che al secondo piano ospita il Time Out Market',
  'maremagnum.webp': 'Maremagnum e il Port Vell visti dal Moll de la Fusta, con le barche ormeggiate davanti',
  'elborn.webp': 'La sala in ferro e vetro dell\'antico mercato del Born, con le rovine del quartiere del 1714 visibili sotto il piano di calpestio',
  'apt.webp': 'L\'insegna illuminata dell\'Aparthotel Nàpols sopra l\'ingresso, di sera',
  'barjoan.webp': 'Il bancone del Bar Joan dentro il mercato, con le bottiglie alle spalle e la gente sugli sgabelli',
  'bomie.webp': 'L\'ingresso di BO&MIE, con l\'insegna Artisan Bakery & Speciality Coffee e la parete interna a mosaico colorato',
  'biarritz.webp': 'L\'insegna di legno della Bodega Biarritz e le lavagne dei pinchos sul marciapiede',
  'braseria.webp': 'Un cameriere della Brasería Sarrià porta la tartare servita in un mortaio di legno, col pane tostato',
  'canudas.webp': 'La reception in marmo della Sala VIP Canudas, con le lampade a sospensione',
  'casino.webp': 'L\'ingresso illuminato del Casino Barcelona di sera, con tre persone che escono',
  'olimpo.webp': 'L\'insegna rossa della Vermutería Olimpo, con la botte e le lavagne all\'ingresso',
  'parcheggio.webp': 'Il cartello "P2 Official Parking" sulla facciata del parcheggio di Bologna',
  'taps.webp': 'La vetrina viola dell\'enoteca Taps, con la botte davanti all\'ingresso',
  'teixido.webp': 'L\'interno di Teixidó, con l\'insegna in metallo Forners i Pastissers e il banco del pane in vista',
  'duckstore.webp': 'La vetrina del Barcelona Duck Store, con la Sagrada Família di mattoncini e le paperelle in fila'
}
export const haFoto = (stop) => !!stop.img && !stop.mini // la mini-tappa (Pausa casa) è compatta, senza foto

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
  if (PRIVATE.has(img)) return '<p class="card__credito">foto: per gentile concessione</p>'
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
  const piedi = percorso.mode === 'walking', taxi = percorso.mode === 'driving'
  // `percorsiDi` ha già scelto link, etichetta e tappe del caso (asciutto o pioggia): qui si legge e basta
  const totale = piedi && t.m ? `${fmtDist(t.m)} · ${fmtMinutes(t.min)} a piedi` : taxi && t.m ? `${fmtDist(t.m)} · ${fmtMinutes(t.min)} in taxi` : taxi ? 'In taxi' : 'Mezzi pubblici'
  const nota = t.fuoriPercorso.length ? ` · ${t.fuoriPercorso[0]} non è nel percorso` : ''
  return `<a class="btn btn--ghost btn--block percorso" href="${esc(percorso.url)}" target="_blank" rel="noopener"
    data-percorso="${esc(percorso.id)}" aria-label="Apri su Google Maps il percorso ${esc(percorso.label)}, ${esc(totale)}">
    ${icon(piedi ? 'route' : taxi ? 'taxi' : 'train')}
    <span class="percorso__txt"><b>Apri il percorso su Maps</b><small>${esc(percorso.label)} · ${esc(totale)}${esc(nota)}</small></span>
  </a>`
}

// Quanto si sta in una tappa: è un dato, non il buco fra due orari
export function durataChip(stop) {
  if (stop.saltata) return '' // saltata per pioggia: zero soste, niente chip
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
  // Con la pioggia alcune tappe cambiano senso (Santa Maria si visita dentro): testo e dettagli di pioggia
  const pioggia = piove()
  const why = pioggia && stop.whyPioggia ? stop.whyPioggia : stop.why
  const avviso = pioggia && stop.avvisoPioggia ? `<div class="avviso avviso--pioggia">${icon('rain')}<span>${esc(stop.avvisoPioggia)}</span></div>` : (stop.avviso ? `<div class="avviso">${icon('alert')}<span>${esc(stop.avviso)}</span></div>` : '')
  const details = [...(stop.details || []), ...(pioggia ? (stop.detailsPioggia || []) : [])].map((d) => `<li class="${/ATTENZIONE|NON confermato|da verificare|da chiarire/i.test(d) ? 'alert' : ''}">${escLink(d)}</li>`).join('')
  // Consigli nostri, non dati confermati: stanno nello stesso pannello ma sotto il badge "stimato",
  // così chi legge sa che è un ragionamento sulla zona e non un orario o un numero verificato.
  const stimati = (stop.detailsStimati || []).map((d) => `<li>${escLink(d)}</li>`).join('')
  const bloccoStimati = stimati ? `<div class="card__stimati"><p class="card__stimati-tit">${badge('stimato')}<span>ragionamento nostro, non un dato confermato</span></p><ul>${stimati}</ul></div>` : ''
  const acts = []
  if (stop.actions?.maps) acts.push(`<a class="btn" data-maps="${stop.id}" href="${mapsUrl(stop)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a>`)
  if (stop.actions?.taxi) acts.push(`<a class="btn" href="${taxiUrl(stop)}" data-taxi target="_blank" rel="noopener" title="Uber; in alternativa FREE NOW">${icon('taxi')} Taxi</a>`)
  if (stop.actions?.metro) acts.push(`<span class="btn btn--ghost" aria-label="Metro: ${esc(stop.actions.metro)}">${icon('train')} ${esc(stop.actions.metro)}</span>`)
  // Tappa raggiunta in taxi dall'aeroporto: Bolt e Uber accanto a Maps, con il blocco "da dare al tassista"
  if (stop.tassista) {
    acts.push(`<a class="btn" href="${linkBolt()}" data-taxi-bolt data-indirizzo="${esc(stop.tassista.indirizzo)}" title="Copia l'indirizzo e apre Bolt" aria-label="Bolt: copia l'indirizzo e apre l'app">${icon('taxi')} Bolt</a>`)
    acts.push(`<a class="btn" href="${esc(stop.tassista.uber)}" data-taxi-uber target="_blank" rel="noopener" title="Uber con la destinazione già impostata" aria-label="Uber, con la destinazione già impostata">${icon('taxi')} Uber</a>`)
  }
  // Il nome del posto si ripete solo se non è già nel titolo: "Basílica de Santa Maria del Mar" due volte no
  const nomeFuoriDalTitolo = v && !stop.title.includes(v.name)
  const indirizzo = v?.addr && v.addr !== 'Barcelona' ? v.addr : ''
  const venueLine = v && (nomeFuoriDalTitolo || indirizzo)
    ? `<div class="card__venue">${[nomeFuoriDalTitolo ? esc(v.name) : '', indirizzo ? esc(indirizzo) : ''].filter(Boolean).join(' · ')}</div>`
    : ''
  const foto = fotoBlocco(stop, eager)
  return `<article class="card${done ? ' card--done' : ''}${isNow ? ' card--now' : ''}${foto ? ' card--conFoto' : ''}${stop.saltata ? ' card--saltata' : ''}${stop.mini ? ' card--mini' : ''}" data-stop="${stop.id}" style="--dc:${DAY_COLOR[stop.dayKey]}" aria-label="${esc(stop.title)}${stop.saltata ? ', saltata per pioggia' : ''}">
    ${foto}
    <div class="card__head">
      ${stop.saltata ? `<div class="card__time card__time--opz card__time--saltata">${esc(stop.motivoPioggia || 'saltata per pioggia')}</div>` : foto ? (isNow ? `<div class="card__time tnum card__time--adesso">${esc(nowLabel)}</div>` : '') : `<div class="card__time ${stop.time == null ? 'card__time--opz' : 'tnum'}">${esc(etichettaOra(stop))}${isNow ? `<small>${esc(nowLabel)}</small>` : ''}</div>`}
      <div class="grow">
        <h3 class="card__title">${esc(stop.title)}</h3>
        ${venueLine}
      </div>
    </div>
    <p class="card__why">${esc(why)}</p>
    <div class="chips">${distChip(stop)}${durataChip(stop)}${voto}${prices}${badgeHtml(badgesFor(stop), reveal)}</div>
    ${avviso}
    ${stop.tassista ? tassistaHtml(stop.tassista) : ''}
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : ''}
    ${details || bloccoStimati ? `<details><summary><span>Dettagli</span>${icon('chevron')}</summary><div class="card__more"><div>${details ? `<ul>${details}</ul>` : ''}${bloccoStimati}</div></div></details>` : ''}
    ${showCheck ? `<label class="check"><input type="checkbox" data-done="${stop.id}" ${done ? 'checked' : ''} aria-label="Fatto: ${esc(stop.title)}"><span>Fatto</span>${missionMine ? `<span class="check__xp">+${mission.xp} XP · ${esc(mission.title)}</span>` : ''}</label>` : ''}
    ${attribuzione(stop)}
  </article>`
}

// DA DARE AL TASSISTA: l'indirizzo scritto grande, da mostrare allo schermo, e il pulsante che lo copia.
function tassistaHtml(t) {
  return `<div class="tassista" role="group" aria-label="Da dare al tassista">
    <div class="tassista__label">Da dare al tassista</div>
    <div class="tassista__addr">${esc(t.indirizzo)}</div>
    <div class="tassista__nota">${esc(t.nota)}</div>
    <button class="btn btn--sm" type="button" data-copia-indirizzo="${esc(t.indirizzo)}">${icon('copy')} Copia indirizzo</button>
  </div>`
}
// BOLT. Non esiste un deep link pubblico e documentato che imposti la destinazione: il tocco copia
// l'indirizzo negli appunti e apre l'app. Android: intent con il pacchetto dell'app (ee.mtakso.client,
// verificato sul Play Store) e il Play Store come ripiego; iOS: la pagina dell'App Store (id675033630,
// "Bolt: Request a Ride"); altrove il sito di Bolt.
export function linkBolt(ua = navigator.userAgent) {
  if (/Android/i.test(ua)) return 'intent://#Intent;package=ee.mtakso.client;scheme=bolt;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dee.mtakso.client;end'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'https://apps.apple.com/app/id675033630'
  return 'https://bolt.eu/'
}
// UBER, con la destinazione già impostata: il link universale ufficiale (m.uber.com/ul) sta nel dato
// (`tassista.uber`), scritto a mano e verificato come i percorsi: non si rigenera dalle coordinate.
async function copiaIndirizzo(testo, messaggio) {
  try { await navigator.clipboard.writeText(testo); toast(messaggio) } catch { toast(`Non riesco a copiare: ${testo}`, 4000) }
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
    const maps = e.target.closest('[data-maps]')
    if (maps) { evento('maps-tappa', maps.dataset.maps); eventoGlobale(`maps-tappa/${maps.dataset.maps}`) }
    const percorso = e.target.closest('[data-percorso]')
    if (percorso) evento('maps-percorso', percorso.dataset.percorso)
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
    const bolt = e.target.closest('[data-taxi-bolt]')
    if (bolt) { evento('taxi-bolt'); copiaIndirizzo(bolt.dataset.indirizzo, 'Indirizzo copiato: incollalo come destinazione in Bolt') }
    const uber = e.target.closest('[data-taxi-uber]')
    if (uber) evento('taxi-uber')
    const copia = e.target.closest('[data-copia-indirizzo]')
    if (copia) copiaIndirizzo(copia.dataset.copiaIndirizzo, 'Indirizzo copiato')
    const taxi = e.target.closest('[data-taxi]')
    if (taxi) {
      evento('taxi')
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
