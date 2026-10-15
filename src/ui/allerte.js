// Allerte meteo e protezione civile nel sito. Legge public/allerte.json (scritto dal workflow allerte.yml, che a sua
// volta legge MeteoAlarm: avvisi ufficiali AEMET per Barcellona e Protezione Civile per l'Emilia-Romagna), con cache
// di 10 minuti. Banner in cima a tutte le viste quando c'è un'allerta attiva per Barcellona; tap → pannello con i
// dettagli, la fonte e le regole di Protecció Civil. Niente allerta → niente banner, niente spazio vuoto.
// Il banner dipende SOLO da allerte.json: ?now= non inventa allerte.
import { icon } from './icons.js'
import { esc } from './html.js'
import { openSheet } from './sheet.js'

const URL = import.meta.env.BASE_URL.replace(/\/$/, '') + '/allerte.json'
const CACHE = 'b40:allerte:v1'
const TTL = 10 * 60 * 1000
const ORDINE = { rosso: 3, arancione: 2, giallo: 1, preallarme: 0 }
export const NOME = { rosso: 'rossa', arancione: 'arancione', giallo: 'gialla', preallarme: 'pre-allarme' }
export const TEL_EMERGENZE = '112'

let inVolo = null
export async function caricaAllerte() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null')
    if (c && Date.now() - c.quando < TTL) return c.dati
  } catch { /* niente cache: si legge */ }
  if (!inVolo) {
    inVolo = fetch(`${URL}?t=${Math.floor(Date.now() / TTL)}`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : { attive: [] })).then((dati) => {
      // un'allerta con la fine già passata non si mostra: se il workflow si ferma, il file non resta "in allerta" per sempre
      const vive = (Array.isArray(dati.attive) ? dati.attive : []).filter((a) => !a.fine || isNaN(Date.parse(a.fine)) || Date.parse(a.fine) > Date.now())
      const d = { attive: vive, aggiornato: dati.aggiornato || null }
      try { sessionStorage.setItem(CACHE, JSON.stringify({ quando: Date.now(), dati: d })) } catch { /* pazienza */ }
      return d
    }).catch(() => ({ attive: [], aggiornato: null })).finally(() => { inVolo = null })
  }
  return inVolo
}
export const perZona = (attive, zona) => attive.filter((a) => a.zona === zona)
export function massima(attive) {
  return [...attive].sort((a, b) => (ORDINE[b.livello] ?? -1) - (ORDINE[a.livello] ?? -1))[0] || null
}
const oraLocale = (iso, tz = 'Europe/Madrid') => { try { return new Intl.DateTimeFormat('it-IT', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) } catch { return '' } }
const giornoLocale = (iso, tz = 'Europe/Madrid') => { try { return new Intl.DateTimeFormat('it-IT', { timeZone: tz, weekday: 'short', day: 'numeric' }).format(new Date(iso)) } catch { return '' } }
export function finestra(a) {
  const tz = a.zona === 'bologna' ? 'Europe/Rome' : 'Europe/Madrid'
  const i = oraLocale(a.inizio, tz), f = oraLocale(a.fine, tz)
  if (!i && !f) return ''
  return `${giornoLocale(a.inizio, tz)} ${i}${f ? ` → ${giornoLocale(a.fine, tz)} ${f}` : ''}`
}

// Testo del banner, per livello (spec): gialla con tipo e ora di fine; arancione e rossa con le regole secche
export function testoBanner(a) {
  if (a.livello === 'preallarme') return `Pre-allarme pioggia forte (non ufficiale)${a.inizio ? ` dalle ${oraLocale(a.inizio)}` : ''}. Ombrello, e occhio alle allerte vere.`
  if (a.livello === 'rosso') return 'Allerta rossa. Restate al chiuso. Emergenze: 112.'
  if (a.livello === 'arancione') return 'Allerta arancione. Spostamenti in taxi, niente moli, spiagge, Montjuïc, sottopassi.'
  return `Allerta gialla ${esc(a.tipo || '')}${a.fine ? ` fino alle ${oraLocale(a.fine)}` : ''}. Programma invariato, ombrello.`
}
export function bannerHtml(attive) {
  const a = massima(perZona(attive, 'barcellona'))
  if (!a) return ''
  return `<button class="banner-allerta banner-allerta--${esc(a.livello)}" type="button" data-allerta-banner="${esc(a.livello)}" aria-label="${esc(testoBanner(a))} Apri i dettagli">${icon(a.livello === 'rosso' ? 'alert' : a.livello === 'preallarme' ? 'rain' : 'cloud-lightning')}<span>${testoBanner(a)}</span>${icon('chevron')}</button>`
}

// Regole di Protecció Civil per livello, in italiano e corte
export const REGOLE = {
  giallo: 'Attenzione: fenomeno in arrivo ma gestibile. Ombrello, scarpe chiuse, programma invariato.',
  arancione: 'Pericolo importante: niente moli, spiagge, parchi, Montjuïc, sottopassi e parcheggi sotterranei. Spostamenti in taxi, non a piedi nelle zone basse.',
  rosso: 'Pericolo estremo: restate al chiuso, lontano da finestre e rambles. Non mettetevi in strada. Emergenze: 112.'
}
export function pannelloAllerte(attive) {
  const lista = attive.length ? `<ul class="allerte-lista">${attive.map((a) => `<li class="allerte-voce allerte-voce--${esc(a.livello)}">
      <b>${esc(a.zona === 'bologna' ? 'Bologna / Emilia-Romagna' : 'Barcellona')} · ${esc(NOME[a.livello] || a.livello)}${a.nonUfficiale ? ' (non ufficiale)' : ''}</b>
      <span>${esc(a.tipo || '')}${a.area ? ` · ${esc(a.area)}` : ''}</span>
      ${finestra(a) ? `<span class="faint">${esc(finestra(a))}</span>` : ''}
      ${a.fonte ? `<a href="${esc(a.fonte)}" target="_blank" rel="noopener">Fonte${a.nonUfficiale ? ' (Open-Meteo)' : ' (MeteoAlarm / AEMET)'}</a>` : ''}
    </li>`).join('')}</ul>` : '<p class="muted">Nessuna allerta attiva.</p>'
  return `<div class="allerte-sheet">
    ${lista}
    <h3 class="section-title">Cosa fare</h3>
    <ul class="allerte-regole">
      <li><b class="allerte-pallino allerte-pallino--giallo"></b><span><b>Gialla.</b> ${esc(REGOLE.giallo)}</span></li>
      <li><b class="allerte-pallino allerte-pallino--arancione"></b><span><b>Arancione.</b> ${esc(REGOLE.arancione)}</span></li>
      <li><b class="allerte-pallino allerte-pallino--rosso"></b><span><b>Rossa.</b> ${esc(REGOLE.rosso)}</span></li>
    </ul>
    <a class="btn btn--block" href="tel:112">${icon('phone')} Emergenze: 112</a>
    <p class="faint">Avvisi ufficiali ripubblicati da MeteoAlarm (AEMET per la Spagna, Protezione Civile per l'Italia), controllati ogni ora dal 15 al 19 ottobre. Chi usa un ad blocker li vede lo stesso: è un file del sito.</p>
  </div>`
}
let montato = false
export async function montaAllerte(app) {
  if (!app) return
  const { attive } = await caricaAllerte()
  app.querySelectorAll('[data-allerta-banner]').forEach((b) => b.remove())
  const html = bannerHtml(attive)
  if (html) app.insertAdjacentHTML('afterbegin', html)
  if (!montato) {
    montato = true
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-allerta-banner]')) return
      caricaAllerte().then((d) => openSheet({ title: 'Allerta meteo', body: pannelloAllerte(d.attive) }))
    })
  }
}

// Oggi, card "Adesso": se la tappa corrente è in zona esposta e c'è un'allerta arancione o rossa su Barcellona,
// l'alternativa al coperto, scritta per quel posto
export const ESPOSTI = {
  maremagnum: 'Maremagnum sta su un molo: con allerta arancione o rossa non restate sul ponte Rambla de Mar e fuori sulla terrazza. Al coperto c\'è il Time Out Market al 2° piano dello stesso edificio; se peggiora, taxi al T2 alle 18:45.',
  timeoutmarket: 'Siete su un molo: restate dentro, niente ponte Rambla de Mar. Se peggiora, taxi al T2 alle 18:45.',
  celta: 'Il Bar Celta è a due passi dal porto: finito di mangiare, taxi (non a piedi) fino a Maremagnum, o direttamente al T2.',
  apolo: 'Sala Apolo è sul Paral·lel, zona bassa: si torna in taxi, niente sottopassi né metro.',
  ciutadella: 'La Ciutadella è un parco aperto: al coperto c\'è El Born Centre de Cultura i Memòria (300 m) o Santa Maria del Mar.',
  bunkers: 'Collina scoperta e scivolosa: non salite. Al coperto: Maremagnum o l\'appartamento, in taxi.'
}
export function avvisoEsposto(stop, attive) {
  const a = massima(perZona(attive, 'barcellona'))
  if (!a || !['arancione', 'rosso'].includes(a.livello)) return ''
  const testo = ESPOSTI[stop?.venueId]
  if (!testo) return ''
  return `<div class="avviso avviso--forte avviso--allerta" data-allerta-esposto="${esc(stop.venueId)}">${icon('alert')}<span><b>Allerta ${esc(NOME[a.livello])}, zona esposta.</b> ${esc(testo)}</span></div>`
}

// Sezione Info "Maltempo e emergenze"
export function sezioneEmergenze(attive) {
  return `<div class="emergenze">
    ${attive.length ? `<p><b>Adesso:</b></p>${pannelloAllerte(attive).replace(/<h3[\s\S]*$/, '</div>')}` : '<p class="muted">Nessuna allerta attiva in questo momento.</p>'}
    <h3 class="section-title">I livelli</h3>
    <ul class="allerte-regole">
      <li><b class="allerte-pallino allerte-pallino--giallo"></b><span><b>Gialla.</b> ${esc(REGOLE.giallo)}</span></li>
      <li><b class="allerte-pallino allerte-pallino--arancione"></b><span><b>Arancione.</b> ${esc(REGOLE.arancione)}</span></li>
      <li><b class="allerte-pallino allerte-pallino--rosso"></b><span><b>Rossa.</b> ${esc(REGOLE.rosso)}</span></li>
    </ul>
    <h3 class="section-title">ES-Alert</h3>
    <p>In Spagna gli avvisi di emergenza arrivano sul telefono anche con la SIM italiana, se nelle impostazioni gli avvisi di emergenza sono attivi (Android: Sicurezza ed emergenze → Avvisi di emergenza wireless; iPhone: Notifiche → Avvisi governativi). Arrivano in catalano e in inglese.</p>
    <a class="btn btn--block" href="tel:112">${icon('phone')} Emergenze: 112</a>
    <h3 class="section-title">Dove guardare</h3>
    <ul class="list">
      <li><a href="https://www.aemet.es/es/eltiempo/prediccion/avisos" target="_blank" rel="noopener">AEMET · avisos</a></li>
      <li><a href="https://www.meteo.cat/prediccio/avisos" target="_blank" rel="noopener">Meteocat · avisos</a></li>
      <li><a href="https://x.com/emergenciescat" target="_blank" rel="noopener">@emergenciescat (Protecció Civil)</a></li>
      <li><a href="https://www.ryanair.com/it/it/trip/flights/status" target="_blank" rel="noopener">Ryanair · stato del volo FR5220</a></li>
    </ul>
    <h3 class="section-title">Se il volo salta per maltempo</h3>
    <p>Niente compensazione (è una circostanza eccezionale), ma Ryanair deve offrire la scelta fra riprotezione sul primo volo utile e rimborso, più assistenza: pasti e, se serve la notte, hotel e trasferimenti. Conservate tutte le ricevute e chiedete per iscritto.</p>
  </div>`
}
