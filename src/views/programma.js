// Programma: segmented Ven/Sab/Dom + timeline filtrata per persona
import { stopsForDay, personById, DAY_COLOR, days, contoDelGiorno, piove } from '../data.js'
import { store } from '../store.js'
import { icon } from '../ui/icons.js'
import { fmtMinutes } from '../time.js'
import { stopCard, bindCards, haFoto } from '../ui/card.js'
import { dayKey, currentStop } from '../time.js'
import { esc } from '../ui/html.js'
import { navigate } from '../router.js'
import { stepCards, bindViaggio } from '../ui/viaggio.js'

const KEYS = ['ven', 'sab', 'dom']
const LABEL = { ven: 'Ven 16', sab: 'Sab 17', dom: 'Dom 18' }

function emptyState(person, key) {
  const p = personById(person)
  if (person === 'monne' && key === 'dom') return 'Tu a quest\'ora sei già a Bologna. Missione compiuta.'
  if (key === 'ven' && (person === 'giulio' || person === 'manuel')) return `Venerdì tocca ad Alessandro e Monne. Tu entri in scena sabato alle ${p.arrival.time}.`
  return 'Nessuna tappa per te in questo giorno.'
}

// Il conto della giornata, scritto con i numeri veri: soste e cammino sono somme dei dati, non frasi.
function avvisoConto(giorno) {
  const c = contoDelGiorno(giorno)
  if (!c || !c.fine) return ''
  const totale = c.soste + c.cammino
  const margine = c.margine > 0
    ? `Restano ${fmtMinutes(c.margine)} di margine, non di più.`
    : 'Non resta margine: ogni sosta più lunga sposta l\'arrivo a casa.'
  // Il consiglio ha senso solo col giro asciutto: sotto la pioggia la Ciutadella è già tagliata a 15 minuti
  const taglio = piove() ? '' : ' Se slitti, taglia la Ciutadella da 45 a 25 minuti.'
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
  const prima = stops.findIndex(haFoto)
  const righe = [...stops.map((s, i) => ({ at: s.at, html: stopCard(s, { person, isNow: cur?.id === s.id, eager: i === prima }) })), ...passi]
    .sort((a, b) => a.at - b.at)
  root.innerHTML = header('Il programma, tappa per tappa') + `<section class="view">
    <div class="seg" role="tablist" aria-label="Giorno">
      ${KEYS.map((k) => `<button role="tab" aria-selected="${k === key}" data-day="${k}" style="--sc:${DAY_COLOR[k]}">${LABEL[k]}</button>`).join('')}
    </div>
    <div class="day-head" style="--dc:${DAY_COLOR[key]}">
      <h2>${esc(day.label)} ${day.date.slice(-2)} ottobre</h2>
      <span class="faint">${stops.length} ${stops.length === 1 ? 'tappa' : 'tappe'}${passi.length ? ` · ${passi.length} passi di viaggio` : ''}</span>
    </div>
    ${key === 'ven' ? toggleP(piove()) : ''}
    ${key === 'ven' && piove() ? `<div class="avviso">${icon('alert')}<span>Modalità pioggia: una sola tappa scoperta invece di sei. Montcada, Pont del Bisbe e Sant Felip Neri sono vicoli stretti, si cammina quasi sempre riparati.</span></div>` : ''}
    ${avvisoConto(stops)}
    ${righe.length ? `<ol class="timeline" style="--dc:${DAY_COLOR[key]}">${righe.map((r) => `<li>${r.html}</li>`).join('')}</ol>` : `<div class="empty">${emptyState(person, key)}</div>`}
  </section>`
  root.querySelector('#piove')?.addEventListener('change', (e) => {
    store.piove = e.target.checked // la preferenza resta sul telefono
    navigate('programma', key) // si ridisegna con gli orari ricalcolati
  })
  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]')
    if (b) navigate('programma', b.dataset.day)
  })
  const ac = new AbortController()
  bindCards(root, { signal: ac.signal })
  bindViaggio(root, { signal: ac.signal })
  return () => ac.abort()
}
