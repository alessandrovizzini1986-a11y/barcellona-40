// Programma: segmented Ven/Sab/Dom + timeline filtrata per persona
import { stopsForDay, personById, DAY_COLOR, days } from '../data.js'
import { stopCard, bindCards } from '../ui/card.js'
import { dayKey, currentStop } from '../time.js'
import { esc } from '../ui/html.js'
import { navigate } from '../router.js'

const KEYS = ['ven', 'sab', 'dom']
const LABEL = { ven: 'Ven 16', sab: 'Sab 17', dom: 'Dom 18' }

function emptyState(person, key) {
  const p = personById(person)
  if (person === 'monne' && key === 'dom') return 'Tu a quest\'ora sei già a Bologna. Missione compiuta.'
  if (key === 'ven' && (person === 'giulio' || person === 'manuel')) return `Venerdì tocca ad Alessandro e Monne. Tu entri in scena sabato alle ${p.arrival.time}.`
  return 'Nessuna tappa per te in questo giorno.'
}

export async function render(root, { person, sub, header }) {
  const key = KEYS.includes(sub) ? sub : (dayKey() || 'ven')
  const day = days.find((d) => (d.label === 'Venerdì' && key === 'ven') || (d.label === 'Sabato' && key === 'sab') || (d.label === 'Domenica' && key === 'dom'))
  const stops = stopsForDay(person, key)
  const cur = currentStop(stops)
  root.innerHTML = header('Il programma, tappa per tappa') + `<section class="view">
    <div class="seg" role="tablist" aria-label="Giorno">
      ${KEYS.map((k) => `<button role="tab" aria-selected="${k === key}" data-day="${k}" style="--sc:${DAY_COLOR[k]}">${LABEL[k]}</button>`).join('')}
    </div>
    <div class="day-head" style="--dc:${DAY_COLOR[key]}">
      <h2>${esc(day.label)} ${day.date.slice(-2)} ottobre</h2>
      <span class="faint">${stops.length} ${stops.length === 1 ? 'tappa' : 'tappe'}</span>
    </div>
    ${stops.length ? `<ol class="timeline" style="--dc:${DAY_COLOR[key]}">${stops.map((s) => `<li>${stopCard(s, { person, isNow: cur?.id === s.id })}</li>`).join('')}</ol>` : `<div class="empty">${emptyState(person, key)}</div>`}
  </section>`
  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]')
    if (b) navigate('programma', b.dataset.day)
  })
  bindCards(root, { person })
  return () => {}
}
