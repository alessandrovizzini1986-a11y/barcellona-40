// Meteo di Barcellona (Open-Meteo, senza chiave). Card compatta in Oggi, dal 9 al 18 ottobre: prima non ha
// senso, oltre i sette giorni la previsione non c'è. Se la rete manca o la risposta fallisce la card non
// compare: niente placeholder. Una richiesta ogni 30 minuti al massimo (cache in sessionStorage, anche
// degli errori). Il testo dice sempre "previsione": è quello che è.
import { now, todayIso, WEEKEND_END, pad2 } from '../time.js'
import { icon } from './icons.js'
import { esc } from './html.js'
import { evento } from '../stats.js'

export const METEO_DA = new Date(2026, 9, 9, 0, 0, 0)
export const meteoVisibile = (d = now()) => d >= METEO_DA && d < WEEKEND_END
// forecast_days=10, non 7: il 9 ottobre venerdì 16 è il settimo giorno e con 7 resterebbe fuori proprio
// il primo giorno che interessa (i giorni partono da oggi = 0).
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=41.3874&longitude=2.1686&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=Europe%2FMadrid&forecast_days=10'
const CACHE = 'b40:meteo:v1', TTL = 30 * 60 * 1000
const GIORNI = [['2026-10-16', 'Ven', 'Venerdì'], ['2026-10-17', 'Sab', 'Sabato'], ['2026-10-18', 'Dom', 'Domenica']]

// Codici WMO → sei icone Lucide. La neve (71-77, 85-86) a Barcellona a ottobre non esiste: va con la pioggia.
export function iconaMeteo(code) {
  if (code === 0) return 'sun'
  if (code === 1 || code === 2) return 'cloud-sun'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'cloud-fog'
  if (code >= 95) return 'cloud-lightning'
  return 'rain'
}
const isoDi = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const leggiCache = () => { try { const c = JSON.parse(sessionStorage.getItem(CACHE)); if (c && Date.now() - c.t < TTL) return c } catch { /* niente */ } return null }
const scriviCache = (d) => { try { sessionStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), d })) } catch { /* niente */ } }

// Dati o null. Non chiama mai l'API fuori dalla finestra e mai due volte in 30 minuti.
export async function caricaMeteo({ signal } = {}) {
  if (!meteoVisibile()) return null
  const c = leggiCache(); if (c) return c.d
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 8000)
  signal?.addEventListener('abort', () => ac.abort(), { once: true })
  let dati = null
  try {
    const r = await fetch(URL, { signal: ac.signal })
    if (r.ok) { const j = await r.json(); if (j?.hourly?.time?.length && j?.daily?.time?.length) dati = j }
  } catch { dati = null }
  clearTimeout(t)
  if (!signal?.aborted) scriviCache(dati)
  return dati
}

// Probabilità massima di pioggia di venerdì fra le 9 e le 14: il motivo vero del widget
export function pioggiaVenerdiMattina(dati) {
  const h = dati.hourly; let max = null
  h.time.forEach((t, i) => { if (t.startsWith('2026-10-16T')) { const ora = +t.slice(11, 13); if (ora >= 9 && ora <= 14 && h.precipitation_probability[i] != null) max = Math.max(max ?? 0, h.precipitation_probability[i]) } })
  return max
}

// La card. `piove`: stato del toggle del Programma. Torna '' solo se nei dati non c'è nemmeno un'ora.
// I DATI SONO SEMPRE REALI: con ?now= la data simulata può non stare nella previsione (il 15 ottobre
// chiesto il 27 settembre). Allora "adesso" è l'ora reale e i giorni sono i tre successivi disponibili;
// dal 9 ottobre in poi, senza simulazione, i due casi coincidono e si vedono Ven, Sab e Dom.
const NOMI_GIORNO = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const oraIso = (d) => `${isoDi(d)}T${pad2(d.getHours())}:00`
export function riferimento(dati, simulata = now()) {
  const h = dati.hourly
  let d = simulata, iOra = h.time.indexOf(oraIso(d))
  if (iOra < 0) { d = new Date(); iOra = h.time.indexOf(oraIso(d)) }
  if (iOra < 0) { iOra = h.time.findIndex((t) => t >= oraIso(d)); if (iOra < 0) iOra = h.time.length - 1 }
  return { iOra, oggi: h.time[iOra].slice(0, 10), ora: +h.time[iOra].slice(11, 13) }
}
export function meteoCard(dati, { piove = false } = {}) {
  const h = dati.hourly, g = dati.daily
  if (!h.time.length || !g.time.length) return ''
  const { iOra, oggi, ora } = riferimento(dati)
  let giorni = GIORNI.map(([iso, breve, lungo]) => ({ iso, breve, lungo, i: g.time.indexOf(iso) })).filter((x) => x.i >= 0)
  if (!giorni.length) giorni = g.time.map((iso, i) => ({ iso, i })).filter((x) => x.iso > oggi).slice(0, 3).map((x) => { const [y, m, gg] = x.iso.split('-').map(Number); const n = NOMI_GIORNO[new Date(y, m - 1, gg).getDay()]; return { ...x, breve: n, lungo: n } })
  const chips = (!giorni.some((x) => x.iso === oggi) && g.time.includes(oggi) ? [{ iso: oggi, breve: 'Oggi', lungo: 'Oggi', i: g.time.indexOf(oggi) }] : []).concat(giorni)
  if (!chips.length) return ''
  const scelto = chips.find((x) => x.iso === oggi) || chips[0]
  const prob = pioggiaVenerdiMattina(dati)
  const rigaPiove = prob != null && prob >= 50
    ? `<div class="meteo__piove">${icon('rain')}<span>${piove ? 'Piano coperto attivo.' : `Previsione: venerdì mattina ${prob} % di pioggia. Attivo il piano coperto?`}</span>${piove ? '' : '<button class="btn btn--sm" data-meteo-piove>Attiva</button>'}</div>`
    : ''
  return `<section class="meteo" data-meteo data-oggi="${oggi}" data-ora="${ora}" aria-label="Meteo di Barcellona, previsione">
    <button class="meteo__riga" data-meteo-toggle aria-expanded="false" aria-controls="meteo-dett">
      <span class="meteo__ora">${icon(iconaMeteo(h.weather_code[iOra]))}<span class="meteo__ora__testo"><b class="tnum">${Math.round(h.temperature_2m[iOra])}°</b><span class="meteo__dove">Barcellona, adesso</span></span></span>
      <span class="meteo__giorni">${giorni.map((x) => `<span><i>${icon(iconaMeteo(g.weather_code[x.i]))}${x.breve}</i><span class="tnum">${Math.round(g.temperature_2m_min[x.i])}/${Math.round(g.temperature_2m_max[x.i])}°</span></span>`).join('')}</span>
    </button>
    <div class="meteo__dett" id="meteo-dett" hidden>
      <div class="meteo__chips" role="tablist" aria-label="Giorno">${chips.map((x) => `<button class="chip${x.iso === scelto.iso ? ' chip--on' : ''}" role="tab" data-meteo-giorno="${x.iso}" aria-selected="${x.iso === scelto.iso}">${x.breve}</button>`).join('')}</div>
      <div class="meteo__striscia" data-meteo-striscia>${strisciaHtml(dati, scelto.iso, oggi, ora)}</div>
      <p class="meteo__sole" data-meteo-sole>${soleHtml(dati, scelto.iso)}</p>
      ${rigaPiove}
    </div>
  </section>`
}
// Ora per ora fino alle 23:00: oggi dall'ora attuale, gli altri giorni dalle 07:00
function strisciaHtml(dati, iso, oggi, oraAdesso) {
  const h = dati.hourly, da = iso === oggi ? oraAdesso : 7
  const cols = []
  h.time.forEach((t, i) => {
    if (!t.startsWith(iso + 'T')) return
    const ora = +t.slice(11, 13); if (ora < da || ora > 23) return
    const p = h.precipitation_probability[i]
    cols.push(`<div class="meteo__col${ora % 3 === 0 ? ' meteo__col--forte' : ''}" data-ora="${pad2(ora)}"><span class="meteo__h">${pad2(ora)}</span>${icon(iconaMeteo(h.weather_code[i]))}<b class="tnum">${Math.round(h.temperature_2m[i])}°</b><span class="meteo__p tnum">${p != null && p > 20 ? `${p} %` : ''}</span></div>`)
  })
  return cols.join('')
}
function soleHtml(dati, iso) {
  const i = dati.daily.time.indexOf(iso); if (i < 0) return ''
  const hm = (s) => (s || '').slice(11, 16)
  return `${icon('sunrise')} alba ${hm(dati.daily.sunrise[i])} · ${icon('sunset')} tramonto ${hm(dati.daily.sunset[i])} · previsione`
}

// Monta la card nello slot quando i dati arrivano. `onPiove` accende il toggle del Programma.
export const slotMeteo = (cls = '') => meteoVisibile() ? `<div${cls ? ` class="${cls}"` : ''} data-meteo-slot hidden></div>` : ''
export async function montaMeteo(slot, { signal, piove = () => false, onPiove } = {}) {
  if (!slot) return
  if (!meteoVisibile()) { slot.remove(); return }
  const dati = await caricaMeteo({ signal })
  if (signal?.aborted || !slot.isConnected) return
  const html = dati ? meteoCard(dati, { piove: piove() }) : ''
  if (!html) { slot.remove(); return } // niente dati: la card non compare, e nemmeno lo slot
  slot.outerHTML = html
  const card = document.querySelector('[data-meteo]'); if (!card) return
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-meteo-toggle]')
    if (t) { const box = card.querySelector('#meteo-dett'); box.hidden = !box.hidden; t.setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden) evento('meteo-apri'); return }
    const g = e.target.closest('[data-meteo-giorno]')
    if (g) {
      card.querySelectorAll('[data-meteo-giorno]').forEach((b) => { const on = b === g; b.classList.toggle('chip--on', on); b.setAttribute('aria-selected', String(on)) })
      card.querySelector('[data-meteo-striscia]').innerHTML = strisciaHtml(dati, g.dataset.meteoGiorno, card.dataset.oggi, +card.dataset.ora)
      card.querySelector('[data-meteo-sole]').innerHTML = soleHtml(dati, g.dataset.meteoGiorno)
      card.querySelector('[data-meteo-striscia]').scrollLeft = 0
      return
    }
    const b = e.target.closest('[data-meteo-piove]')
    if (b) { onPiove?.(); const riga = b.closest('.meteo__piove'); riga.innerHTML = `${icon('rain')}<span>Piano coperto attivo.</span>` }
  }, { signal })
}
