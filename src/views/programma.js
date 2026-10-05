// Programma: segmented Ven/Sab/Dom + timeline filtrata per persona
import { stopsForDay, personById, DAY_COLOR, days, contoDelGiorno, piove, macaya, percorsiDi, conOrario, senzaOrario, attiva } from '../data.js'
import { store } from '../store.js'
import { icon } from '../ui/icons.js'
import { fmtMinutes } from '../time.js'
import { stopCard, bindCards, haFoto, percorsoLink } from '../ui/card.js'
import { avvisoMiradorPioggia } from '../ui/pioggia.js'
import { dayKey, currentStop } from '../time.js'
import { esc } from '../ui/html.js'
import { navigate } from '../router.js'
import { stepCards, bindViaggio } from '../ui/viaggio.js'
import { evento } from '../stats.js'

const KEYS = ['ven', 'sab', 'dom']
const conteggio = (stops) => {
  const n = stops.filter(conOrario).filter(attiva).length, o = stops.filter(senzaOrario).length
  return `${n} ${n === 1 ? 'tappa' : 'tappe'}${o ? ` · ${o} opzionale${o === 1 ? '' : 'i'}` : ''}`
}
const LABEL = { ven: 'Ven 16', sab: 'Sab 17', dom: 'Dom 18' }

function emptyState(person, key) {
  const p = personById(person)
  if (person === 'monne' && key === 'dom') return 'Tu a quest\'ora sei già a Bologna. Missione compiuta.'
  if (key === 'ven' && (person === 'giulio' || person === 'manuel')) return `Venerdì tocca ad Alessandro e Monne. Tu entri in scena sabato alle ${p.arrival.time}.`
  return 'Nessuna tappa per te in questo giorno.'
}

// Il conto della giornata, scritto con i numeri veri: soste e cammino sono somme dei dati, non frasi.
function avvisoConto(giorno, key) {
  const c = contoDelGiorno(giorno)
  if (!c || !c.fine || c.tappe < 2) return ''
  const totale = c.soste + c.cammino
  const margine = c.margine > 0
    ? `Restano ${fmtMinutes(c.margine)} di margine, non di più.`
    : 'Non resta margine: ogni sosta più lunga sposta l\'arrivo a casa.'
  // Il consiglio ha senso solo col giro asciutto: sotto la pioggia la Ciutadella è già tagliata a 15 minuti
  const taglio = key === 'ven' && !piove() ? ' Se slitti, taglia la Ciutadella da 25 a 15 minuti.' : ''
  const dove = key === 'ven-pomeriggio' ? 'Pomeriggio con Palau Macaya: s' : 'S'
  return `<div class="avviso avviso--forte">${icon('clock')}<span>${dove}oste ${fmtMinutes(c.soste)} + cammino ${fmtMinutes(c.cammino)} = ${fmtMinutes(totale)} tra le ${esc(c.inizio)} e le ${esc(c.fine)}. ${margine}${taglio}</span></div>`
}
// Il venerdì mattina sta quasi tutto all'aperto e i Bunkers di domenica sono una collina scoperta: ottobre è il
// mese più piovoso dell'anno a Barcellona. Un solo interruttore per i due giorni: piove o non piove.
const TESTO_PIOVE = {
  ven: "Ottobre è il mese più piovoso a Barcellona e sei tappe su nove sono all'aperto. Accendi e il giro cambia: tutto al coperto, la Ciutadella salta.",
  dom: 'I Bunkers sono una collina scoperta: con la pioggia niente vista e terreno scivoloso. Accendi e la domenica cambia: mattina libera, pranzo al Time Out Market, pomeriggio al coperto a Maremagnum e taxi al T2 alle 19:30.'
}
const AVVISO_PIOVE = {
  ven: 'Modalità pioggia: la Ciutadella salta, Santa Maria del Mar si visita dentro, El Born al coperto. Montcada, Pont del Bisbe e Sant Felip Neri sono all\'aperto: con la pioggia si attraversano senza fermarsi.',
  dom: 'Modalità pioggia: mattina libera in appartamento, verso le 12:45 taxi a Maremagnum (3 km, 9 minuti). Pranzo al Time Out Market, pomeriggio al coperto, alle 19:30 taxi al T2: da lì tutto come previsto.'
}
// Palau Macaya: secondo interruttore del venerdì, sotto "Piove". Spento (default) il pomeriggio è quello di sempre;
// acceso entra la tappa delle 17:30 (gratis, al coperto) e il pomeriggio si ricalcola. Solo chi c'è il venerdì lo vede.
const TESTO_MACAYA = 'Opzionale, gratis e al coperto, sulla strada tra casa e il Rooftop. Accendi e il pomeriggio cambia: Taps alle 16:30 di corsa, bottiglie a casa, Palau Macaya alle 17:30, Rooftop dalle 18:15, cena invariata.'
function toggleM(on) {
  return `<label class="switch switch--macaya" for="macaya">
    <span><b>${icon('map-pin')} Palau Macaya</b><br><span class="faint">${esc(TESTO_MACAYA)}</span></span>
    <input type="checkbox" id="macaya" ${on ? 'checked' : ''}>
  </label>`
}
const cardMacayaOff = () => `<article class="card card--macaya-off" data-macaya-off><span>Palau Macaya · opzionale · gratis, sulla strada per il Rooftop · attivala per inserirla</span><button class="btn btn--sm" type="button" data-macaya-on>Attiva</button></article>`
function toggleP(on, key) {
  return `<label class="switch switch--piove" for="piove">
    <span><b>${icon('rain')} Piove</b><br><span class="faint">${esc(TESTO_PIOVE[key])}</span></span>
    <input type="checkbox" id="piove" ${on ? 'checked' : ''}>
  </label>`
}

export async function render(root, { person, sub, header }) {
  const key = KEYS.includes(sub) ? sub : (dayKey() || 'ven')
  const day = days.find((d) => (d.label === 'Venerdì' && key === 'ven') || (d.label === 'Sabato' && key === 'sab') || (d.label === 'Domenica' && key === 'dom'))
  const stops = stopsForDay(person, key)
  const cur = currentStop(stops)
  // I passi del viaggio (sveglia, parcheggio, volo) si mescolano alle tappe in ordine di orario:
  // sono card normali della stessa timeline, non un blocco a parte.
  const passi = stepCards(key, person)
  // la prima foto della pagina si carica subito, le altre in lazy
  // La prima foto della pagina è quella della prima tappa in programma: l'eager si aggancia all'id,
  // non alla posizione, perché le opzionali sono una lista a parte che riparte da zero.
  const primaFoto = stops.filter(conOrario).filter(attiva).find(haFoto)?.id
  const card = (s) => ({ at: s.at, id: s.id, html: stopCard(s, { person, isNow: cur?.id === s.id, eager: s.id === primaFoto }) })
  // Le tappe opzionali escono dalla timeline cronologica e vanno in coda, dopo la riga tratteggiata:
  // non hanno un orario, quindi non hanno un posto nella fila.
  const righe = [...stops.filter(conOrario).filter(attiva).map(card), ...passi].sort((a, b) => a.at - b.at)
  const opzionali = stops.filter(senzaOrario).map(card)
  // le tappe saltate per pioggia stanno in fondo, grigie, sotto la loro riga: si vede cosa si perde e perché
  const saltate = stops.filter((s) => s.saltata).map(card)
  // Palau Macaya spento: la card grigia sta in fondo al pomeriggio, dopo l'ultima tappa con orario del venerdì
  const vedeMacaya = key === 'ven' && stops.some((s) => s.id === 'f13')
  if (vedeMacaya && !macaya()) { const ultima = righe[righe.length - 1]; if (ultima) righe.push({ at: new Date(ultima.at.getTime() + 60000), id: null, html: cardMacayaOff() }) }
  // Il pulsante del percorso va in cima al suo blocco: si aggancia alla prima tappa del blocco
  // che questa persona vede davvero (chi salta la mattina non deve vedere il percorso della mattina).
  const ancore = new Map()
  for (const pc of percorsiDi(key)) {
    const primaDelBlocco = stops.find((s) => pc.stops.includes(s.id))
    if (primaDelBlocco) ancore.set(primaDelBlocco.id, percorsoLink(pc, stops))
  }
  root.innerHTML = header('Il programma, tappa per tappa') + `<section class="view">
    <div class="seg" role="tablist" aria-label="Giorno">
      ${KEYS.map((k) => `<button role="tab" aria-selected="${k === key}" data-day="${k}" style="--sc:${DAY_COLOR[k]}">${LABEL[k]}</button>`).join('')}
    </div>
    <div class="day-head" style="--dc:${DAY_COLOR[key]}">
      <h2>${esc(day.label)} ${day.date.slice(-2)} ottobre</h2>
      <span class="faint">${conteggio(stops)}${passi.length ? ` · ${passi.length} passi di viaggio` : ''}</span>
    </div>
    ${key === 'dom' && piove() ? avvisoMiradorPioggia() : ''}
    ${TESTO_PIOVE[key] ? toggleP(piove(), key) : ''}
    ${TESTO_PIOVE[key] && piove() ? `<div class="avviso">${icon('alert')}<span>${esc(AVVISO_PIOVE[key])}</span></div>` : ''}
    ${vedeMacaya ? toggleM(macaya()) : ''}
    ${avvisoConto(stops, key)}
    ${vedeMacaya && macaya() ? avvisoConto(stops.slice(stops.findIndex((s) => s.id === 'f13')), 'ven-pomeriggio') : ''}
    ${righe.length || opzionali.length ? `<ol class="timeline" style="--dc:${DAY_COLOR[key]}">${righe.map((r) => `${r.id && ancore.has(r.id) ? `<li class="timeline__percorso">${ancore.get(r.id)}</li>` : ''}<li>${r.html}</li>`).join('')}${opzionali.length ? `<li class="timeline__opzionale">Opzionale</li>${opzionali.map((r) => `<li class="timeline__opz">${r.html}</li>`).join('')}` : ''}${saltate.length ? `<li class="timeline__opzionale timeline__saltate">${saltate.length > 1 ? 'Saltate' : 'Saltata'} per pioggia</li>${saltate.map((r) => `<li class="timeline__opz timeline__saltata">${r.html}</li>`).join('')}` : ''}</ol>` : `<div class="empty">${emptyState(person, key)}</div>`}
  </section>`
  root.querySelector('#macaya')?.addEventListener('change', (e) => {
    if (e.target.checked) evento('macaya-attiva')
    store.macaya = e.target.checked // salvato in b40:v1:macaya
    navigate('programma', key)
  })
  root.querySelector('[data-macaya-on]')?.addEventListener('click', () => { evento('macaya-attiva'); store.macaya = true; navigate('programma', key) })
  root.querySelector('#piove')?.addEventListener('change', (e) => {
    if (e.target.checked) evento('piove-attiva')
    store.piove = e.target.checked // la preferenza resta sul telefono
    navigate('programma', key) // si ridisegna con gli orari ricalcolati
  })
  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]')
    if (b && b.dataset.day !== key) evento('giorno-cambia', b.dataset.day)
    if (b) navigate('programma', b.dataset.day)
  })
  const ac = new AbortController()
  bindCards(root, { signal: ac.signal })
  bindViaggio(root, { signal: ac.signal })
  return () => ac.abort()
}
