// Programma: segmented Ven/Sab/Dom + timeline filtrata per persona
import { stopsForDay, personById, DAY_COLOR, days, contoDelGiorno, piove, percorsiDi, conOrario, senzaOrario } from '../data.js'
import { store } from '../store.js'
import { icon } from '../ui/icons.js'
import { fmtMinutes } from '../time.js'
import { stopCard, bindCards, haFoto, percorsoLink } from '../ui/card.js'
import { dayKey, currentStop } from '../time.js'
import { esc } from '../ui/html.js'
import { navigate } from '../router.js'
import { stepCards, bindViaggio } from '../ui/viaggio.js'
import { evento } from '../stats.js'

const KEYS = ['ven', 'sab', 'dom']
const conteggio = (stops) => {
  const n = stops.filter(conOrario).length, o = stops.length - n
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
  const taglio = key === 'ven' && !piove() ? ' Se slitti, taglia la Ciutadella da 45 a 25 minuti.' : ''
  return `<div class="avviso avviso--forte">${icon('clock')}<span>Soste ${fmtMinutes(c.soste)} + cammino ${fmtMinutes(c.cammino)} = ${fmtMinutes(totale)} tra le ${esc(c.inizio)} e le ${esc(c.fine)}. ${margine}${taglio}</span></div>`
}
// Il venerdì mattina sta quasi tutto all'aperto e ottobre è il mese più piovoso dell'anno a Barcellona
function toggleP(on) {
  return `<label class="switch switch--piove" for="piove">
    <span><b>${icon('rain')} Piove</b><br><span class="faint">Ottobre è il mese più piovoso a Barcellona e sei tappe su otto sono all'aperto. Accendi e il giro cambia.</span></span>
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
  const primaFoto = stops.filter(conOrario).find(haFoto)?.id
  const card = (s) => ({ at: s.at, id: s.id, html: stopCard(s, { person, isNow: cur?.id === s.id, eager: s.id === primaFoto }) })
  // Le tappe opzionali escono dalla timeline cronologica e vanno in coda, dopo la riga tratteggiata:
  // non hanno un orario, quindi non hanno un posto nella fila.
  const righe = [...stops.filter(conOrario).map(card), ...passi].sort((a, b) => a.at - b.at)
  const opzionali = stops.filter(senzaOrario).map(card)
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
    ${key === 'ven' ? toggleP(piove()) : ''}
    ${key === 'ven' && piove() ? `<div class="avviso">${icon('alert')}<span>Modalità pioggia: una sola tappa scoperta invece di sei. Montcada, Pont del Bisbe e Sant Felip Neri sono vicoli stretti, si cammina quasi sempre riparati.</span></div>` : ''}
    ${avvisoConto(stops, key)}
    ${righe.length || opzionali.length ? `<ol class="timeline" style="--dc:${DAY_COLOR[key]}">${righe.map((r) => `${r.id && ancore.has(r.id) ? `<li class="timeline__percorso">${ancore.get(r.id)}</li>` : ''}<li>${r.html}</li>`).join('')}${opzionali.length ? `<li class="timeline__opzionale">Opzionale</li>${opzionali.map((r) => `<li class="timeline__opz">${r.html}</li>`).join('')}` : ''}</ol>` : `<div class="empty">${emptyState(person, key)}</div>`}
  </section>`
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
