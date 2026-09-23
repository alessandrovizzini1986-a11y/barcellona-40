// Sezione Viaggio: voli, parcheggio col QR, lounge del ritorno, checklist del bagaglio a mano.
// Tutti i dati arrivano da data/viaggio.json (schermate di prenotazione): qui non si inventa e non si arrotonda.
import viaggio from '../../data/viaggio.json'
import { store } from '../store.js'
import { icon } from './icons.js'
import { badges as badgeHtml } from './badge.js'
import { immagineCard, creditoImmagine } from './card.js'
import { esc } from './html.js'
import { evento } from '../stats.js'
import { now } from '../time.js'

// Il sito è pubblicato sotto /barcellona-40/: un percorso assoluto "/assets/..." darebbe 404
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/'
export const QR_URL = BASE + viaggio.parcheggio.qr
export const { voli, parcheggio, lounge, checklist } = viaggio
export const timelineDi = (key) => viaggio.timeline[key] || null
// La timeline è fatta di passi di Alessandro (auto, P2, prenotazione TZWSXS): la vede chi ci sta dentro
export const haTimeline = (key, person) => { const t = timelineDi(key); return !!(t && t.persone.includes(person)) }
export const voliDi = (person) => voli.filter((v) => v.persone.includes(person))

// Data e ora assoluta di un passo. Il salto di giorno è dichiarato nel dato (giornoDopo), non dedotto
// dall'ora: il venerdì si parte alle 03:30 dello stesso giorno, la domenica si atterra alle 00:50 di lunedì.
function dataStep(key, step) {
  const t = timelineDi(key)
  const [y, m, d] = t.data.split('-').map(Number)
  const [h, mi] = step.ora.split(':').map(Number)
  const dt = new Date(y, m - 1, d, h, mi)
  if (step.giornoDopo) dt.setDate(dt.getDate() + 1)
  return dt
}

// ---------- Card ----------
export function cardVolo(v) {
  const rit = v.tipo === 'ritorno'
  return `<article class="card card--viaggio card--conFoto" data-volo="${esc(v.id)}">
    ${immagineCard(v.img, v.partenza)}
    <div class="card__head">
      <div class="grow">
        <h3 class="card__title">${esc(v.titolo)}</h3>
        <div class="card__venue">${esc(v.volo)} · arrivo ${esc(v.arrivo)}${v.arrivoNota ? ` (${esc(v.arrivoNota)})` : ''}</div>
      </div>
      <span class="viaggio-ic">${icon(rit ? 'plane-landing' : 'plane-takeoff')}</span>
    </div>
    <p class="card__why">${esc(v.copy)}</p>
    <div class="chips">
      <span class="chip">${icon('clock')} ${esc(v.durata || `${v.partenza} → ${v.arrivo}`)}</span>
      <span class="chip chip--price">prenotazione ${esc(v.prenotazione)}</span>
      ${badgeHtml(v.badges)}
    </div>
    ${(v.note || []).length ? `<ul class="viaggio-note">${v.note.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${creditoImmagine(v.img)}
  </article>`
}

export function cardParcheggio() {
  const p = parcheggio
  return `<article class="card card--viaggio card--qr card--conFoto">
    ${immagineCard(p.img, p.posto)}
    <div class="card__head">
      <div class="grow">
        <h3 class="card__title">${esc(p.nome)}</h3>
        <div class="card__venue">Entrata ${esc(p.entrata)} · Uscita ${esc(p.uscita)}</div>
      </div>
      <span class="viaggio-ic">${icon('car')}</span>
    </div>
    <p class="card__why">${esc(p.copy)}</p>
    <button class="qr-box" data-qr type="button" aria-label="Apri il QR del parcheggio a schermo pieno">
      <img class="qr-img" src="${QR_URL}" width="1024" height="1024" alt="QR del parcheggio P2, prenotazione ${esc(p.prenotazione)}" decoding="async">
      <span class="qr-box__cta">${icon('maximize')} Tocca per ingrandire</span>
    </button>
    <p class="qr-cap tnum">${esc(p.didascalia)}</p>
    <div class="chips">
      <span class="chip chip--price">${esc(p.prezzo)}</span>
      <span class="chip chip--ok">${icon('check')} ${esc(p.stato)}</span>
      ${badgeHtml(p.badges)}
    </div>
    <details><summary><span>Come si entra</span>${icon('chevron')}</summary><div class="card__more"><div><ul>
      ${p.accesso.map((r) => `<li>${esc(r)}</li>`).join('')}
    </ul></div></div></details>
  </article>`
}

export function cardLounge() {
  const l = lounge
  return `<article class="card card--viaggio card--conFoto">
    ${immagineCard(l.img, '20:20')}
    <div class="card__head">
      <div class="grow">
        <h3 class="card__title">${esc(l.nome)}</h3>
        <div class="card__venue">${esc(l.dove)} · ${esc(l.quando)}</div>
      </div>
      <span class="viaggio-ic">${icon('shower')}</span>
    </div>
    <p class="card__why">${esc(l.copy)}</p>
    <div class="chips">
      <span class="chip">${icon('clock')} ${esc(l.orari)}</span>
      <span class="chip">${esc(l.voto)} · ${l.recensioni} recensioni</span>
      ${l.servizi.map((s) => `<span class="chip chip--ok">${icon('check')} ${esc(s)}</span>`).join('')}
      ${badgeHtml(l.badges)}
    </div>
    <div class="avviso">${icon('alert')}<span>${esc(l.avviso)}</span></div>
    <div class="actions"><a class="btn" href="tel:${esc(l.telefono.replace(/\s/g, ''))}">${icon('phone')} ${esc(l.telefono)}</a></div>
    <details><summary><span>Cosa dicono le recensioni</span>${icon('chevron')}</summary><div class="card__more"><div><ul>
      ${l.avvertenze.map((a) => `<li class="alert">${esc(a)}</li>`).join('')}
    </ul></div></div></details>
  </article>`
}

// ---------- Checklist del bagaglio a mano (solo Alessandro) ----------
export function checklistViaggio() {
  const fatte = new Set(store.get(checklist.chiave, []))
  return `<div class="viaggio-check" data-checklist>
    <h3 class="section-title">${esc(checklist.titolo)} <small>${fatte.size}/${checklist.voci.length}</small></h3>
    <div class="stack checklist">${checklist.voci.map((v) => `
      <label class="check list-item" style="align-items:flex-start">
        <input type="checkbox" data-viaggio-check="${esc(v.id)}" ${fatte.has(v.id) ? 'checked' : ''} aria-label="${esc(v.testo)}">
        <span><span class="${fatte.has(v.id) ? 'is-done' : ''}">${esc(v.testo)}</span>${v.nota ? `<br><span class="faint">${esc(v.nota)}</span>` : ''}</span>
      </label>`).join('')}</div>
  </div>`
}

// ---------- Sezione completa per la vista Info ----------
export function sezioneViaggio(person) {
  const miei = voliDi(person)
  const suo = parcheggio.persone.includes(person)
  return `<div class="viaggio">
    ${miei.length ? miei.map(cardVolo).join('') : `<p class="faint">I tuoi voli non sono ancora nel sito: stanno nell'elenco "Da verificare".</p>${voli.filter((v) => v.id === 'andata').map(cardVolo).join('')}`}
    ${suo ? cardParcheggio() : ''}
    ${lounge.persone.includes(person) ? cardLounge() : ''}
    ${checklist.persone.includes(person) ? checklistViaggio() : ''}
  </div>`
}

// ---------- Timeline compatta (vista Oggi) ----------
export function timelineViaggio(key, person, { adesso = now() } = {}) {
  if (!haTimeline(key, person)) return ''
  const t = timelineDi(key)
  const passi = t.step.map((s) => ({ s, at: dataStep(key, s) }))
  // "adesso" = ultimo passo già iniziato, ma solo se è davvero quel giorno
  let cur = null
  for (const p of passi) { if (p.at <= adesso) cur = p.s.id; else break }
  return `<section class="viaggio-oggi">
    <h2 class="section-title">${esc(t.titolo)} <small>${t.step.length} passi</small></h2>
    <p class="faint">${esc(t.sottotitolo)}</p>
    ${t.avviso ? `<div class="avviso avviso--forte">${icon('alert')}<span>${esc(t.avviso)}</span></div>` : ''}
    <ol class="viaggio-tl">${passi.map(({ s, at }) => `
      <li class="viaggio-step${s.id === cur ? ' is-now' : ''}${at < adesso && s.id !== cur ? ' is-past' : ''}${s.evidenza ? ' is-key' : ''}">
        <time class="tnum">${esc(s.ora)}</time>
        <span class="viaggio-step__ic">${icon(s.icona)}</span>
        <span class="grow"><b>${esc(s.titolo)}</b>${s.dettaglio ? `<br><span class="faint">${esc(s.dettaglio)}</span>` : ''}</span>
      </li>`).join('')}</ol>
    ${t.nota ? `<p class="faint">${esc(t.nota)}</p>` : ''}
    <div class="actions">
      ${parcheggio.persone.includes(person) ? `<button class="btn" data-qr type="button">${icon('qr')} QR del parcheggio</button>` : ''}
      <a class="btn btn--ghost" href="#/info/viaggio">${icon('info')} Dettagli viaggio</a>
    </div>
  </section>`
}

// ---------- Card singole per la timeline del Programma ----------
// Tornano già ordinabili insieme alle tappe: stessa forma { at, html }
export function stepCards(key, person) {
  if (!haTimeline(key, person)) return []
  const t = timelineDi(key)
  return t.step.filter((s) => s.inProgramma !== false).map((s) => ({
    at: dataStep(key, s),
    html: `<article class="card card--viaggio card--step${s.evidenza ? ' card--step-key' : ''}" data-step="${esc(s.id)}">
      <div class="card__head">
        <div class="card__time tnum">${esc(s.ora)}${s.giornoDopo ? '<small>lun 19</small>' : ''}</div>
        <div class="grow"><h3 class="card__title">${esc(s.titolo)}</h3>
        ${s.dettaglio ? `<div class="card__venue">${esc(s.dettaglio)}</div>` : ''}</div>
        <span class="viaggio-ic">${icon(s.icona)}</span>
      </div>
      ${s.riferimento === 'parcheggio' ? `<div class="actions"><button class="btn btn--sm" data-qr type="button">${icon('qr')} QR del parcheggio</button></div>` : ''}
    </article>`
  }))
}

// ---------- QR a schermo pieno ----------
// Serve alla colonnina, di notte, in auto: sfondo bianco, QR al massimo, schermo che non si spegne.
let lock = null
async function tieniAcceso() {
  try { lock = (await navigator.wakeLock?.request('screen')) || null } catch { lock = null }
}
function rilascia() { try { lock?.release()?.catch(() => {}) } catch { /* già rilasciato */ } lock = null }

export function apriQr() {
  if (document.querySelector('.qr-full')) return
  const el = document.createElement('div')
  el.className = 'qr-full'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'QR del parcheggio a schermo pieno')
  el.innerHTML = `<img src="${QR_URL}" width="1024" height="1024" alt="QR del parcheggio P2, prenotazione ${esc(parcheggio.prenotazione)}">
    <p class="qr-full__cap tnum">${esc(parcheggio.didascalia)}</p>
    <p class="qr-full__hint">Alza la luminosità dello schermo e avvicinalo al lettore, a circa 10 cm</p>
    <button class="qr-full__x" type="button" aria-label="Chiudi">${icon('x')}</button>`
  document.body.appendChild(el)
  document.documentElement.classList.add('qr-open')
  tieniAcceso()
  // il wake lock salta quando la pagina va in background: si riprende al rientro
  const riprendi = () => { if (document.visibilityState === 'visible' && document.body.contains(el)) tieniAcceso() }
  document.addEventListener('visibilitychange', riprendi)
  // lo schermo intero non c'è ovunque (Safari iOS) e può essere rifiutato: l'overlay basta da solo
  try { el.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {}) } catch { /* resta l'overlay */ }
  const chiudi = () => {
    document.removeEventListener('visibilitychange', riprendi)
    document.removeEventListener('keydown', esci)
    rilascia()
    try { if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {}) } catch { /* già uscito */ }
    document.documentElement.classList.remove('qr-open')
    el.remove()
  }
  const esci = (e) => { if (e.key === 'Escape') chiudi() }
  document.addEventListener('keydown', esci)
  el.addEventListener('click', chiudi)
  return chiudi
}

// ---------- Eventi ----------
export function bindViaggio(root, { signal } = {}) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) { e.preventDefault(); evento('qr-parcheggio-apri'); apriQr() }
  }, { signal })
  root.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-viaggio-check]')
    if (!cb) return
    const arr = store.get(checklist.chiave, [])
    const id = cb.dataset.viaggioCheck
    store.set(checklist.chiave, cb.checked ? [...new Set([...arr, id])] : arr.filter((x) => x !== id))
    cb.parentElement.querySelector('span > span')?.classList.toggle('is-done', cb.checked)
    const n = store.get(checklist.chiave, []).length
    const small = root.querySelector('[data-checklist] .section-title small')
    if (small) small.textContent = `${n}/${checklist.voci.length}`
  }, { signal })
}
