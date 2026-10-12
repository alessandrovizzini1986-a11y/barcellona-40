// Allerte meteo e protezione civile → notifica sul telefono (ntfy) e public/allerte.json per il sito.
//
// Fonte: MeteoAlarm (EUMETNET), che ripubblica gli avvisi ufficiali di AEMET (Spagna) e della Protezione Civile
// (Italia) in formato CAP/Atom, senza chiave. Letti il 12/10/2026: i campi usati sono documentati in ALLERTE.md.
// Aree: Spagna → areaDesc che contiene "Barcelona" (AEMET: "Litoral de Barcelona", "Prelitoral de Barcelona");
// Italia → "Emilia e Romagna" (il feed italiano ha 13 aree, una per regione: la pianura bolognese non è distinta).
//
// Gira in GitHub Actions ogni ora (.github/workflows/allerte.yml) SOLO dal 15/10 00:00 al 19/10 06:00 ora di Roma:
// fuori dalla finestra esce subito. Notifica solo quando cambia qualcosa rispetto a public/allerte.json (nuova
// allerta, cambio di livello, fine): mai lo stesso avviso due volte. Il topic ntfy sta nel secret NTFY_TOPIC,
// mai qui e mai nel sito. Nessuna dipendenza: solo fetch e un parser Atom a espressioni regolari.
//
//   node scripts/allerte.mjs            (giro normale)
//   node scripts/allerte.mjs --test     (manda "✅ Allerte Barcelona 40 attive" e basta)
// Variabili per le prove: ALLERTE_ORA (ISO, data finta), ALLERTE_FEED_ES / ALLERTE_FEED_IT / ALLERTE_METEO (URL o
// file locale al posto dei feed veri), NTFY_URL (al posto di https://ntfy.sh/<topic>), ALLERTE_STATO (file di stato).
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATO = process.env.ALLERTE_STATO || path.join(ROOT, 'public', 'allerte.json')
const FEED = {
  es: process.env.ALLERTE_FEED_ES || 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain',
  it: process.env.ALLERTE_FEED_IT || 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-italy'
}
// Open-Meteo su Barcellona: pre-allarme NON ufficiale se nelle prossime 12 ore è prevista pioggia ≥ 10 mm/h
const METEO = process.env.ALLERTE_METEO || 'https://api.open-meteo.com/v1/forecast?latitude=41.3874&longitude=2.1686&hourly=precipitation&forecast_days=2&timezone=Europe%2FMadrid'
const SOGLIA_MM = 10
const NTFY = process.env.NTFY_URL || (process.env.NTFY_TOPIC ? `https://ntfy.sh/${process.env.NTFY_TOPIC}` : '')
// Finestra attiva, ora di Roma
const INIZIO = '2026-10-15T00:00', FINE = '2026-10-19T06:00'
const ZONE = {
  barcellona: { feed: 'es', area: /Barcelona/i, nome: 'Barcellona' },
  bologna: { feed: 'it', area: /Emilia e Romagna|Bologna/i, nome: 'Bologna / Emilia-Romagna' }
}
const TEST = process.argv.includes('--test')

// ——— ora di Roma ———
function adessoRoma() {
  const d = process.env.ALLERTE_ORA ? new Date(process.env.ALLERTE_ORA) : new Date()
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  return f.format(d).replace(' ', 'T') // "2026-10-15T08:30"
}
const inFinestra = (t) => t >= INIZIO && t < FINE

// ——— lettura feed (URL o file) ———
async function leggi(src) {
  if (!/^https?:/.test(src)) return readFileSync(src, 'utf8')
  const r = await fetch(src, { headers: { 'User-Agent': 'barcelona40-allerte (github actions)', Accept: 'application/atom+xml, application/xml, application/json' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${src}`)
  return r.text()
}
const tag = (xml, nome) => { const m = xml.match(new RegExp(`<${nome}[^>]*>([^<]*)</${nome}>`)); return m ? decodifica(m[1].trim()) : '' }
const decodifica = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
// Un'entry Atom di MeteoAlarm → la nostra allerta. Il livello sta nel titolo ("Yellow Rain Warning issued for…");
// se manca, dalla severity CAP (Moderate = giallo, Severe = arancione, Extreme = rosso). Minor/verde non è un'allerta.
function entries(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]).map((e) => {
    const titolo = tag(e, 'title'), severity = tag(e, 'cap:severity')
    const colore = (titolo.match(/\b(Yellow|Orange|Red)\b/i) || [])[1]?.toLowerCase()
    const livello = colore === 'red' ? 'rosso' : colore === 'orange' ? 'arancione' : colore === 'yellow' ? 'giallo' : severity === 'Extreme' ? 'rosso' : severity === 'Severe' ? 'arancione' : severity === 'Moderate' ? 'giallo' : null
    const evento = tag(e, 'cap:event')
    const cap = (e.match(/<link[^>]*type="application\/cap\+xml"[^>]*href="([^"]+)"/) || [])[1] || ''
    const pagina = (e.match(/<link[^>]*title="[^"]*"[^>]*href="([^"]+)"[^>]*hreflang/) || [])[1] || ''
    return { identifier: tag(e, 'cap:identifier'), area: tag(e, 'cap:areaDesc'), evento, livello, tipo: tipoDi(evento), inizio: tag(e, 'cap:onset') || tag(e, 'cap:effective'), fine: tag(e, 'cap:expires'), titolo, fonte: decodifica(pagina || cap), status: tag(e, 'cap:status') }
  })
}
function tipoDi(evento) {
  const e = evento.toLowerCase()
  if (/thunder|storm|tempest/.test(e)) return 'temporali'
  if (/rain|lluvia|pioggia|precip/.test(e)) return 'pioggia'
  if (/wind|viento|vento/.test(e)) return 'vento'
  if (/coast|sea|mar\b|marit|wave/.test(e)) return 'mare'
  if (/fog|niebla|nebbia/.test(e)) return 'nebbia'
  if (/snow|nieve|neve/.test(e)) return 'neve'
  if (/temperat|heat|cold|calor|frío/.test(e)) return 'temperatura'
  if (/flood|inund|alluv/.test(e)) return 'alluvione'
  return evento || 'avviso'
}
// Una allerta per (zona, tipo, livello, inizio, fine): l'id non dipende da "sent", che MeteoAlarm aggiorna spesso
const idDi = (a) => `${a.zona}:${a.tipo}:${a.livello}:${a.inizio}:${a.fine}`

async function allerteUfficiali() {
  const out = [], errori = []
  for (const [zona, z] of Object.entries(ZONE)) {
    try {
      const xml = await leggi(FEED[z.feed])
      for (const e of entries(xml)) {
        if (!z.area.test(e.area) || !e.livello || e.status === 'Test') continue
        out.push({ ...e, zona, id: '' })
      }
    } catch (err) { errori.push(`${zona}: ${err.message}`) }
  }
  return { allerte: out.map((a) => ({ ...a, id: idDi(a) })), errori }
}
// Pre-allarme non ufficiale da Open-Meteo: la prima ora, nelle prossime 12, con pioggia ≥ 10 mm
async function preallarme(adesso) {
  try {
    const j = JSON.parse(await leggi(METEO))
    const ore = j.hourly?.time || [], mm = j.hourly?.precipitation || []
    const i0 = Math.max(0, ore.findIndex((t) => t >= adesso.slice(0, 13) + ':00'))
    for (let i = i0; i < Math.min(ore.length, i0 + 12); i++) {
      if ((mm[i] || 0) >= SOGLIA_MM) {
        const inizio = ore[i], fine = ore[Math.min(ore.length - 1, i + 1)]
        const a = { zona: 'barcellona', area: 'Barcellona (previsione Open-Meteo)', evento: `Pioggia prevista ${mm[i]} mm/h`, livello: 'preallarme', tipo: 'pioggia forte prevista', inizio, fine, titolo: 'Pre-allarme non ufficiale', fonte: 'https://open-meteo.com/', nonUfficiale: true }
        return { ...a, id: `barcellona:preallarme:${inizio}` }
      }
    }
  } catch { /* Open-Meteo giù o non raggiungibile: nessun pre-allarme, nessun errore */ }
  return null
}

// ——— notifiche ———
const PRIORITA = { giallo: '3', arancione: '4', rosso: '5', preallarme: '3' }
const EMOJI = { giallo: '🟡', arancione: '🟠', rosso: '🔴', preallarme: '🌧' }
const NOME = { giallo: 'GIALLA', arancione: 'ARANCIONE', rosso: 'ROSSA' } // "allerta" è femminile: gialla, arancione, rossa
const TAGS = { giallo: 'warning', arancione: 'warning', rosso: 'rotating_light', preallarme: 'cloud_with_rain' }
const oraIt = (iso, tz) => { try { const d = new Date(iso); const g = new Intl.DateTimeFormat('it-IT', { timeZone: tz, weekday: 'short', day: 'numeric' }).format(d); const h = new Intl.DateTimeFormat('it-IT', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); return { g, h } } catch { return { g: '', h: '' } } }
export function finestraTesto(a) {
  const tz = a.zona === 'bologna' ? 'Europe/Rome' : 'Europe/Madrid'
  const i = oraIt(a.inizio, tz), f = oraIt(a.fine, tz)
  if (!i.h) return ''
  return `${i.g} dalle ${i.h} alle ${f.h}${f.g && f.g !== i.g ? ` di ${f.g}` : ''}`
}
export function testoNotifica(a, tipoCambio) {
  const dove = a.zona === 'bologna' ? 'Bologna / Emilia-Romagna' : 'Barcellona'
  if (tipoCambio === 'fine') return { titolo: `${dove}: allerta terminata`, corpo: `🟢 ${dove}: allerta ${a.tipo} terminata.`, priorita: '3', tags: 'white_check_mark' }
  const finestra = finestraTesto(a)
  if (a.livello === 'preallarme') return { titolo: 'Pre-allarme pioggia (non ufficiale)', corpo: `🌧 Barcellona: ${a.evento} ${finestra}. Previsione Open-Meteo, non un'allerta ufficiale: ombrello e occhio ai feed.`, priorita: '3', tags: TAGS.preallarme }
  const cosa = a.zona === 'bologna'
    ? 'Parti 15 min prima.'
    : a.livello === 'rosso' ? 'Resta al chiuso, segui @emergenciescat e il 112.' : a.livello === 'arancione' ? 'Niente moli, sottopassi e metro in zone basse. Taxi.' : 'Programma invariato, ombrello.'
  const testa = tipoCambio === 'cambio' ? `${EMOJI[a.livello]} ${dove}: allerta passa a ${NOME[a.livello] || a.livello}` : `${EMOJI[a.livello]} ${dove}: allerta ${NOME[a.livello] || a.livello}`
  return { titolo: `${dove}: allerta ${(NOME[a.livello] || a.livello).toLowerCase()}${a.tipo ? ` ${a.tipo}` : ''}`, corpo: `${testa} ${a.tipo}${finestra ? `, ${finestra}` : ''}. ${cosa}`, priorita: PRIORITA[a.livello] || '3', tags: TAGS[a.livello] || 'warning' }
}
async function manda(n) {
  if (!NTFY) { console.log(`(nessun NTFY_TOPIC: non mando) ${n.corpo}`); return false }
  const r = await fetch(NTFY, { method: 'POST', headers: { Title: n.titolo, Priority: n.priorita, Tags: n.tags, 'Content-Type': 'text/plain; charset=utf-8' }, body: n.corpo })
  if (!r.ok) throw new Error(`ntfy HTTP ${r.status}`)
  console.log(`→ ${n.corpo}`)
  return true
}

// ——— confronto con lo stato precedente ———
export function differenze(prima, dopo) {
  const out = []
  const vecchie = new Map(prima.map((a) => [a.id, a]))
  const chiave = (a) => `${a.zona}:${a.tipo}` // stessa zona e stesso tipo: se cambia il livello è un "cambio", non una nuova
  const perChiave = new Map(prima.map((a) => [chiave(a), a]))
  for (const a of dopo) {
    if (vecchie.has(a.id)) continue
    const stessa = perChiave.get(chiave(a))
    out.push({ tipo: stessa && stessa.livello !== a.livello ? 'cambio' : 'nuova', allerta: a })
  }
  // fine: una zona che aveva allerte e ora non ne ha più (una notifica sola, per tipo)
  for (const a of prima) {
    if (dopo.some((b) => chiave(b) === chiave(a))) continue
    if (out.some((o) => o.tipo === 'fine' && chiave(o.allerta) === chiave(a))) continue
    out.push({ tipo: 'fine', allerta: a })
  }
  return out
}
const leggiStato = () => { try { return JSON.parse(readFileSync(STATO, 'utf8')) } catch { return { attive: [] } } }

async function main() {
  const adesso = adessoRoma()
  if (TEST) {
    await manda({ titolo: 'Allerte Barcelona 40', corpo: '✅ Allerte Barcelona 40 attive', priorita: '3', tags: 'white_check_mark' })
    return
  }
  if (!inFinestra(adesso)) { console.log(`fuori finestra (${adesso}, attiva ${INIZIO} → ${FINE} ora di Roma): niente da fare`); return }
  const { allerte, errori } = await allerteUfficiali()
  const pre = await preallarme(adesso)
  const attive = [...allerte, ...(pre ? [pre] : [])]
  const stato = leggiStato()
  const prima = stato.attive || []
  const cambi = differenze(prima, attive)
  for (const c of cambi) await manda(testoNotifica(c.allerta, c.tipo))
  const nuovo = {
    aggiornato: new Date().toISOString(),
    finestra: { inizio: INIZIO, fine: FINE, fuso: 'Europe/Rome' },
    attive: attive.map(({ id, zona, area, livello, tipo, evento, inizio, fine, fonte, titolo, nonUfficiale }) => ({ id, zona, area, livello, tipo, evento, inizio, fine, fonte, titolo, ...(nonUfficiale ? { nonUfficiale: true } : {}) })),
    errori
  }
  // si scrive solo se cambia qualcosa che conta: così il workflow non committa un file nuovo ogni ora
  const cambiato = JSON.stringify(nuovo.attive) !== JSON.stringify(prima) || JSON.stringify(nuovo.errori) !== JSON.stringify(stato.errori || [])
  if (cambiato) { writeFileSync(STATO, JSON.stringify(nuovo, null, 1) + '\n'); console.log(`stato scritto: ${attive.length} attive, ${cambi.length} notifiche`) } else console.log(`nessun cambiamento: ${attive.length} attive, 0 notifiche`)
  if (errori.length) console.log('feed non letti: ' + errori.join(' | '))
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `cambiato=${cambiato}\n`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message + (e.cause?.message ? ' · ' + e.cause.message : '')); process.exit(1) })
