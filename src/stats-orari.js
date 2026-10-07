// Statistiche: QUANDO entrano, non solo quanti. Estensione della pagina privata (stats-pagina.js).
//
// I contatori pubblici (/counter/<path>.json) danno solo i totali. Per le ore serve l'API autenticata:
//   GET https://barcellona40.goatcounter.com/api/v0/stats/hits?start=…&end=…&daily=false
//   Authorization: Bearer <token>   (CORS verificato il 07/10/2026: Access-Control-Allow-Origin: *)
// Il token sta QUI, nel repo, per decisione esplicita di Alessandro del 07/10/2026 ("ti autorizzo
// formalmente a inserirlo, mi assumo le responsabilità"): il repo è pubblico, ma il sito non è indicizzato
// e i contatori non hanno valore di privacy. Il token ha tutti i permessi del suo account GoatCounter:
// se un giorno lo revoca, la pagina mostra il campo e un token nuovo si salva in localStorage
// (b40:v1:gc-token), che ha la precedenza su questo. Mai nell'URL, mai mandato a GoatCounter come evento:
// questa pagina non carica count.js, quindi non traccia niente.
//
// Le ore sono quelle del fuso impostato in GoatCounter (Settings → Site): qui non si converte nulla.
import { esc } from './ui/html.js'
import people from '../data/people.json'
import itinerary from '../data/itinerary.json'
import changelog from '../data/changelog.json'

const API = 'https://barcellona40.goatcounter.com/api/v0/stats/hits'
const CHIAVE = 'b40:v1:gc-token'
const TOKEN_REPO = '19nylrblfigppmx975h3icsdlsglnzd1sbvfe17mdrize1szo6'
const CACHE = 'b40:stats:orari:v1'
const TTL = 5 * 60 * 1000
const PAGINE_MAX = 6
// "Dal lancio" parte dalla prima entry del changelog: il giorno in cui il sito è andato online
const LANCIO = changelog.entries[changelog.entries.length - 1].data
const PERIODI = [['oggi', 'Oggi'], ['7', '7 giorni'], ['lancio', 'Dal lancio']]
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const SLUG = { ale: 'alessandro', monne: 'monne', giulio: 'giulio', manuel: 'manuel' }
const NOMI = Object.fromEntries(people.people.map((p) => [SLUG[p.id], p.name]))
const COLORI = Object.fromEntries(people.people.map((p) => [SLUG[p.id], p.color]))
const VISTE = { oggi: 'Oggi', programma: 'Programma', mappa: 'Mappa', missioni: 'Missioni', info: 'Info', coro: 'Coro', speedrun: 'Speedrun' }
const TAPPE = Object.fromEntries(itinerary.days.flatMap((d) => d.stops).map((s) => [s.id, s.title]))
const PROFILI = Object.keys(NOMI)

// ——— token ———
// quello salvato dal telefono vince; se non c'è, quello del repo
const leggiToken = () => { try { return localStorage.getItem(CHIAVE) || TOKEN_REPO } catch { return TOKEN_REPO } }
const salvaToken = (t) => { try { t ? localStorage.setItem(CHIAVE, t) : localStorage.removeItem(CHIAVE) } catch { /* memoria bloccata */ } }

// ——— date (locali del telefono: Alessandro è in Italia, come il sito GoatCounter) ———
const pad = (x) => String(x).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const daIso = (s) => { const [a, m, g] = s.split('-').map(Number); return new Date(a, m - 1, g) }
function intervallo(periodo) {
  const oggi = new Date(); const end = iso(oggi)
  if (periodo === 'oggi') return { start: end, end }
  if (periodo === '7') { const d = new Date(oggi); d.setDate(d.getDate() - 6); return { start: iso(d), end } }
  return { start: LANCIO < end ? LANCIO : end, end }
}
// tutti i giorni dell'intervallo, il più recente in cima
function elencoGiorni(start, end) {
  const out = []; const d = daIso(end)
  while (iso(d) >= start) { out.push(iso(d)); d.setDate(d.getDate() - 1); if (out.length > 400) break }
  return out
}
function etichettaGiorno(s) {
  const oggi = iso(new Date()); const ieri = new Date(); ieri.setDate(ieri.getDate() - 1)
  if (s === oggi) return 'oggi'
  if (s === iso(ieri)) return 'ieri'
  const d = daIso(s); return `${GIORNI[d.getDay()]} ${d.getDate()}`
}
const etichettaOra = (o) => `${pad(o)}:00–${pad((o + 1) % 24)}:00`

// Etichette leggibili per i percorsi del sito (vedi src/stats.js): il resto come arriva
function etichetta(path) {
  let m
  if ((m = path.match(/^\/(alessandro|monne|giulio|manuel)\/([a-z-]+)$/))) return `${VISTE[m[2]] || m[2]} · ${NOMI[m[1]]}`
  if (path === '/anonimo/onboarding') return 'Scelta del profilo'
  if ((m = path.match(/^(alessandro|monne|giulio|manuel)\/([a-z0-9-]+)$/))) return `${m[2]} · ${NOMI[m[1]]}`
  if ((m = path.match(/^maps-tappa\/(\w+)$/))) return `Maps · ${TAPPE[m[1]] || m[1]}`
  return path
}

// ——— API ———
// L'API dà al massimo 100 percorsi per chiamata: se ce ne sono altri (`more`), si richiede escludendo
// quelli già ricevuti (exclude_paths, per id). Un token sbagliato dà 401 con un corpo HTML: si legge lo stato.
async function scaricaHits(token, start, end) {
  const hits = []
  for (let pagina = 0; pagina < PAGINE_MAX; pagina++) {
    const u = new URL(API)
    u.searchParams.set('start', start); u.searchParams.set('end', end); u.searchParams.set('daily', 'false'); u.searchParams.set('limit', '100')
    for (const id of hits.map((h) => h.path_id).filter((x) => x != null)) u.searchParams.append('exclude_paths', String(id))
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    if (r.status === 401 || r.status === 403) { const e = new Error('Token non valido'); e.token = true; throw e }
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json()
    const nuovi = Array.isArray(j.hits) ? j.hits : []
    hits.push(...nuovi)
    if (!j.more || !nuovi.length || !nuovi.some((h) => h.path_id != null)) break
  }
  return hits
}

// ——— aggregazione: griglia giorni × 24 ore, per tutto il sito e per ogni percorso ———
function aggrega(hits, start, end) {
  const giorni = elencoGiorni(start, end)
  const idx = Object.fromEntries(giorni.map((g, i) => [g, i]))
  const vuota = () => giorni.map(() => new Array(24).fill(0))
  const tutto = vuota()
  const percorsi = hits.map((h) => {
    const g = vuota(); let n = 0
    for (const s of h.stats || []) {
      const i = idx[s.day]; if (i == null || !Array.isArray(s.hourly)) continue
      s.hourly.forEach((v, o) => { const x = Number(v) || 0; g[i][o] += x; tutto[i][o] += x; n += x })
    }
    // il totale è la somma delle celle orarie: così KPI e heatmap dicono la stessa cosa; `count` solo se mancano le ore
    return { path: h.path, evento: !!h.event, n: n > 0 ? n : Number(h.count) || 0, unici: h.count_unique != null ? Number(h.count_unique) : null, g, profilo: profilo24(g) }
  }).filter((p) => p.n > 0).sort((a, b) => b.n - a.n)
  const viste = percorsi.filter((p) => !p.evento)
  const visite = viste.reduce((a, p) => a + p.n, 0)
  const unici = viste.length && viste.every((p) => p.unici != null) ? viste.reduce((a, p) => a + p.unici, 0) : null
  return { giorni, tutto, percorsi, visite, unici, ultimo: ultimaCella(giorni, tutto) }
}
const profilo24 = (g) => g.reduce((acc, riga) => acc.map((v, o) => v + riga[o]), new Array(24).fill(0))
// la cella oraria più recente con un valore > 0: è un'ora, non un orario preciso
function ultimaCella(giorni, g) {
  for (let i = 0; i < giorni.length; i++) for (let o = 23; o >= 0; o--) if (g[i][o] > 0) return { giorno: giorni[i], ora: o }
  return null
}
const testoUltimo = (u) => (u ? `~${etichettaGiorno(u.giorno)} ${pad(u.ora)}:00` : '—')

// ——— pezzi di pagina ———
const n = (x) => (x || 0).toLocaleString('it-IT')
function heatmap(giorni, g, id) {
  const max = Math.max(1, ...g.flat())
  const pct = (v) => (v <= 0 ? 0 : Math.max(12, Math.round((v / max) * 100)))
  return `<div class="hm" data-hm="${esc(id)}">
    <div class="hm__scroll"><div class="hm__griglia" role="grid" aria-label="Visite per giorno e ora">
      <div class="hm__ang" aria-hidden="true"></div>
      ${Array.from({ length: 24 }, (_, o) => `<div class="hm__ora" aria-hidden="true">${o % 6 === 0 ? o : ''}</div>`).join('')}
      ${giorni.map((d, i) => `<div class="hm__lab">${esc(etichettaGiorno(d))}</div>${g[i].map((v, o) => `<button class="hm__c" type="button" style="--p:${pct(v)}" data-g="${d}" data-o="${o}" data-v="${v}" aria-label="${esc(etichettaGiorno(d))}, ${etichettaOra(o)} · ${n(v)} ${v === 1 ? 'visita' : 'visite'}"></button>`).join('')}`).join('')}
    </div></div>
    <p class="hm__tip muted" aria-live="polite" data-tip>Tocca una cella per leggere il numero.</p>
    <div class="hm__leg" aria-label="Legenda"><span>0</span>${[25, 50, 75, 100].map((p) => `<i class="hm__c hm__c--leg" style="--p:${p}"></i>`).join('')}<span>${n(max)}</span></div>
  </div>`
}
const sparkline = (p) => { const max = Math.max(1, ...p); return `<span class="sp" aria-hidden="true">${p.map((v) => `<i style="--h:${Math.round((v / max) * 100)}"></i>`).join('')}</span>` }

function kpi(d) {
  return `<div class="kpi">
    <div class="kpi__t"><b class="tnum">${n(d.visite)}</b><span>Visite</span></div>
    ${d.unici != null ? `<div class="kpi__t"><b class="tnum">${n(d.unici)}</b><span>Visitatori unici</span></div>` : ''}
    <div class="kpi__t"><b class="tnum kpi__ultimo">${esc(testoUltimo(d.ultimo))}</b><span>Ultimo accesso</span></div>
  </div>`
}
function perPagina(d) {
  if (!d.percorsi.length) return '<p class="muted">Nessun accesso nel periodo.</p>'
  return `<div class="pp-lista">${d.percorsi.map((p, i) => `<div class="pp-riga"><button class="pp" type="button" data-pp="${i}" aria-expanded="false" aria-label="${esc(etichetta(p.path))}, ${n(p.n)}: mostra la mappa oraria"><span class="pp__lab">${esc(etichetta(p.path))}</span><b class="tnum">${n(p.n)}</b>${sparkline(p.profilo)}</button><div class="pp__hm" hidden></div></div>`).join('')}</div>`
}
// Eventi per profilo: il nome sta nel percorso (/giulio/oggi, giulio/album-apri), quindi si può dire chi e quando
function eventiProfilo(d) {
  const righe = PROFILI.map((slug) => {
    const miei = d.percorsi.filter((p) => p.path.startsWith(`/${slug}/`) || p.path.startsWith(`${slug}/`))
    if (!miei.length) return null
    const aperture = miei.filter((p) => !p.evento).reduce((a, p) => a + p.n, 0)
    const g = miei.reduce((acc, p) => acc.map((riga, i) => riga.map((v, o) => v + p.g[i][o])), d.giorni.map(() => new Array(24).fill(0)))
    return { slug, aperture, tocchi: miei.filter((p) => p.evento).reduce((a, p) => a + p.n, 0), ultimo: ultimaCella(d.giorni, g) }
  }).filter(Boolean).sort((a, b) => (b.ultimo ? b.ultimo.giorno + pad(b.ultimo.ora) : '').localeCompare(a.ultimo ? a.ultimo.giorno + pad(a.ultimo.ora) : ''))
  if (!righe.length) return ''
  return `<h2 class="s-titolo">Chi, e quando</h2><ul class="ep">${righe.map((r) => `<li style="--pc:var(${COLORI[r.slug]})"><span class="ep__punto"></span><b>${esc(NOMI[r.slug])}</b><span class="muted">ultima volta ${esc(testoUltimo(r.ultimo))} · ${n(r.aperture)} ${r.aperture === 1 ? 'apertura' : 'aperture'}${r.tocchi ? ` · ${n(r.tocchi)} ${r.tocchi === 1 ? 'tocco' : 'tocchi'}` : ''}</span></li>`).join('')}</ul>`
}
const campoToken = (msg = '') => `<form class="tok" data-tok-form>
    <label class="tok__lab" for="gc-token">Token GoatCounter</label>
    <div class="tok__riga"><input class="tok__in" id="gc-token" type="password" autocomplete="off" spellcheck="false" required placeholder="••••••••"><button class="s-btn s-btn--pieno" type="submit">Salva</button></div>
    ${msg ? `<p class="tok__err">${esc(msg)}</p>` : ''}
    <p class="tok__hint">Settings → API tokens → permesso 'Read statistics'. Resta solo su questo telefono.</p>
  </form>`
const chips = (periodo) => `<div class="chips-periodo" role="group" aria-label="Periodo">${PERIODI.map(([k, lab]) => `<button class="chip-p" type="button" data-periodo="${k}" aria-pressed="${k === periodo}">${lab}</button>`).join('')}</div>`
const scheletro = () => `<div class="kpi">${[0, 1, 2].map(() => '<div class="kpi__t"><div class="skel" style="height:28px"></div><div class="skel" style="height:12px"></div></div>').join('')}</div><div class="skel" style="height:140px"></div><div class="skel" style="height:90px"></div>`
const orario = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

// ——— stato ———
let periodo = '7'
const memoria = {} // periodo → { quando, hits, start, end }
const daSessione = () => { try { return JSON.parse(sessionStorage.getItem(CACHE) || '{}') } catch { return {} } }
const inSessione = (o) => { try { sessionStorage.setItem(CACHE, JSON.stringify(o)) } catch { /* sessione piena: pazienza */ } }
Object.assign(memoria, daSessione())
let caricamento = 0

export function montaOrari(root) {
  if (!root) return
  root.innerHTML = `<section class="orari" aria-label="Quando entrano"><div data-orari-corpo></div></section>`
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-tok-form]'); if (!f) return
    e.preventDefault()
    const t = f.querySelector('input').value.trim()
    if (!t) return
    salvaToken(t); Object.keys(memoria).forEach((k) => delete memoria[k]); inSessione({})
    disegna(root)
  })
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-periodo]')
    if (chip) { periodo = chip.dataset.periodo; disegna(root); return }
    if (e.target.closest('[data-cambia-token]')) { e.preventDefault(); root.querySelector('[data-orari-corpo]').innerHTML = campoToken(); root.querySelector('#gc-token')?.focus(); return }
    if (e.target.closest('[data-riprova]')) { disegna(root, { forza: true }); return }
    const cella = e.target.closest('.hm__c:not(.hm__c--leg)')
    if (cella) {
      const hm = cella.closest('.hm'); const v = Number(cella.dataset.v)
      hm.querySelectorAll('.hm__c[aria-pressed]').forEach((c) => c.removeAttribute('aria-pressed'))
      cella.setAttribute('aria-pressed', 'true')
      hm.querySelector('[data-tip]').textContent = `${etichettaGiorno(cella.dataset.g)}, ${etichettaOra(Number(cella.dataset.o))} · ${n(v)} ${v === 1 ? 'visita' : 'visite'}`
      return
    }
    const riga = e.target.closest('[data-pp]')
    if (riga) {
      const box = riga.parentElement.querySelector('.pp__hm'); const aperta = riga.getAttribute('aria-expanded') === 'true'
      riga.setAttribute('aria-expanded', String(!aperta)); box.hidden = aperta
      if (!aperta && !box.innerHTML) { const d = root.__dati; const p = d.percorsi[Number(riga.dataset.pp)]; box.innerHTML = heatmap(d.giorni, p.g, p.path) }
    }
  })
  disegna(root)
}

async function disegna(root, { forza = false } = {}) {
  const corpo = root.querySelector('[data-orari-corpo]'); if (!corpo) return
  const token = leggiToken()
  if (!token) { corpo.innerHTML = campoToken(); return } // non succede: c'è sempre quello del repo
  const { start, end } = intervallo(periodo)
  const ric = memoria[periodo]
  const fresca = ric && ric.start === start && ric.end === end && Date.now() - ric.quando < TTL
  if (fresca && !forza) { mostra(root, ric, ''); return }
  const mio = ++caricamento
  corpo.innerHTML = `${chips(periodo)}${scheletro()}`
  try {
    const hits = await scaricaHits(token, start, end)
    if (mio !== caricamento) return // nel frattempo si è cambiato periodo
    memoria[periodo] = { quando: Date.now(), hits, start, end }
    inSessione(memoria)
    mostra(root, memoria[periodo], '')
  } catch (e) {
    if (mio !== caricamento) return
    if (e.token) { salvaToken(''); corpo.innerHTML = `${chips(periodo)}${campoToken(token === TOKEN_REPO ? 'Token non valido: GoatCounter rifiuta quello del repo (revocato?). Inseriscine uno nuovo.' : 'Token non valido: GoatCounter lo rifiuta. Reinseriscilo.')}`; return }
    // rete assente o 5xx: l'ultimo dato in cache, anche vecchio, con l'ora a cui risale
    if (ric && ric.start === start && ric.end === end) { mostra(root, ric, 'rete assente'); return }
    corpo.innerHTML = `${chips(periodo)}<div class="s-giu"><h2>Orari non disponibili</h2><p class="muted">GoatCounter non risponde (${esc(e.message)}). Non vuol dire zero visite.</p><button class="s-btn" type="button" data-riprova>Riprova</button></div>`
  }
}

function mostra(root, ric, nota) {
  const corpo = root.querySelector('[data-orari-corpo]'); if (!corpo) return
  const d = aggrega(ric.hits, ric.start, ric.end)
  root.__dati = d
  corpo.innerHTML = `${chips(periodo)}
    ${kpi(d)}
    <h2 class="s-titolo">Quando entrano</h2>
    ${heatmap(d.giorni, d.tutto, 'tutto')}
    <h2 class="s-titolo">Per pagina</h2>
    ${perPagina(d)}
    ${eventiProfilo(d)}
    <p class="orari__nota muted">Aggiornato alle ${esc(orario(ric.quando))}${nota ? ` · ${esc(nota)}` : ''} · ore nel fuso di GoatCounter · <a href="#" data-cambia-token>Cambia token</a></p>`
}
