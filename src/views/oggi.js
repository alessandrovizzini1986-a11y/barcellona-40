// Vista Oggi: countdown prima del weekend, bento durante, "Missione compiuta" dopo
import { now, phase, countdownTo, dayKey, minutesUntil, fmtMinutes, currentStop, nextStop, isOverridden, parseLocal } from '../time.js'
import { stopsFor, stopsForDay, personById, checks, fmtDist, DAY_COLOR, missionsFor, percorsiDi, conOrario, days, durataDi } from '../data.js'
import { store } from '../store.js'
import { stopCard, bindCards, percorsoLink } from '../ui/card.js'
import { ring } from '../ui/ring.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'
import { openSheet } from '../ui/sheet.js'
import { xpFor, maxXpFor, doneCountFor, levelFor, summaryFor } from '../game.js'
import { big as confettiBig } from '../ui/confetti.js'
import { albumBanner, bindAlbum } from '../ui/album.js'
import { songCard, bindSong } from '../ui/song.js'
import { shareAlbum, bindShareAlbum } from '../ui/share-album.js'
import { PHOTO_ALBUM } from '../store.js'
import { timelineViaggio, bindViaggio, voli } from '../ui/viaggio.js'
import { evento } from '../stats.js'

const DAY_LABEL = { ven: 'Venerdì 16', sab: 'Sabato 17', dom: 'Domenica 18' }

// Il countdown punta al DECOLLO, non alla mezzanotte: è quello che si aspetta davvero.
// phase() invece cambia a mezzanotte (WEEKEND_START) e non si tocca: alle 4 del mattino, al parcheggio,
// il sito deve essere già una guida, non un conto alla rovescia. Sono due istanti diversi apposta.
const VOLO_ANDATA = voli.find((v) => v.tipo === 'andata')
const DECOLLO = parseLocal(`${VOLO_ANDATA.data}T${VOLO_ANDATA.partenza}`)
// Giulio e Manuel arrivano sabato con voli loro, che non tracciamo: per loro questo resta l'inizio
// del weekend, e la riga lo dice senza spacciargli un volo che non è il loro.
const rigaVolo = (person) => `${VOLO_ANDATA.persone.includes(person) ? '' : 'Il primo volo · '}${VOLO_ANDATA.volo} · Bologna ${VOLO_ANDATA.partenza}`

export function summaryText(person, key) {
  // Il riepilogo è il piano del giorno: le tappe opzionali restano sulla card, non nel messaggio.
  const stops = stopsForDay(person, key).filter(conOrario)
  const lines = stops.map((s) => {
    const v = s.venue
    const addr = v?.addr && v.addr !== 'Barcelona' ? v.addr : ''
    const dist = s.distFromPrevM ? ` (${fmtDist(s.distFromPrevM)})` : ''
    const name = v ? v.name : s.title
    return `${s.time} ${name}${addr ? ` – ${addr}` : ''}${dist}`
  })
  return `📍 ${DAY_LABEL[key]} · Barcelona 40\n${lines.join('\n')}`
}

export async function copyText(text, okMsg = 'Copiato, incollalo su WhatsApp') {
  try {
    await navigator.clipboard.writeText(text)
    toast(okMsg)
  } catch {
    openSheet({ title: 'Copia a mano', body: `<p class="muted">Gli appunti non sono disponibili: seleziona e copia il testo.</p><pre>${esc(text)}</pre>` })
  }
}

export async function render(root, { person, header, params }) {
  const p = personById(person)
  const ph = phase()
  const timers = []
  let html = ''

  if (ph === 'before') {
    html = header('Manca poco. Tutto è già deciso.') + `<section class="view">
      <div class="hero" aria-live="off">
        <div class="hero__label">Si parte venerdì 16 ottobre</div>
        <div class="countdown" id="cd" role="timer" aria-label="Countdown al decollo">${countdownHtml()}</div>
        <p class="faint">${esc(rigaVolo(person))}</p>
        <p class="muted">Zero fatica, tutto gusto. Quando atterri, il piano è già pronto.</p>
      </div>
      ${albumBanner({ line: 'Ogni foto che carichi finisce nello stesso posto. Stasera riguardate tutto insieme.' })}
      ${songCard({ line: 'Due minuti e quarantacinque. Dopo il terzo ascolto il ritornello non esce più.' })}
      ${person === 'ale' ? `<h2 class="section-title">Manda l'album ai ragazzi</h2>${shareAlbum()}` : ''}
      ${person === 'monne' ? speedBanner() : ''}
      ${isOverridden() ? `<p class="faint">Data simulata: ${now().toLocaleString('it-IT')}</p>` : ''}
    </section>`
    root.innerHTML = html
    bindAlbum(root)
    bindSong(root)
    if (person === 'ale') bindShareAlbum(root)
    const cd = root.querySelector('#cd')
    timers.push(setInterval(() => { cd.innerHTML = countdownHtml() }, 30_000))
    return () => timers.forEach(clearInterval)
  }

  if (ph === 'after') {
    const xp = xpFor(person), max = maxXpFor(person)
    const lv = levelFor(xp)
    html = header('Missione compiuta.') + `<section class="view">
      <div class="hero">
        <div class="hero__label">18 ottobre, sera</div>
        <h2 style="font-size:var(--fs-4)">Missione compiuta</h2>
        <p class="muted">Quaranta anni, tre giorni, una città. Zero fatica, tutto gusto.</p>
      </div>
      <div class="xp-head">
        ${ring(xp, max, `${xp}`, 'XP', `var(${p.color})`)}
        <div class="grow">
          <div class="xp-head__level">${esc(lv.current.title)}</div>
          <div class="xp-head__next">${doneCountFor(person)} missioni su ${missionsFor(person).length} completate · ${xp} XP su ${max}</div>
        </div>
      </div>
      <a class="btn album__cta btn--block" href="${PHOTO_ALBUM}" target="_blank" rel="noopener" aria-label="Guarda com'è andata, apre l'album foto">${icon('camera')} Guarda com'è andata</a>
      <button class="btn btn--block" id="export">${icon('download')} Esporta punteggio</button>
      <a class="btn btn--block" href="#/missioni">${icon('trophy')} Vedi missioni e classifica</a>
    </section>`
    root.innerHTML = html
    bindAlbum(root)
    root.querySelector('#export').addEventListener('click', () => {
      const s = summaryFor(person)
      copyText(store.export(s.person, s.xp, s.done), 'Punteggio copiato: mandalo agli altri')
    })
    if (!store.get('celebrated', false)) { store.set('celebrated', true); confettiBig() }
    return () => {}
  }

  // Durante il weekend
  const key = dayKey()
  const mine = stopsFor(person)
  const todays = stopsForDay(person, key)
  // Le tappe opzionali non hanno orario: non possono essere "Adesso" né "Prossima", altrimenti il sito
  // manderebbe la gente al casinò per averlo messo in fondo a una lista.
  const nxt = nextStop(mine.filter(conOrario))
  // "Adesso" = ultima tappa di oggi già iniziata; se non c'è ancora e la prossima è entro 45 min, è lei
  let cur = currentStop(todays.filter(conOrario))
  let imminent = false
  if (!cur && nxt && nxt.dayKey === key && minutesUntil(nxt.at) <= 45) { cur = nxt; imminent = true }
  // Il progresso conta il piano, non le opzioni: un casinò non spuntato non deve far sembrare
  // la giornata incompleta. La spunta resta, ma non pesa sull'anello.
  const piano = todays.filter(conOrario)
  const mioPiano = mine.filter(conOrario)
  const doneToday = piano.filter((s) => store.isDone(s.id)).length
  const allDoneCount = mioPiano.filter((s) => store.isDone(s.id)).length
  const openChecks = checks.filter((c) => !store.isChecked(c.id))
  // Chi riparte prima dell'ultimo giorno del weekend (Monne, sabato alle 10:20) finisce il viaggio mentre
  // gli altri continuano. Dopo la sua ultima tappa "Adesso" non è più una tappa: è un volo, e poi casa.
  // Lasciargli il taxi delle 08:15 come tappa corrente vuol dire dirgli che è ancora a Barcellona.
  const ultimaTappa = mioPiano[mioPiano.length - 1]
  const rientroPrima = !!(p.departure?.date && p.departure.date < days[days.length - 1].date)
  const ripartito = rientroPrima && !nxt && !!ultimaTappa && now() > ultimaTappa.at
  const atterraggio = ripartito && p.departure.landing ? parseLocal(`${p.departure.date}T${p.departure.landing}`) : null
  const aCasa = !!(atterraggio && now() >= atterraggio)

  html = header(`${DAY_LABEL[key]} · ${p.name}`) + `<section class="view">
    ${timelineViaggio(key, person)}
    ${albumBanner({ line: 'Ogni foto che carichi finisce nello stesso posto. Stasera riguardate tutto insieme.' })}
    ${songCard({ line: 'Due minuti e quarantacinque. Dopo il terzo ascolto il ritornello non esce più.' })}
    ${person === 'monne' && !ripartito ? speedBanner() : ''}
    <div class="bento">
      <div class="tile tile--accent span-2" style="--day:${DAY_COLOR[key]}">
        <div class="tile__label">Adesso</div>
        ${cur && !ripartito ? stopCard(cur, { person, isNow: true, nowLabel: imminent ? nextIn(cur) : etichettaAdesso(cur), eager: true }) + percorsoOra(cur, key, todays) : `<p class="muted">${ripartito ? (aCasa ? 'Tu a quest\'ora sei già a Bologna. Missione compiuta.' : `In volo verso Bologna · atterri alle ${esc(p.departure.landing)}.`) : 'La prima tappa di oggi non è ancora iniziata. Respira, c\'è tempo.'}</p>${aCasa ? `<a class="btn album__cta btn--block" href="${PHOTO_ALBUM}" target="_blank" rel="noopener" aria-label="Guarda com'è andata, apre l'album foto">${icon('camera')} Guarda com'è andata</a>` : ''}`}
      </div>
      <div class="tile">
        <div class="tile__label">Prossima</div>
        ${nxt ? `<div class="tile__big tnum">${nxt.time}</div><div><strong>${esc(nxt.title)}</strong></div><div class="faint">${nextIn(nxt)}</div><a class="btn btn--sm" href="#/programma/${nxt.dayKey}">${icon('list')} Programma</a>` : `<p class="muted">Nessun'altra tappa in programma per te.</p>`}
      </div>
      <div class="tile" id="progress">${progressHtml(allDoneCount, mioPiano.length, doneToday, piano.length, DAY_COLOR[key])}</div>
      <div class="tile">
        <div class="tile__label">Riepilogo di oggi</div>
        <p class="faint">Il piano di ${DAY_LABEL[key].split(' ')[0].toLowerCase()} pronto per WhatsApp.</p>
        <button class="btn btn--primary" id="copy" style="--day:${DAY_COLOR[key]}">${icon('copy')} Copia</button>
      </div>
      ${person === 'ale' ? `<div class="tile">
        <div class="tile__label">Da verificare</div>
        <div class="tile__big">${openChecks.length}</div>
        <p class="faint">${openChecks.length === 1 ? 'voce aperta' : 'voci aperte'}</p>
        <a class="btn btn--sm" href="#/info/verifiche">${icon('alert')} Apri</a>
      </div>` : `<div class="tile">
        <div class="tile__label">Missioni</div>
        <div class="tile__big tnum">${xpFor(person)} XP</div>
        <p class="faint">${esc(levelFor(xpFor(person)).current.title)}</p>
        <a class="btn btn--sm" href="#/missioni">${icon('trophy')} Apri</a>
      </div>`}
    </div>
    ${todays.length ? `<h2 class="section-title">Oggi per te <small>${piano.length} tappe${todays.length > piano.length ? ` · ${todays.length - piano.length} opzionale` : ''}</small></h2>
    <ol class="timeline" style="--dc:${DAY_COLOR[key]}">${piano.map((s) => `<li>${stopCard(s, { person, isNow: cur?.id === s.id && !ripartito, nowLabel: imminent && cur?.id === s.id ? nextIn(s) : etichettaAdesso(s), showCheck: true })}</li>`).join('')}${todays.length > piano.length ? `<li class="timeline__opzionale">Opzionale</li>${todays.filter((s) => !conOrario(s)).map((s) => `<li class="timeline__opz">${stopCard(s, { person, showCheck: true })}</li>`).join('')}` : ''}</ol>` : ''}
    ${isOverridden() ? `<p class="faint">Data simulata: ${now().toLocaleString('it-IT')}</p>` : ''}
  </section>`
  root.innerHTML = html
  bindAlbum(root)
  bindSong(root)
  const ac = new AbortController()
  bindViaggio(root, { signal: ac.signal })
  const progress = root.querySelector('#progress')
  bindCards(root, { signal: ac.signal, onChange: () => {
    // l'anello e il contatore di oggi si aggiornano subito, senza aspettare il prossimo render
    const doneAll = mioPiano.filter((s) => store.isDone(s.id)).length
    const doneDay = piano.filter((s) => store.isDone(s.id)).length
    if (progress) progress.innerHTML = progressHtml(doneAll, mioPiano.length, doneDay, piano.length, DAY_COLOR[key])
  } })
  root.querySelector('#copy')?.addEventListener('click', () => { evento('riepilogo-copia'); copyText(summaryText(person, key)) })
  return () => { ac.abort(); timers.forEach(clearInterval) }
}

// Il percorso della mezza giornata in corso: quello del blocco in cui cade la tappa di adesso
function percorsoOra(cur, key, todays) {
  const pc = percorsiDi(key).find((p) => p.stops.includes(cur.id))
  return pc ? percorsoLink(pc, todays) : ''
}

function progressHtml(doneAll, total, doneDay, totalDay, color) {
  return `<div class="tile__label">Progresso weekend</div>
    ${ring(doneAll, total, `${doneAll}/${total}`, 'tappe', color)}
    <div class="faint" style="text-align:center">Oggi ${doneDay}/${totalDay}</div>`
}

// "Adesso" resta l'ultima tappa iniziata (currentStop non cambia), ma la parola sopra la card dice la
// verità: finché dura è ADESSO, dopo è ULTIMA TAPPA. Senza durata dichiarata si contano 60 minuti.
function etichettaAdesso(stop) {
  const passati = -minutesUntil(stop.at)
  const finestra = durataDi(stop) ?? 60
  return passati < finestra ? 'adesso' : 'ultima tappa'
}

function nextIn(stop) {
  const m = minutesUntil(stop.at)
  if (m <= 0) return 'adesso'
  return `tra ${fmtMinutes(m)}`
}
function countdownHtml() {
  const c = countdownTo(DECOLLO)
  return `<div><b class="tnum">${c.days}</b><span>giorni</span></div><div><b class="tnum">${String(c.hours).padStart(2, '0')}</b><span>ore</span></div><div><b class="tnum">${String(c.mins).padStart(2, '0')}</b><span>min</span></div>`
}
export function speedBanner() {
  return `<a class="banner speed-banner" href="#/speedrun">${icon('zap')}<span>Modalità speedrun: sabato alle 08:15 sei fuori. Apri il piano.</span></a>`
}
