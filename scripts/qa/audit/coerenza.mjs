// AUDIT 11 · coerenza dei contenuti: orari uguali ovunque (Programma, Oggi, riepilogo WhatsApp, percorso), indirizzo
// della colazione (card, tassista, Uber), prezzi, tappe fuori dall'orario di apertura, e un controllo ortografico euristico.
import { readFileSync } from 'node:fs'
import { lancia, pagina, vai, Registro } from './_lib.mjs'
const R = new Registro('coerenza')
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8')), venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues
const b = await lancia()
const GIORNI = { ven: '2026-10-16', sab: '2026-10-17', dom: '2026-10-18' }
// ---- orari: Programma vs Oggi vs riepilogo WhatsApp ----
for (const [key, person] of [['ven', 'ale'], ['ven', 'monne'], ['sab', 'ale'], ['sab', 'giulio'], ['dom', 'ale'], ['dom', 'manuel']]) {
  for (const piove of [false, true]) {
    const { p, ctx } = await pagina(b, { person, piove, init: () => { window.__copiato = []; navigator.clipboard.writeText = (t) => { window.__copiato.push(t); return Promise.resolve() } } })
    await vai(p, '#/programma/' + key)
    const prog = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.timeline > li:not(.timeline__opz) .card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
    const etichette = await p.evaluate(() => [...document.querySelectorAll('[data-percorso]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()))
    await vai(p, `#/oggi?now=${GIORNI[key]}T05:00`)
    const oggi = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
    await p.locator('#copy').click().catch(() => {}); await p.waitForTimeout(300)
    const wa = await p.evaluate(() => window.__copiato.at(-1) || '')
    const righeWa = Object.fromEntries((wa.match(/^(\d\d:\d\d) (.+?)(?: –|$)/gm) || []).map((r) => [r.slice(6).replace(/ –.*$/, '').trim(), r.slice(0, 5)]))
    let diff = 0
    for (const [id, t] of Object.entries(prog)) {
      if (oggi[id] !== undefined && oggi[id] !== t) { diff++; R.problema('ALTA', `${id}: ${t} nel Programma, ${oggi[id]} in Oggi`, { dove: `${key} ${person}${piove ? ' pioggia' : ''}` }) }
      const nome = venues[it.days.flatMap((d) => d.stops).find((s) => s.id === id)?.venueId]?.name
      const tWa = Object.entries(righeWa).find(([n]) => nome && (n.startsWith(nome) || nome.startsWith(n)))?.[1]
      if (tWa && tWa !== t.replace('~', '')) { diff++; R.problema('ALTA', `${id}: ${t} nel Programma, ${tWa} nel riepilogo WhatsApp`, { dove: `${key} ${person}${piove ? ' pioggia' : ''}` }) }
    }
    if (!diff) R.ok(`${key} ${person}${piove ? ' pioggia' : ''}: orari uguali in Programma, Oggi e riepilogo (${Object.keys(prog).length} tappe, ${Object.keys(righeWa).length} righe WhatsApp)`)
    for (const e of etichette) { const [a, b2] = e.split('→').map((x) => x && x.trim().split('\n')[0]); if (!a) continue; const nomi = Object.values(venues).map((v) => v.name); if (!nomi.some((n) => n.includes(a.replace(/^.*?·\s*/, '').trim().slice(0, 8)))) R.problema('BASSA', `etichetta percorso "${e.slice(0, 50)}" non parte dal nome di un locale`, { dove: key }) }
    await ctx.close()
  }
}
// ---- indirizzo della colazione: card, tassista, Uber ----
{
  const { p, ctx } = await pagina(b); await vai(p, '#/programma/ven')
  const s = await p.evaluate(() => { const c = document.querySelector('.card[data-stop="f1b"]'); return { venue: c.querySelector('.card__venue')?.textContent, tassista: c.querySelector('.tassista__addr')?.textContent, uber: decodeURIComponent(c.querySelector('[data-taxi-uber]')?.getAttribute('href') || '') } })
  const n = (x) => (x || '').replace(/[,·]/g, ' ').replace(/\s+/g, ' ').toLowerCase()
  const via = 'carrer de la princesa 22'
  if (![s.venue, s.tassista, s.uber].every((x) => n(x).includes(via))) R.problema('BLOCCANTE', 'indirizzo della colazione diverso fra card, tassista e Uber', { nota: JSON.stringify(s).slice(0, 200) }); else R.ok('colazione: stesso indirizzo in card, blocco tassista e link Uber')
  if (!/41\.3854186.*2\.1806806/.test(s.uber)) R.problema('BLOCCANTE', 'Uber: coordinate diverse da Brunells', { nota: s.uber.slice(0, 120) })
  await ctx.close()
}
// ---- prezzi: Info vs card dell'appartamento ----
{
  const { p, ctx } = await pagina(b); await vai(p, '#/info/apt'); await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
  const info = (await p.evaluate(() => document.querySelector('#sec-apt')?.innerText || '')).match(/€\s?\d[\d.,]*|\d[\d.,]*\s?€/g) || []
  await vai(p, '#/programma/ven'); const card = (await p.evaluate(() => document.querySelector('.card[data-stop="f12"]')?.innerText || '')).match(/€\s?\d[\d.,]*|\d[\d.,]*\s?€/g) || []
  const norm = (x) => x.replace(/[€\s]/g, '')
  const soloCard = card.map(norm).filter((x) => !info.map(norm).includes(x))
  if (soloCard.length && info.length) R.problema('MEDIA', `prezzi dell'appartamento diversi fra card e Info: card ${card.join(' ')} · Info ${info.join(' ')}`, { dove: '#/info/apt vs f12' }); else R.ok(`prezzi appartamento: card ${card.join(' ') || '—'} · Info ${info.join(' ') || '—'}`)
  await ctx.close()
}
// ---- tappe fuori dall'orario di apertura ----
const DAYN = { ven: 5, sab: 6, dom: 0 }, SIGLE = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const minuti = (t) => { const [h, m] = t.split(/[:.]/).map(Number); return h * 60 + (m || 0) }
function fasce(hours, giorno) {
  // segmenti separati da · o ; ogni segmento: giorni + orari. Torna [[da,a]] o 'chiuso' o null (non capito)
  const segs = hours.split(/·|;/).map((x) => x.trim().toLowerCase())
  let out = null
  for (const seg of segs) {
    const giorniSeg = []
    for (const m of seg.matchAll(/\b(dom|lun|mar|mer|gio|ven|sab)[a-zì]*\b(?:\s*[-–/]\s*(dom|lun|mar|mer|gio|ven|sab)[a-zì]*)?/g)) { const a = SIGLE.indexOf(m[1]); if (m[2]) { const z = SIGLE.indexOf(m[2]); for (let i = a; ; i = (i + 1) % 7) { giorniSeg.push(i); if (i === z) break } } else giorniSeg.push(a) }
    const tutti = /tutti i giorni|24 ore|sempre/.test(seg)
    if (!tutti && giorniSeg.length && !giorniSeg.includes(giorno)) continue
    if (!tutti && !giorniSeg.length && segs.length > 1) continue
    if (/chius/.test(seg)) return 'chiuso'
    if (/24 ore|sempre/.test(seg)) return [[0, 1440]]
    const r = [...seg.matchAll(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/g)].map((m) => [minuti(m[1]), minuti(m[2])])
    const fino = seg.match(/fino alle (\d{1,2}[:.]\d{2})/); if (fino) r.push([0, minuti(fino[1])])
    const aperto = seg.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*$/); if (aperto) r.push([minuti(aperto[1]), 1440])
    if (r.length) out = (out || []).concat(r)
  }
  return out
}
let fuori = 0, nonVer = []
for (const d of it.days) { const key = Object.keys(GIORNI).find((k) => GIORNI[k] === d.date); for (const s of d.stops) { const v = venues[s.venueId]; if (!v?.hours || s.time == null) continue; const f = fasce(v.hours, DAYN[key]); const t = minuti(s.time) + (minuti(s.time) < 240 ? 1440 : 0); const fine = t + (s.durataMin || 0); if (f === 'chiuso') { fuori++; R.problema('BLOCCANTE', `${s.id} ${s.title}: alle ${s.time} ma il locale è chiuso quel giorno ("${v.hours}")`, { dove: 'data/venues.json' }) } else if (!f) nonVer.push(`${s.id} "${v.hours}"`); else if (!f.some(([a, z]) => t >= a && t < z)) { fuori++; R.problema('ALTA', `${s.id} ${s.title}: alle ${s.time} ma apre "${v.hours}"`, { dove: 'data/itinerary.json' }) } else if (!f.some(([a, z]) => fine <= z)) R.problema('MEDIA', `${s.id} ${s.title}: inizia alle ${s.time} ma la sosta finisce dopo la chiusura ("${v.hours}")`, { dove: 'data/itinerary.json' }) } }
if (!fuori) R.ok('nessuna tappa fuori dall\'orario di apertura del locale (dove l\'orario è scritto in modo leggibile)')
if (nonVer.length) R.numero('orari non interpretabili automaticamente', nonVer.join(' · '))
// ---- ortografia euristica sul testo visibile ----
{
  const { p, ctx } = await pagina(b)
  let testo = ''
  for (const h of ['#/oggi?now=2026-10-15T10:00', '#/oggi?now=2026-10-16T10:00', '#/oggi?now=2026-10-20T10:00', '#/programma/ven', '#/programma/sab', '#/programma/dom', '#/missioni', '#/info']) { await vai(p, h); await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true })); testo += '\n' + await p.evaluate(() => document.body.innerText) }
  await p.evaluate(() => { localStorage.setItem('b40:v1:piove', 'true') }); for (const h of ['#/programma/ven', '#/programma/dom']) { await vai(p, h); await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true })); testo += '\n' + await p.evaluate(() => document.body.innerText) }
  const TIPI = [[/\b(un'altro|qual'è|perchè|poichè|affinchè|sè stesso|fà\b|pò\b|un pò|E' |e' |piu'|cosi'|puo'|gia'|citta'|nessun'altro|propio|accellera|conoscienza|sopratutto|daccordo|apposto\b|aereoporto|aeroporti\b|efficente|sufficente|pultroppo|abbastanza)\b/i, 'refuso frequente'], [/\s,|\s\.(?!\.)|\s;|\(\s|\s\)/, 'spazio prima della punteggiatura'], [/\b(\w{3,}) \1\b/i, 'parola ripetuta'], [/[a-zà-ü]\.\s+[a-zà-ü]{3,}/, 'minuscola dopo il punto']]
  const righe = testo.split('\n').map((r) => r.trim()).filter((r) => r.length > 3)
  const trovati = new Map()
  for (const r of righe) for (const [re, tipo] of TIPI) { const m = r.match(re); if (m && !/\d|km|min|€|www|http|\.\.\.|…/.test(m[0]) && !/[A-Z]{2,}/.test(m[0])) { const k = tipo + '|' + m[0]; if (!trovati.has(k)) trovati.set(k, r.slice(0, 90)) } }
  for (const [k, r] of trovati) { const [tipo, m] = k.split('|'); if (tipo === 'minuscola dopo il punto' && /\b(ca|es|etc|ecc|c|p|h|min)\.\s/.test(m)) continue; R.problema('BASSA', `${tipo}: "${m}"`, { nota: r }) }
  R.numero('righe di testo visibile controllate', righe.length)
  R.problema('BASSA', 'controllo ortografico solo euristico: nessun dizionario italiano disponibile in questo ambiente', { nota: 'refusi "classici", spazi prima della punteggiatura, parole ripetute, minuscole dopo il punto' })
  await ctx.close()
}
await b.close(); R.salva()
