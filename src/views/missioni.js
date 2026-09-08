// Missioni: ring XP, livello, lista missioni per persona, timer speedrun (Monne), badge, classifica
import { missionsFor, people, personById, stopById } from '../data.js'
import { store } from '../store.js'
import { now, countdownTo, SPEEDRUN_DEADLINE, fmtClock } from '../time.js'
import { xpFor, maxXpFor, levelFor, badgeStatus, summaryFor } from '../game.js'
import { ring } from '../ui/ring.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'
import { openSheet } from '../ui/sheet.js'
import { short as confettiShort, big as confettiBig } from '../ui/confetti.js'
import { copyText } from './oggi.js'

function timerHtml() {
  const c = countdownTo(SPEEDRUN_DEADLINE)
  // verde > 30 min, giallo tra 30 e 15 min, rosso sotto i 15 min
  const hot = c.total > 0 && c.total <= 15 * 60e3
  const warm = c.total > 15 * 60e3 && c.total <= 30 * 60e3
  if (c.total <= 0) return `<span class="mission__timer mission__timer--hot">00:00:00</span>`
  if (c.days > 0) return `<span class="mission__timer">${c.days} g ${fmtClock(c)}</span>`
  return `<span class="mission__timer${hot ? ' mission__timer--hot' : warm ? ' mission__timer--warm' : ''}" aria-live="${hot ? 'polite' : 'off'}">${fmtClock(c)}</span>`
}

function missionItem(m, person) {
  const done = store.isMissionDone(m.id)
  const stop = m.stopId ? stopById(m.stopId) : null
  return `<li class="mission${done ? ' mission--done' : ''}">
    <label class="check" style="min-height:44px"><input type="checkbox" data-mission="${m.id}" ${done ? 'checked' : ''} aria-label="${esc(m.title)}: ${esc(m.desc)}"></label>
    <div class="mission__main">
      <div class="mission__title">${esc(m.title)}</div>
      <div class="mission__desc">${esc(m.desc)}${stop ? ` · ${stop.time}` : ''}${m.unlocksBadge ? ` · sblocca “${esc(m.unlocksBadge)}”` : ''}</div>
      ${m.timer && person === 'monne' && !done ? `<div data-timer>${timerHtml()}</div>` : ''}
    </div>
    <div class="mission__xp">+${m.xp}</div>
  </li>`
}

function badgesHtml(person) {
  return badgeStatus(person).filter((b) => b.applies).map((b) => `<div class="badge-card ${b.unlocked ? 'badge-card--on' : 'badge-card--locked'}" data-badge="${b.id}">
    <div class="badge-card__icon">${icon(b.unlocked ? 'sparkles' : 'trophy')}</div>
    <div class="badge-card__title">${esc(b.title)}</div>
    <div class="badge-card__rule">${b.unlocked ? 'Sbloccato' : esc(b.rule)}</div>
  </div>`).join('')
}

function leaderboardHtml(person) {
  const scores = store.scores
  const rows = people.map((p) => {
    const mine = p.id === person
    const xp = mine ? xpFor(person) : (scores[p.id]?.xp ?? null)
    return { p, xp, mine }
  }).sort((a, b) => (b.xp ?? -1) - (a.xp ?? -1))
  return rows.map((r, i) => `<div class="list-item" style="border-left:4px solid var(${r.p.color})">
    <span class="tnum faint">${i + 1}</span>
    <div class="list-item__main"><span class="list-item__title">${esc(r.p.name)}${r.mine ? ' (tu)' : ''}</span><span class="list-item__sub">${r.xp == null ? 'Nessun punteggio importato' : esc(levelFor(r.xp).current.title)}</span></div>
    <span class="xp tnum">${r.xp == null ? '–' : r.xp + ' XP'}</span>
  </div>`).join('')
}

export async function render(root, { person, header }) {
  const p = personById(person)
  const timers = []
  const paint = () => {
    const xp = xpFor(person), max = maxXpFor(person)
    const lv = levelFor(xp)
    root.innerHTML = header('Missioni e classifica') + `<section class="view">
      <div class="xp-head">
        ${ring(xp, max, `${xp}`, 'XP', `var(${p.color})`)}
        <div class="grow">
          <div class="faint">Livello</div>
          <div class="xp-head__level">${esc(lv.current.title)}</div>
          <div class="xp-head__next">${lv.next ? `${lv.toNext} XP a “${esc(lv.next.title)}”` : 'Livello massimo. Leggenda.'}</div>
        </div>
      </div>
      <h2 class="section-title">Le tue missioni <small>${missionsFor(person).filter((m) => store.isMissionDone(m.id)).length}/${missionsFor(person).length}</small></h2>
      <ul class="stack" id="missions">${missionsFor(person).map((m) => missionItem(m, person)).join('')}</ul>
      <h2 class="section-title">Badge</h2>
      <div class="badges" id="badges">${badgesHtml(person)}</div>
      <h2 class="section-title">Classifica <small>4 giocatori</small></h2>
      <div class="list leaderboard" id="board">${leaderboardHtml(person)}</div>
      <div class="actions">
        <button class="btn btn--primary grow" id="export">${icon('download')} Esporta</button>
        <button class="btn grow" id="import">${icon('upload')} Importa</button>
      </div>
      <p class="faint">Esporta copia una stringa <code>b40:…</code>: mandala su WhatsApp. Chi la riceve la incolla con Importa e la classifica si aggiorna.</p>
    </section>`
  }
  paint()

  const unlockedBefore = new Set(badgeStatus(person).filter((b) => b.unlocked).map((b) => b.id))
  root.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-mission]')
    if (!cb) return
    const m = missionsFor(person).find((x) => x.id === cb.dataset.mission)
    const on = store.toggleMission(m.id)
    if (on) {
      if (m.stopId && !store.isDone(m.stopId)) store.toggleDone(m.stopId)
      confettiShort()
      toast(`+${m.xp} XP · Zero fatica, tutto gusto`)
    }
    paint()
    const after = badgeStatus(person).filter((b) => b.unlocked)
    const fresh = after.filter((b) => !unlockedBefore.has(b.id))
    if (fresh.length) {
      fresh.forEach((b) => { unlockedBefore.add(b.id); root.querySelector(`[data-badge="${b.id}"]`)?.classList.add('badge--reveal') })
      toast(`Badge sbloccato: ${fresh.map((b) => b.title).join(', ')}`)
      confettiBig()
    }
  })
  root.addEventListener('click', (e) => {
    if (e.target.closest('#export')) {
      const s = summaryFor(person)
      copyText(store.export(s.person, s.xp, s.done), 'Punteggio copiato: incollalo su WhatsApp')
    }
    if (e.target.closest('#import')) {
      openSheet({
        title: 'Importa punteggio',
        body: `<p class="muted" id="imp-help">Incolla la stringa che inizia con <code>b40:</code>.</p><textarea id="imp" aria-label="Stringa punteggio" aria-describedby="imp-help"></textarea><button class="btn btn--primary btn--block" id="imp-ok">${icon('check')} Aggiorna classifica</button>`,
        onOpen: (sheet, close) => {
          sheet.querySelector('#imp-ok').addEventListener('click', () => {
            try {
              const obj = store.import(sheet.querySelector('#imp').value)
              const who = personById(obj.person)
              toast(`${who ? who.name : obj.person}: ${obj.xp} XP in classifica`)
              close(); paint()
            } catch (err) { toast(err.message || 'Stringa non valida') }
          })
        }
      })
    }
  })
  if (person === 'monne') timers.push(setInterval(() => { root.querySelectorAll('[data-timer]').forEach((el) => { el.innerHTML = timerHtml() }) }, 1000))
  return () => timers.forEach(clearInterval)
}
