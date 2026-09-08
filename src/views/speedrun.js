// Speedrun (Monne): f1→f8 + s2, timer live verso le 08:15 del 17/10, sveglia 07:15
import { stopsFor, stopById, personById, fmtDist } from '../data.js'
import { store } from '../store.js'
import { countdownTo, SPEEDRUN_DEADLINE, fmtClock, now } from '../time.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { copyText } from './oggi.js'
import { navigate } from '../router.js'

function timer() {
  const c = countdownTo(SPEEDRUN_DEADLINE)
  const hot = c.total > 0 && c.total <= 15 * 60e3
  const label = c.total <= 0 ? 'Sei fuori? Se sì, missione compiuta.' : c.days > 0 ? `${c.days} giorni e ${fmtClock(c)} alle 08:15 di sabato` : 'alle 08:15: fuori dall\'appartamento'
  return `<div class="speed-timer${hot ? ' speed-timer--hot' : ''}" role="timer" aria-live="${hot ? 'polite' : 'off'}"><div class="tile__label">Countdown speedrun</div><b class="tnum">${c.days > 0 ? `${c.days}g ${fmtClock(c)}` : fmtClock(c)}</b><span class="muted">${label}</span></div>`
}

export async function render(root, { person, header }) {
  if (person !== 'monne') { navigate('oggi'); return () => {} }
  const monne = personById('monne')
  const list = stopsFor('monne')
  const s2 = stopById('s2')
  root.innerHTML = header('Modalità speedrun · Monne') + `<section class="view">
    <a class="banner" href="#/programma/sab">${icon('zap')}<span>Ventisei ore a Barcellona. Ogni tappa conta, ogni minuto pure.</span></a>
    <div id="timer">${timer()}</div>
    <div class="tile tile--accent" style="--day:var(--giallo)">
      <div class="tile__label">Volo di ritorno</div>
      <div class="tile__big">FR5220 · 10:20</div>
      <p class="muted">Terminal 2, prenotazione ${esc(monne.arrival.booking)}. ${esc(s2.why)}</p>
      <ul class="chips"><li class="chip">${icon('alarm')} sveglia 07:15</li><li class="chip">${icon('taxi')} ${fmtDist(s2.distFromPrevM)} · ${s2.minFromPrev} min</li></ul>
      <div class="actions">
        <button class="btn btn--primary" id="alarm">${icon('alarm')} Imposta sveglia 07:15</button>
        <a class="btn" href="https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=41.3033401&dropoff[longitude]=2.076845" target="_blank" rel="noopener">${icon('taxi')} Taxi al T2</a>
      </div>
    </div>
    <h2 class="section-title">La tua timeline <small>${list.length} tappe</small></h2>
    <ol class="compact">${list.map((s) => `<li class="compact-item"><time>${s.dayKey === 'sab' ? 'sab ' : ''}${s.time}</time><span class="grow">${esc(s.title)}</span>${store.isDone(s.id) ? icon('check') : ''}</li>`).join('')}</ol>
    <div class="tile">
      <div class="tile__label">Cosa portare via dall'appartamento</div>
      <ul class="acc__body" style="padding:0">
        <li>Documento</li>
        <li>Carta d'imbarco FR5220 (prenotazione ${esc(monne.arrival.booking)})</li>
        <li>Bagaglio e caricabatterie</li>
        <li>Un'ultima occhiata in camera e in bagno, poi fuori</li>
      </ul>
    </div>
    <p class="faint">Giulio arriva in appartamento verso le 8:10–8:20: probabilmente non vi incrociate.</p>
  </section>`
  root.querySelector('#alarm').addEventListener('click', () => {
    copyText('Sveglia 07:15 – Barcelona 40', 'Copiato: apri Orologio → Sveglia, incolla come etichetta e imposta 07:15')
  })
  const t = setInterval(() => { const el = root.querySelector('#timer'); if (el) el.innerHTML = timer() }, 1000)
  return () => clearInterval(t)
}
