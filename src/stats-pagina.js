// Pagina privata delle statistiche. Non è linkata da nessuna parte del sito: ci si arriva solo
// scrivendo l'indirizzo. Legge i contatori pubblici di GoatCounter — /counter/<path>.json, aperti
// senza token perché nelle impostazioni è attivo "Allow adding visitor counts" — quindi qui dentro
// non c'è nessuna chiave e non c'è niente da tenere segreto se non l'indirizzo stesso.
//
// Il 404 di quell'endpoint NON è un errore: vuol dire "questo percorso non l'ha mai aperto nessuno",
// e infatti risponde con gli zeri. Dati non disponibili sono solo gli errori di rete e i 5xx.
import './styles/tokens.css'
import './styles/base.css'
import './styles/stats.css'
import people from '../data/people.json'
import itinerary from '../data/itinerary.json'
import { esc } from './ui/html.js'
import { mosaicDataUri } from './ui/mosaic.js'

const BASE = 'https://barcellona40.goatcounter.com/counter/'
const TTL = 5 * 60 * 1000
const CACHE = 'b40:stats:v1'
const BLOCCO = 6

// Gli stessi nomi che il sito mette nei percorsi (vedi src/stats.js)
const SLUG = { ale: 'alessandro', monne: 'monne', giulio: 'giulio', manuel: 'manuel' }
const PROFILI = people.people.map((p) => ({ id: p.id, nome: p.name, slug: SLUG[p.id], colore: p.color }))

// Le sezioni con la barra. Coro e speedrun non sono "sezioni guardate" come le altre: entrano nel
// totale e compaiono solo a chi le ha davvero aperte.
const SEZIONI = [['oggi', 'Oggi'], ['programma', 'Programma'], ['mappa', 'Mappa'], ['missioni', 'Missioni'], ['info', 'Info']]
const EXTRA = [['coro', 'Coro'], ['speedrun', 'Speedrun']]

const EVENTI = [
  { id: 'album-apri', label: "Aperto l'album" },
  { id: 'album-copia-link', label: 'Copiato il link dell’album' },
  { id: 'album-whatsapp', label: "Mandato l'album su WhatsApp", solo: 'ale' },
  { id: 'canzone-play', label: 'Ascoltata la canzone' },
  { id: 'canzone-video', label: 'Guardato il video' },
  { id: 'canzone-scarica-mp3', label: "Scaricato l'MP3" },
  { id: 'canzone-scarica-video', label: 'Scaricato il video' },
  { id: 'coro-apri', label: 'Aperta la modalità coro' },
  { id: 'maps-tappa', label: 'Aperta una tappa su Maps' },
  { id: 'maps-percorso', label: 'Aperto un percorso su Maps' },
  { id: 'taxi', label: 'Chiamato un taxi' },
  { id: 'qr-parcheggio-apri', label: 'Aperto il QR del parcheggio' },
  { id: 'riepilogo-copia', label: 'Copiato il riepilogo del giorno' },
  { id: 'novita-apri', label: 'Aperte le novità' },
  { id: 'missione-completata', label: 'Completata una missione' },
  { id: 'giorno-cambia', label: 'Cambiato giorno nel programma' },
  { id: 'piove-attiva', label: 'Attivata la modalità pioggia' },
  { id: 'rigori-apri', label: 'Aperto il gioco dei rigori' }
]
// Le tappe con il pulsante Maps: il sito conta ognuna anche senza profilo (maps-tappa/<id>),
// altrimenti servirebbero quattro richieste per tappa solo per fare una classifica.
const TAPPE = itinerary.days.flatMap((d) => d.stops.filter((s) => s.actions?.maps).map((s) => ({ id: s.id, titolo: s.title, colore: d.color })))

function percorsi() {
  const out = []
  for (const p of PROFILI) {
    for (const [v] of SEZIONI) out.push(`/${p.slug}/${v}`)
    out.push(`/${p.slug}/coro`)
    if (p.id === 'monne') out.push(`/${p.slug}/speedrun`)
    for (const e of EVENTI) if (!e.solo || e.solo === p.id) out.push(`${p.slug}/${e.id}`)
  }
  out.push('/anonimo/onboarding')
  for (const t of TAPPE) out.push(`maps-tappa/${t.id}`)
  return out
}

// ——— dati ———
async function chiedi(path) {
  const r = await fetch(BASE + encodeURIComponent(path) + '.json', { headers: { Accept: 'application/json' } })
  if (!r.ok && r.status !== 404) throw new Error('HTTP ' + r.status)
  const j = await r.json()
  return { n: Number(j.count || 0), unici: Number(j.count_unique || 0) }
}

async function scarica(lista, onAvanzamento) {
  const dati = {}
  let errori = 0, fatti = 0
  for (let i = 0; i < lista.length; i += BLOCCO) {
    const blocco = lista.slice(i, i + BLOCCO)
    const res = await Promise.all(blocco.map((p) => chiedi(p).catch(() => null)))
    blocco.forEach((p, k) => {
      if (res[k]) dati[p] = res[k]
      else { errori++; dati[p] = { n: 0, unici: 0, errore: true } }
    })
    fatti += blocco.length
    onAvanzamento?.(fatti, lista.length)
  }
  return { dati, errori, totali: lista.length, quando: Date.now() }
}

function daCache() {
  try {
    const o = JSON.parse(sessionStorage.getItem(CACHE) || 'null')
    if (!o || !o.quando || Date.now() - o.quando > TTL) return null
    return o
  } catch { return null }
}
const inCache = (o) => { try { sessionStorage.setItem(CACHE, JSON.stringify(o)) } catch { /* sessione piena o bloccata: pazienza */ } }

// ——— pezzi di pagina ———
const n = (x) => (x || 0).toLocaleString('it-IT')
// "7 viste · 3 volte diverse": il secondo numero lo mostriamo solo quando dice qualcosa in più
const conUnici = (tot, unici, parola = 'viste') => `${n(tot)} ${tot === 1 ? parola.replace(/e$/, 'a') : parola}${unici && unici !== tot ? ` · ${n(unici)} volte diverse` : ''}`

// `larga`: etichetta su una riga sua. Serve dove i nomi sono lunghi (eventi, nomi delle tappe):
// stretti in un terzo di schermo finivano tutti con i puntini.
function barra(label, valore, massimo, colore, larga = false) {
  const pct = massimo > 0 ? Math.round((valore / massimo) * 100) : 0
  return `<div class="barra${larga ? ' barra--larga' : ''}">
    <span class="barra__lab">${esc(label)}</span>
    <span class="barra__pista"><span class="barra__riemp" style="width:${pct}%;background:var(${colore})"></span></span>
    <span class="barra__num tnum">${n(valore)}</span>
  </div>`
}

function cardPersona(p, d) {
  const letto = (path) => d[path] || { n: 0, unici: 0 }
  const sezioni = SEZIONI.map(([v, lab]) => ({ lab, v: letto(`/${p.slug}/${v}`).n }))
  for (const [v, lab] of EXTRA) {
    if (v === 'speedrun' && p.id !== 'monne') continue
    const q = letto(`/${p.slug}/${v}`).n
    if (q > 0) sezioni.push({ lab, v: q })
  }
  const eventi = EVENTI.filter((e) => !e.solo || e.solo === p.id).map((e) => ({ ...e, v: letto(`${p.slug}/${e.id}`).n }))
  const viste = sezioni.reduce((a, s) => a + s.v, 0)
  const unici = Math.max(...SEZIONI.map(([v]) => letto(`/${p.slug}/${v}`).unici), 0)
  const tocchi = eventi.reduce((a, e) => a + e.v, 0)
  if (viste === 0 && tocchi === 0) {
    return `<article class="p-card p-card--spenta">
      <div class="p-card__testa"><span class="p-card__punto"></span><h2>${esc(p.nome)}</h2></div>
      <p class="muted">Non ancora entrato.</p>
    </article>`
  }
  const max = Math.max(...sezioni.map((s) => s.v), 1)
  return `<article class="p-card" style="--pc:var(${p.colore})">
    <div class="p-card__testa">
      <span class="p-card__punto"></span>
      <h2>${esc(p.nome)}</h2>
      <span class="p-card__tot tnum">${n(viste)}</span>
    </div>
    <p class="muted">${conUnici(viste, unici)}${tocchi ? ` · ${n(tocchi)} ${tocchi === 1 ? 'tocco' : 'tocchi'}` : ''}</p>
    <div class="barre">${sezioni.map((s) => barra(s.lab, s.v, max, p.colore)).join('')}</div>
    <h3 class="p-card__sub">Cosa ha toccato</h3>
    <ul class="spunte">${eventi.map((e) => `<li class="${e.v ? 'si' : 'no'}"><span class="spunte__seg" aria-hidden="true">${e.v ? '✓' : '—'}</span><span>${esc(e.label)}</span>${e.v ? `<b class="tnum">${n(e.v)}</b>` : ''}</li>`).join('')}</ul>
  </article>`
}

function sezioneEventi(d) {
  const righe = EVENTI.map((e) => ({
    label: e.label,
    v: PROFILI.reduce((a, p) => a + ((!e.solo || e.solo === p.id) ? (d[`${p.slug}/${e.id}`]?.n || 0) : 0), 0)
  })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v)
  if (!righe.length) return `<p class="muted">Ancora nessun pulsante toccato da nessuno.</p>`
  const max = righe[0].v
  return `<div class="barre barre--larghe">${righe.map((r) => barra(r.label, r.v, max, '--acqua', true)).join('')}</div>`
}

function sezioneMaps(d) {
  const righe = TAPPE.map((t) => ({ ...t, v: d[`maps-tappa/${t.id}`]?.n || 0 })).filter((t) => t.v > 0).sort((a, b) => b.v - a.v)
  if (!righe.length) return `<p class="muted">Nessuna tappa ancora aperta su Maps.</p>`
  const max = righe[0].v
  return `<div class="barre barre--larghe">${righe.map((t) => barra(t.titolo, t.v, max, t.colore || '--acqua', true)).join('')}</div>`
}

function testa(d) {
  const perProfilo = PROFILI.map((p) => ({
    p,
    v: SEZIONI.concat(EXTRA).reduce((a, [v]) => a + (d[`/${p.slug}/${v}`]?.n || 0), 0)
  }))
  const totale = perProfilo.reduce((a, x) => a + x.v, 0)
  const unici = perProfilo.reduce((a, x) => a + Math.max(...SEZIONI.map(([v]) => d[`/${x.p.slug}/${v}`]?.unici || 0), 0), 0)
  const anon = d['/anonimo/onboarding']?.n || 0
  const top = [...perProfilo].sort((a, b) => b.v - a.v)[0]
  return `<section class="totale" style="--album-mosaic:${mosaicDataUri(4016, 30)}">
    <div class="totale__num tnum">${n(totale)}</div>
    <div class="totale__lab">${totale === 1 ? 'vista in tutto' : 'viste in tutto'}${unici && unici !== totale ? ` · ${n(unici)} volte diverse` : ''}</div>
    <div class="totale__top">${top && top.v > 0 ? `Più attivo: <b style="color:var(${top.p.colore})">${esc(top.p.nome)}</b> · ${conUnici(top.v, 0)}` : 'Non è ancora entrato nessuno.'}</div>
    ${anon ? `<div class="totale__anon">+ ${n(anon)} ${anon === 1 ? 'apertura' : 'aperture'} prima di scegliere il profilo</div>` : ''}
  </section>`
}

function scheletro() {
  const finto = (h) => `<div class="skel" style="height:${h}px"></div>`
  return `<section class="totale totale--skel">${finto(60)}${finto(18)}</section>
    ${PROFILI.map(() => `<article class="p-card">${finto(22)}${finto(14)}${finto(96)}${finto(120)}</article>`).join('')}`
}

const orario = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

function pagina(res) {
  const d = res.dati
  const tuttoGiu = res.errori === res.totali
  return `<header class="s-head">
      <h1>Statistiche</h1>
      <p class="s-head__sub">Barcelona 40 · pagina privata</p>
    </header>
    <main class="s-main">
      ${tuttoGiu ? `<section class="s-giu">
        <h2>Dati non disponibili</h2>
        <p class="muted">GoatCounter non risponde: nessuna delle ${n(res.totali)} richieste è arrivata. Non vuol dire zero visite, vuol dire che adesso non si può sapere.</p>
        <button class="s-btn" data-aggiorna>Riprova</button>
      </section>` : `
      ${res.errori ? `<p class="s-parziale">${n(res.errori)} richieste su ${n(res.totali)} non hanno risposto: questi numeri sono incompleti, per difetto.</p>` : ''}
      ${testa(d)}
      <div class="p-cards">${PROFILI.map((p) => cardPersona(p, d)).join('')}</div>
      <h2 class="s-titolo">Cosa viene usato</h2>
      ${sezioneEventi(d)}
      <h2 class="s-titolo">I posti più aperti su Maps</h2>
      ${sezioneMaps(d)}
      `}
      <footer class="s-foot">
        <div class="s-foot__riga">
          <span class="muted">Aggiornato alle ${esc(orario(res.quando))}</span>
          <button class="s-btn" data-aggiorna>Aggiorna</button>
        </div>
        <ul class="s-limiti">
          <li>Chi usa un ad blocker non viene contato: questi numeri sono un minimo, non un totale.</li>
          <li>Il profilo è quello scelto dentro il sito, non la persona reale: due telefoni con lo stesso profilo fanno una riga sola.</li>
          <li>I conteggi sono totali dall'inizio, non per giorno.</li>
          <li>"Volte diverse" è il conteggio unico di GoatCounter: per una persona è il massimo fra le sue sezioni, non la somma, che conterebbe due volte la stessa visita; in cima sono quei massimi sommati.</li>
        </ul>
      </footer>
    </main>`
}

// ——— avvio ———
const root = document.getElementById('stats')
let lista = percorsi()

async function disegna({ forza = false } = {}) {
  const cache = forza ? null : daCache()
  if (cache) { root.innerHTML = pagina(cache); return }
  root.innerHTML = `<header class="s-head"><h1>Statistiche</h1><p class="s-head__sub">Sto leggendo ${n(lista.length)} contatori…</p></header><main class="s-main">${scheletro()}</main>`
  const sub = root.querySelector('.s-head__sub')
  const res = await scarica(lista, (fatti, tot) => { if (sub) sub.textContent = `Sto leggendo i contatori… ${fatti}/${tot}` })
  if (res.errori !== res.totali) inCache(res)
  root.innerHTML = pagina(res)
}

root.addEventListener('click', (e) => {
  if (!e.target.closest('[data-aggiorna]')) return
  try { sessionStorage.removeItem(CACHE) } catch { /* niente da pulire */ }
  disegna({ forza: true })
})

disegna()
