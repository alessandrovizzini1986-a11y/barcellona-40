// Controllo automatico della pagina di Londra: le cose che non devono rompersi mai.
// Gira sulla build (dist/) servita da `npm run preview`, come le altre suite di scripts/qa.
//
//   npm run build && npm run preview &   poi   node scripts/qa/londra-check.mjs [http://localhost:4173]
//
// Controlla: i percorsi Maps identici al riferimento (22 dalla versione definitiva dell'8/11), l'ordine dei percorsi di lunedì, il payload del QR, i 3 barcode del museo i 3 QR di SEA LIFE e il QR del Science Museum (decodificati
// dagli SVG, non letti dal testo), le voci «da verificare» uguali fra pagina e DA_VERIFICARE_LONDRA.md,
// nessuna chiave di storage oltre londra:novita:vista e londra:piove, cartella foto sotto 1,5 MB, alt su tutte le
// immagini, nessun controllo sotto 44 px, service worker che non copre le pagine di Barcellona.
// Bagni puliti: ogni data-bagno esiste nel JSON, ogni tappa ha principale e riserva, il JSON è nel precache e nella cache
// del service worker, le righe ci sono, i controlli dei pannelli sono da 44 px e a 375 px non si scorre di lato.
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const base = (process.argv[2] || 'http://localhost:4173').replace(/\/$/, '')
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'
const PAGINA = base + '/londra.html'
const ok = (n, c, x = '') => { if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x !== '' ? ' · ' + x : ''}`) }

// Riferimenti scritti a mano: se qualcuno li "ripulisce" nella pagina, il controllo cade.
const PERCORSI = [
  // domenica (5): versione definitiva dell'8/11, col deposito Food Express e il battello
  'https://www.google.com/maps/dir/?api=1&origin=51.5031,-0.1132&destination=51.5054668,-0.1171985&waypoints=51.5025654,-0.1165451&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5054668,-0.1171985&destination=51.501558,-0.119506&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.501558,-0.119506&destination=51.5034333,-0.1196629&waypoints=51.5025654,-0.1165451&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5073974,-0.1213608&destination=51.5123401,-0.1342553&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5129114,-0.1364381&destination=51.5133,-0.1391&waypoints=51.51283,-0.1400828&travelmode=walking',
  // lunedì (11): L1–L5 nell'ordine delle card dopo il Cambio della Guardia (double check del 7/11), poi il pomeriggio:
  // piano asciutto (Harrods → Royal Albert Hall, Albert Memorial → NHM) e piano pioggia (Harrods → Science Museum → NHM)
  'https://www.google.com/maps/dir/?api=1&origin=51.5129114,-0.1364381&destination=51.508039,-0.128069&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.508039,-0.128069&destination=51.5007292,-0.1246254&waypoints=51.5047752,-0.1272358&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5007292,-0.1246254&destination=51.5003309,-0.1356875&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5003309,-0.1356875&destination=51.501364,-0.14189&waypoints=51.502967,-0.1339534&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.501364,-0.14189&destination=51.4994055,-0.1632344&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.4994055,-0.1632344&destination=51.501461,-0.178819&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5023516,-0.177707&destination=51.496715,-0.1763672&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.4994055,-0.1632344&destination=51.4972216,-0.1767283&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.4972216,-0.1767283&destination=51.496715,-0.1763672&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.4967150,-0.1763672&destination=51.5098,-0.1342&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5098,-0.1342&destination=51.5129114,-0.1364381&waypoints=51.5131,-0.1400&travelmode=walking',
  // martedì (6), versione definitiva dell'8/11: Beak St → Rupert St, Rupert St → Camden, piano B dentro la card di Camden,
  // Camden → Poppies, Poppies → Covent Garden, Covent Garden → Rupert St → Heathrow T5
  'https://www.google.com/maps/dir/?api=1&origin=51.5129114,-0.1364381&destination=51.5120078,-0.1336085&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5120078,-0.1336085&destination=51.539292,-0.14274&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.539292,-0.14274&destination=51.4723,-0.4887&waypoints=51.5120078,-0.1336085&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.539292,-0.14274&destination=51.5409723,-0.143961&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5409723,-0.143961&destination=51.5122737,-0.1234492&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5122737,-0.1234492&destination=51.4723,-0.4887&waypoints=51.5120078,-0.1336085&travelmode=transit'
]
const QR_PAYLOAD = '$BLQ3039188LGT@'
const BARCODE = ['1001401807011726169', '1001401807011726170', '1001401807011726171']
const SCIENCE_MUSEUM = 'ON18896320'   // codice dell'ordine 18896320, un QR per 2 adulti + 1 bambina
const SEALIFE = ['772334430770151846', '773215047000220012', '777155289086963187']   // codici numerici del PDF ufficiale, ordine 129390167
const LIMITE_FOTO_KB = 1500

// ---------- decodifica QR (versioni 1–3, un blocco, modalità byte, numerica o alfanumerica) da un path SVG a tratti orizzontali ----------
function moduliDaPath(d, quiet) {
  const righe = new Map(); let x = 0, y = 0
  for (const [, c, a, b] of d.matchAll(/([MmHh])\s*(-?[\d.]+)(?:\s+(-?[\d.]+))?/g)) {
    if (c === 'M') { x = +a; y = +b } else if (c === 'm') { x += +a; y += +b }
    else { const n = c === 'h' ? +a : +a - x; const r = Math.floor(y) - quiet; for (let i = 0; i < n; i++) (righe.get(r) || righe.set(r, new Set()).get(r)).add(x - quiet + i); x += n }
  }
  return (r, c) => !!righe.get(r)?.has(c)
}
const MASCHERE = [(i, j) => (i + j) % 2 === 0, (i) => i % 2 === 0, (i, j) => j % 3 === 0, (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0, (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
  (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0, (i, j) => ((i + j) % 2 + (i * j) % 3) % 2 === 0]
const DATI = { 1: [19, 16, 13, 9], 2: [34, 28, 22, 16], 3: [55, 44] }   // codeword di dati per L, M, Q, H
function decodificaQR(scuro, n) {
  const v = (n - 17) / 4
  const funzione = (r, c) => (r < 9 && c < 9) || (r < 9 && c >= n - 8) || (r >= n - 8 && c < 9) || r === 6 || c === 6 ||
    (v >= 2 && Math.abs(r - (n - 7)) <= 2 && Math.abs(c - (n - 7)) <= 2)
  const ordine = []
  for (let c = n - 1, su = true; c > 0; c -= 2, su = !su) {
    if (c === 6) c = 5
    for (let k = 0; k < n; k++) { const r = su ? n - 1 - k : k; for (const cc of [c, c - 1]) if (!funzione(r, cc)) ordine.push([r, cc]) }
  }
  const risultati = []
  for (let liv = 0; liv < 4; liv++) for (let m = 0; m < 8; m++) {
    const nDati = DATI[v]?.[liv]; if (!nDati) continue
    const bit = ordine.map(([r, c]) => scuro(r, c) !== MASCHERE[m](r, c))
    const byte = []; for (let i = 0; i + 8 <= bit.length && byte.length < nDati; i += 8) byte.push(bit.slice(i, i + 8).reduce((a, b) => a * 2 + (b ? 1 : 0), 0))
    const flusso = byte.flatMap((b) => [...b.toString(2).padStart(8, '0')].map(Number)); let p = 0
    const leggi = (k) => { let x = 0; for (let i = 0; i < k; i++) x = x * 2 + (flusso[p++] ?? 0); return x }
    const modo = leggi(4); let s = ''
    if (modo === 4) {                                              // byte
      const len = leggi(v < 10 ? 8 : 16); if (len < 1 || p + len * 8 > flusso.length) continue
      for (let i = 0; i < len; i++) s += String.fromCharCode(leggi(8))
    } else if (modo === 1) {                                       // numerica: 3 cifre in 10 bit, poi 2 in 7 o 1 in 4
      const len = leggi(10); if (len < 1) continue
      for (let r = len; r > 0; r -= 3) { const k = Math.min(r, 3), x = leggi([0, 4, 7, 10][k]); if (x >= 10 ** k) { s = ''; break } s += String(x).padStart(k, '0') }
      if (s.length !== len || p > flusso.length) continue
    } else if (modo === 2) {                                       // alfanumerica: 2 caratteri in 11 bit, l'ultimo da solo in 6
      const AN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
      const len = leggi(9); if (len < 1) continue
      for (let r = len; r > 0; r -= 2) { if (r >= 2) { const x = leggi(11); if (x >= 45 * 45) { s = ''; break } s += AN[Math.floor(x / 45)] + AN[x % 45] } else { const x = leggi(6); if (x >= 45) { s = ''; break } s += AN[x] } }
      if (s.length !== len || p > flusso.length) continue
    } else continue
    if (leggi(4) !== 0) continue                                   // terminatore
    p = Math.ceil(p / 8) * 8; const riemp = []; while (p + 8 <= flusso.length) riemp.push(leggi(8))
    if (riemp.every((b) => b === 0 || b === 0xEC || b === 0x11)) risultati.push(s)   // riempimento ammesso dallo standard
  }
  return [...new Set(risultati)]
}

// ---------- decodifica CODE128 da rettangoli SVG (M x y h w v.. h-w z) ----------
const C128 = '11011001100,11001101100,11001100110,10010011000,10010001100,10001001100,10011001000,10011000100,10001100100,11001001000,11001000100,11000100100,10110011100,10011011100,10011001110,10111001100,10011101100,10011100110,11001110010,11001011100,11001001110,11011100100,11001110100,11101101110,11101001100,11100101100,11100100110,11101100100,11100110100,11100110010,11011011000,11011000110,11000110110,10100011000,10001011000,10001000110,10110001000,10001101000,10001100010,11010001000,11000101000,11000100010,10110111000,10110001110,10001101110,10111011000,10111000110,10001110110,11101110110,11010001110,11000101110,11011101000,11011100010,11011101110,11101011000,11101000110,11100010110,11101101000,11101100010,11100011010,11101111010,11001000010,11110001010,10100110000,10100001100,10010110000,10010000110,10000101100,10000100110,10110010000,10110000100,10011010000,10011000010,10000110100,10000110010,11000010010,11001010000,11110111010,11000010100,10001111010,10100111100,10010111100,10010011110,10111100100,10011110100,10011110010,11110100100,11110010100,11110010010,11011011110,11011110110,11110110110,10101111000,10100011110,10001011110,10111101000,10111100010,11110101000,11110100010,10111011110,10111101110,11101011110,11110101110,11010000100,11010010000,11010011100,1100011101011'.split(',')
function decodificaC128(d) {
  const barre = [...d.matchAll(/M(-?[\d.]+)\s+-?[\d.]+h(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]).sort((a, b) => a[0] - b[0])
  if (!barre.length) return null
  const mod = Math.min(...barre.map((b) => b[1])), x0 = barre[0][0], fine = barre.at(-1)[0] + barre.at(-1)[1]
  let bit = ''; for (let x = x0; x < fine; x += mod) bit += barre.some(([bx, w]) => x >= bx && x < bx + w) ? '1' : '0'
  const simboli = []; for (let i = 0; i + 11 <= bit.length; i += 11) { const s = bit.slice(i, i + 11); const k = C128.indexOf(s); if (k < 0) { if (bit.slice(i) === C128[106]) break; return null } simboli.push(k) }
  if (simboli[0] < 103 || simboli[0] > 105) return null
  const somma = simboli.slice(0, -1).reduce((a, s, i) => a + s * (i || 1), 0) % 103
  if (somma !== simboli.at(-1)) return null                              // carattere di controllo
  let set = { 103: 'A', 104: 'B', 105: 'C' }[simboli[0]], out = ''
  for (const s of simboli.slice(1, -1)) {
    if (s === 99) { set = 'C'; continue } if (s === 100) { set = 'B'; continue } if (s === 101) { set = 'A'; continue }
    out += set === 'C' ? String(s).padStart(2, '0') : String.fromCharCode(s + 32)
  }
  return out
}

// ---------- controlli sui file ----------
const md = readFileSync('DA_VERIFICARE_LONDRA.md', 'utf8')
const aperteMd = (md.split(/^## Risolte/m)[0].split(/^## Aperte/m)[1] || '').match(/^### /gm)?.length || 0
const dirFoto = 'dist/assets/tappe/londra'
const kbFoto = readdirSync(dirFoto).reduce((n, f) => n + statSync(path.join(dirFoto, f)).size, 0) / 1024
ok('cartella foto delle tappe sotto 1,5 MB', kbFoto < LIMITE_FOTO_KB, `${kbFoto.toFixed(1)} kB in ${readdirSync(dirFoto).length} file`)

// ---------- controlli nel browser ----------
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-certificate-errors'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' })
const p = await ctx.newPage(); const errori = []; p.on('pageerror', (e) => errori.push(e.message))
await p.goto(PAGINA + '?now=2026-11-16T15:00', { waitUntil: 'load' }); await p.waitForTimeout(1500)
// le card hanno content-visibility: auto (fase 4 UX): fuori schermo non sono disegnate e misurerebbero 0. Per i controlli di
// altezza si forza il disegno di tutto, e si rendono visibili tutte le viste (una sola alla volta è visibile)
await p.addStyleTag({ content: '.tcard,.olly-card,.card{content-visibility:visible!important}' })
await p.evaluate(() => document.querySelectorAll('[data-vista]').forEach((v) => { v.hidden = false }))

const percorsi = await p.$$eval('a.percorso', (a) => a.map((x) => x.getAttribute('href')))
const diversi = PERCORSI.filter((u, i) => percorsi[i] !== u).length
ok(`${PERCORSI.length} percorsi identici al riferimento, carattere per carattere, nessuno in più`, percorsi.length === PERCORSI.length && diversi === 0, `${percorsi.length} trovati, ${diversi} diversi`)

// percorsi di ogni giorno: uno dopo l'altro, toccano ogni tappa una sola volta e nell'ordine delle card. Ogni punto
// (origine, tappe intermedie, arrivo) si riconosce dalle coordinate del «Portami qui» di una card del giorno; i punti di
// passaggio senza card (Waterloo, Piccadilly Circus) non contano. Eccezioni volute: casa all'inizio e alla fine della
// giornata, il deposito (lasciata e ritiro). Non contano i percorsi di riserva («Piano B: …» dentro una card).
// Col piano asciutto contano le card e i percorsi senza .solo-pioggia, con «Piove» quelli senza .solo-asciutto.
const CASA = [51.5129114, -0.1364381]
const ordineGiorno = (data, prefisso, piove) => p.evaluate(({ data, prefisso, piove, CASA }) => {
  const vede = (el) => !el.classList.contains(piove ? 'solo-asciutto' : 'solo-pioggia')
  const coord = (s) => s.split(',').map(Number)
  const card = [...document.querySelectorAll(`#programma article.tcard[data-giorno="${data}"]`)].filter(vede).map((c, i) => {
    const a = c.querySelector('a.gmap--vai'); const m = a && /destination=(-?[\d.]+),(-?[\d.]+)/.exec(a.getAttribute('href') || '')
    return { i, nome: c.querySelector('h4')?.textContent.trim(), tappa: c.dataset.tappa || '', deposito: c.dataset.tipo === 'deposito', p: m ? [+m[1], +m[2]] : null }
  }).filter((c) => c.p)
  const perc = [...document.querySelectorAll(`#programma a.percorso[data-percorso^="${prefisso}"]`)].filter(vede).filter((a) => !/Piano B:/.test(a.dataset.percorso))
  const punti = []
  perc.forEach((a) => {
    const q = new URL(a.getAttribute('href')).searchParams
    const seq = [q.get('origin'), ...(q.get('waypoints') ? q.get('waypoints').split('|') : []), q.get('destination')].map(coord)
    seq.forEach((pt) => { const ult = punti[punti.length - 1]; if (!ult || Math.abs(ult[0] - pt[0]) > 1e-6 || Math.abs(ult[1] - pt[1]) > 1e-6) punti.push(pt) })
  })
  const vicino = (a, b) => Math.abs(a[0] - b[0]) < 2e-4 && Math.abs(a[1] - b[1]) < 3e-4
  let ultimo = -1; const errori = [], visti = []
  punti.forEach((pt, k) => {
    if (vicino(pt, CASA) && (k === 0 || k === punti.length - 1)) return   // si parte e si torna a casa
    const dep = card.some((x) => x.deposito && vicino(x.p, pt))
    if (!dep && visti.some((v) => vicino(v, pt))) { errori.push('punto toccato due volte: ' + pt.join(',')); return }
    visti.push(pt)
    const c = card.find((x) => x.i > ultimo && vicino(x.p, pt))
    if (!c) { if (card.some((x) => vicino(x.p, pt))) errori.push('fuori ordine: ' + (card.find((x) => vicino(x.p, pt)).nome)); return }
    ultimo = c.i
  })
  const mancanti = card.filter((c) => c.tappa && !punti.some((pt) => vicino(pt, c.p))).map((c) => c.nome)
  return { n: perc.length, punti: punti.length, errori, mancanti }
}, { data, prefisso, piove, CASA })
for (const [data, prefisso, nome, piani] of [['2026-11-15', 'Domenica', 'domenica', [false]], ['2026-11-16', 'Lunedì', 'lunedì', [false, true]], ['2026-11-17', 'Martedì', 'martedì', [false]]]) {
  for (const piove of piani) {
    const r = await ordineGiorno(data, prefisso, piove)
    ok(`${nome}${piani.length > 1 ? (piove ? ' con «Piove»' : ', asciutto') : ''}: i percorsi toccano ogni tappa una sola volta, nell'ordine delle card`, !r.errori.length && !r.mancanti.length, `${r.n} percorsi, ${r.punti} punti` + (r.errori.length ? ' · ' + r.errori.join('; ') : '') + (r.mancanti.length ? ' · tappe senza percorso: ' + r.mancanti.join(', ') : ''))
  }
}

// nessun QR né link delle prenotazioni Bounce in pagina (la repo è pubblica): ammesso solo il codice di riferimento
const bounce = await p.evaluate(() => ({ link: [...document.querySelectorAll('a[href]')].filter((a) => /partner\.bounce\.com|bounce\.com\/(booking|reservation|b\/)/i.test(a.href)).length, testo: /partner\.bounce\.com/i.test(document.documentElement.outerHTML) }))
ok('nessun link alle prenotazioni Bounce in pagina', !bounce.link && !bounce.testo, JSON.stringify(bounce))

// lunedì, i due piani come li vede chi usa la pagina (classe «piove» sull'html): l'altro piano non si vede, orari crescenti
// senza sovrapposizioni (ora + durata alta ≤ ora della card dopo), Natural History Museum alle 16:30
for (const piove of [false, true]) {
  const g = await p.evaluate((piove) => {
    document.documentElement.classList.toggle('piove', piove)
    const c = [...document.querySelectorAll('#programma article.tcard[data-giorno="2026-11-16"]')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => { const [h, m] = x.dataset.ora.split(':').map(Number); return { ora: x.dataset.ora, ini: h * 60 + m, dur: +(x.dataset.durata || '0').split('-').pop(), nome: x.querySelector('h4').textContent.trim() } })
    document.documentElement.classList.remove('piove')
    return c
  }, piove)
  const ko = []; g.forEach((c, i) => { const n = g[i + 1]; if (n && (n.ini < c.ini || c.ini + c.dur > n.ini)) ko.push(`${c.ora} ${c.nome} → ${n.ora}`) })
  const vietato = piove ? /Albert Memorial/ : /Science Museum/, intruso = g.filter((c) => vietato.test(c.nome)).map((c) => c.nome)
  const nhm = g.some((c) => c.ora === '16:30' && /Natural History/.test(c.nome))
  ok(`lunedì${piove ? ' con «Piove»: niente Albert Memorial' : ' asciutto: niente Science Museum'}, orari crescenti senza sovrapposizioni, NHM alle 16:30`, !ko.length && !intruso.length && nhm, `${g.length} card` + (ko.length ? ' · ' + ko.join('; ') : '') + (intruso.length ? ' · si vede: ' + intruso.join(', ') : '') + (nhm ? '' : ' · NHM non alle 16:30'))
}

const qr = await p.evaluate(() => { const s = document.querySelector('#biglietti .pk__svg'); return { vb: s.getAttribute('viewBox'), d: s.querySelector('path[stroke]').getAttribute('d'), sfondo: s.querySelector('path[fill]')?.getAttribute('fill') } })
const lato = +qr.vb.split(/\s+/)[2], quiet = 4, nMod = lato - 2 * quiet
const letti = decodificaQR(moduliDaPath(qr.d, quiet), nMod)
ok('QR del parcheggio: payload esatto, fondo bianco', letti.length === 1 && letti[0] === QR_PAYLOAD && /^#fff/i.test(qr.sfondo), JSON.stringify(letti))

const bc = await p.evaluate(() => [...document.querySelectorAll('#biglietti .tk-svg:not(.tk-qr)')].map((s) => ({ d: s.querySelector('path').getAttribute('d'), sfondo: s.querySelector('rect')?.getAttribute('fill'), num: s.closest('.tk-box')?.querySelector('.tk-num')?.textContent.trim() })))
const decod = bc.map((x) => decodificaC128(x.d))
ok('3 barcode del museo: CODE128 decodificati, numero in chiaro uguale, fondo bianco', bc.length === 3 && BARCODE.every((n, i) => decod[i] === n && bc[i].num === n && bc[i].sfondo === '#fff'), decod.join(' · '))

const sl = await p.evaluate(() => [...document.querySelectorAll('#sealifeCard .tk-qr')].map((s) => ({ vb: s.getAttribute('viewBox'), d: s.querySelector('path').getAttribute('d'), sfondo: s.querySelector('rect')?.getAttribute('fill'), num: s.closest('.tk-box')?.querySelector('.tk-num')?.textContent.trim() })))
const slLetti = sl.map((x) => { const n = +x.vb.split(/\s+/)[2] - 4; return decodificaQR(moduliDaPath(x.d, 2), n) })
ok('3 QR di SEA LIFE: decodificati, uguali al codice numerico del PDF e al numero in chiaro, fondo bianco', sl.length === 3 && SEALIFE.every((n, i) => slLetti[i].length === 1 && slLetti[i][0] === n && sl[i].num === n && sl[i].sfondo === '#fff'), slLetti.map((x) => x.join('|')).join(' · '))

// «Cosa vediamo»: ogni card luogo (data-luogo) ha i due blocchi non vuoti; ogni tappa con data-tappa è una card luogo,
// tranne il pranzo da Harrods (la descrizione sta sulla card di Harrods)
const cosa = await p.evaluate(() => {
  const luoghi = [...document.querySelectorAll('#programma article.tcard[data-luogo]')]
  const senza = luoghi.filter((c) => { const v = c.querySelector('.cosa .cosa__vedi'), o = c.querySelector('.cosa .cosa__olly'); const t = (x, k) => x && x.textContent.includes(k) ? x.textContent.replace(k, '').trim() : ''; return !t(v, '📖 Cosa vediamo') || !t(o, '👧 Per Olly') }).map((c) => c.querySelector('h4').textContent.trim())
  const fuori = [...document.querySelectorAll('#programma article.tcard[data-tappa]:not([data-luogo])')].map((c) => c.dataset.tappa).filter((t) => t !== 'pranzo-lun')
  return { n: luoghi.length, senza, fuori }
})
ok('«Cosa vediamo»: ogni card luogo ha «📖 Cosa vediamo» e «👧 Per Olly» non vuoti', cosa.n >= 20 && !cosa.senza.length && !cosa.fuori.length, `${cosa.n} card` + (cosa.senza.length ? ' · vuote: ' + cosa.senza.join(', ') : '') + (cosa.fuori.length ? ' · tappe senza descrizione: ' + cosa.fuori.join(', ') : ''))

const sm = await p.evaluate(() => [...document.querySelectorAll('#scienceMuseumCard .tk-qr')].map((s) => ({ vb: s.getAttribute('viewBox'), d: s.querySelector('path').getAttribute('d'), sfondo: s.querySelector('rect')?.getAttribute('fill'), num: s.closest('.tk-box')?.querySelector('.tk-num')?.textContent.trim() })))
const smLetti = sm.map((x) => decodificaQR(moduliDaPath(x.d, 2), +x.vb.split(/\s+/)[2] - 4))
ok('QR del Science Museum: uno solo, decodificato = codice dell\'ordine e numero in chiaro, fondo bianco', sm.length === 1 && smLetti[0].length === 1 && smLetti[0][0] === SCIENCE_MUSEUM && sm[0].num === SCIENCE_MUSEUM && sm[0].sfondo === '#fff', smLetti.map((x) => x.join('|')).join(' · '))

const dvPagina = await p.evaluate(() => (window.DA_VERIFICARE || []).length)
const dvLista = await p.$$eval('#ppTutta .pp-voce--da_verificare', (x) => x.length)
ok('voci «da verificare» uguali fra pagina e DA_VERIFICARE_LONDRA.md', dvPagina === aperteMd && dvLista === aperteMd, `pagina ${dvPagina}, lista ${dvLista}, file ${aperteMd}`)

const alt = await p.evaluate(() => [...document.querySelectorAll('img')].concat([...document.getElementById('plusSchede').content.querySelectorAll('img')]).filter((i) => !i.hasAttribute('alt') || (!i.getAttribute('alt').trim() && !i.closest('#adesso'))).map((i) => i.getAttribute('src')))
ok('alt su tutte le immagini (vuoto solo per la miniatura di «Adesso», col nome accanto)', !alt.length, alt.join(', ') || `${await p.$$eval('img', (x) => x.length)} immagini`)

// tocchi: ogni controllo visibile almeno 44 × 44, tranne i link dentro un testo (con tutto aperto, mappa avviata)
await p.evaluate(() => { document.querySelectorAll('details').forEach((d) => (d.open = true)); document.getElementById('map').scrollIntoView() }); await p.waitForTimeout(2000)
const piccoli = await p.evaluate(() => [...document.querySelectorAll('a[href], button, summary, input, select, [role=button], .leaflet-marker-icon, .leaflet-control-zoom a')].filter((el) => {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
  if (!r.width || cs.visibility === 'hidden' || el.closest('[hidden], template, .nov-velo')) return false
  if (cs.display === 'inline' && el.closest('p, li, small, .notes, td, .leaflet-control-attribution') && !el.matches('.gmap')) return false
  return r.width < 44 || r.height < 44
}).map((el) => `${el.tagName.toLowerCase()}.${el.className} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`))
ok('nessun controllo sotto 44 px', !piccoli.length, piccoli.slice(0, 5).join(', '))

// depositi nell'itinerario: per ogni deposito e giorno ci sono una card «Lascia» e una «Ritira» (data-tipo="deposito",
// data-deposito-id), e tutte e due, dall'ora d'inizio alla fine della durata, cadono dentro gli orari di apertura di quel
// deposito in data/depositi-londra.json per quel giorno («24 ore», «H:MM–H:MM», o la parte del giorno di «dom … · mar …»)
const depCard = await p.evaluate(async () => {
  const j = await (await fetch('data/depositi-londra.json')).json(); const orari = {}, pren = {}; j.depositi.forEach((d) => { orari[d.id] = d.orari; if (d.prenotato) pren[d.id] = d.prenotazione })
  return { orari, pren, card: [...document.querySelectorAll('#programma article.tcard[data-tipo="deposito"]')].map((c) => ({ id: c.dataset.depositoId, giorno: c.dataset.giorno, ora: c.dataset.ora, dur: +((c.dataset.durata || '0-0').split('-')[1]), nome: c.querySelector('h4').textContent.trim() })) }
})
const SIGLE = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'], SIGLA = { '2026-11-15': 'dom', '2026-11-16': 'lun', '2026-11-17': 'mar' }
const orarioDel = (txt, giorno) => { const g = SIGLE.indexOf(SIGLA[giorno]); let conGiorni = false, out = null
  for (const parte of String(txt || '').split(/\s*·\s*/)) { const m = /^(lun|mar|mer|gio|ven|sab|dom)(?:\s*[–-]\s*(lun|mar|mer|gio|ven|sab|dom))?\s+(.+)$/i.exec(parte); const ch = /^chiuso\s+(lun|mar|mer|gio|ven|sab|dom)/i.exec(parte)
    if (m) { conGiorni = true; const a = SIGLE.indexOf(m[1].toLowerCase()), b = m[2] ? SIGLE.indexOf(m[2].toLowerCase()) : a; if (out == null && g >= a && g <= b) out = m[3] } else if (ch) { conGiorni = true; if (SIGLE.indexOf(ch[1].toLowerCase()) === g) out = 'chiuso' } }
  return conGiorni ? out : String(txt || '') }
const fascia = (t) => { if (/^24 ore/i.test(t || '')) return [0, 48 * 60]; const m = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec(t || ''); if (!m) return null; const a = +m[1] * 60 + +m[2]; let b = +m[3] * 60 + +m[4]; if (b <= a) b += 24 * 60; return [a, b] }
const depKo = [], gruppi = {}
for (const k of depCard.card) {
  (gruppi[k.id + ' ' + k.giorno] ||= []).push(k)
  const f = fascia(orarioDel(depCard.orari[k.id], k.giorno)); const da = +k.ora.slice(0, 2) * 60 + +k.ora.slice(3)
  if (!depCard.orari[k.id]) depKo.push(`${k.nome}: deposito «${k.id}» non nel JSON`)
  else if (!f || da < f[0] || da + k.dur > f[1]) depKo.push(`${k.giorno} ${k.ora} ${k.nome} fuori orario (${orarioDel(depCard.orari[k.id], k.giorno) || 'non indicato'})`)
  // se il deposito è prenotato, lasciata e ritiro stanno anche dentro la fascia della prenotazione (domenica 10:30–15:30)
  const pr = depCard.pren[k.id], fp = pr && fascia(pr.fascia)
  if (pr && (!fp || da < fp[0] || da + k.dur > fp[1])) depKo.push(`${k.giorno} ${k.ora} ${k.nome} fuori dalla fascia prenotata ${pr.fascia}`)
}
for (const [g, l] of Object.entries(gruppi)) if (l.length < 2 || !/^Lascia/.test(l[0].nome) || !/^Ritira/.test(l[l.length - 1].nome)) depKo.push(`${g}: manca la lasciata o il ritiro`)
ok('depositi nell\'itinerario: lasciata e ritiro dentro gli orari del deposito per quel giorno e, se prenotato, dentro la fascia prenotata', depCard.card.length > 0 && !depKo.length, `${depCard.card.length} card, ${Object.keys(gruppi).length} depositi` + (depKo.length ? ' · ' + depKo.join('; ') : ''))

// Heathrow (51.4723,-0.4887) è la meta dei soli trasferimenti: nessun «Portami qui» di una card che non è di trasporto
// deve puntarci (il double check del 7/11 lo aveva sospettato sulla card di Camden). I percorsi del piano B dentro una card
// sono percorsi, non «Portami qui», e restano fuori
const heathrow = await p.evaluate(() => [...document.querySelectorAll('#programma article.tcard')].filter((c) => c.dataset.tipo !== 'trasporto').flatMap((c) => [...c.querySelectorAll('a.gmap--vai, a.gmap--btn')].filter((a) => /destination=51\.472\d*,-0\.488\d*/.test(a.getAttribute('href') || '')).map(() => `${c.dataset.giorno} ${c.dataset.ora} ${c.querySelector('h4')?.textContent.trim()}`)))
ok('nessun «Portami qui» verso Heathrow fuori dalle card di trasporto', heathrow.length === 0, heathrow.join(', '))

// popup della mappa: se la nota di un marker comincia con un orario, deve essere il data-ora della card della stessa
// tappa (stesso giorno, stesse coordinate del «Portami qui», entro ~30 m). Le note le scrive a mano chi cambia il
// programma e si dimenticano: così non restano orari vecchi nei popup
await p.evaluate(() => { location.hash = '#mappa' })
await p.waitForFunction(() => window.MAPPA && MAPPA.marcatori().length > 0, null, { timeout: 20000 }).catch(() => {})
const popup = await p.evaluate(() => {
  const G = { dom: '2026-11-15', lun: '2026-11-16', mar: '2026-11-17' }
  const card = [...document.querySelectorAll('#programma article.tcard[data-ora]')].map((c) => { const a = c.querySelector('a.gmap--vai'); const m = a && /destination=(-?[\d.]+),(-?[\d.]+)/.exec(a.getAttribute('href') || ''); return m ? { giorno: c.dataset.giorno, ora: c.dataset.ora, lat: +m[1], lng: +m[2], nome: c.querySelector('h4')?.textContent.trim() } : null }).filter(Boolean)
  return (window.MAPPA ? MAPPA.marcatori() : []).filter((x) => G[x.g] && /^\d{2}:\d{2}/.test(x.nota)).map((x) => {
    const ora = x.nota.slice(0, 5)
    const c = card.filter((k) => k.giorno === G[x.g] && Math.abs(k.lat - x.reale[0]) < 0.0003 && Math.abs(k.lng - x.reale[1]) < 0.0005)
    return { marker: x.n, giorno: x.g, nota: ora, card: c.map((k) => k.ora), ok: c.length > 0 && c.some((k) => k.ora === ora) }
  })
})
const popupKo = popup.filter((x) => !x.ok)
ok('popup della mappa: l\'orario nella nota è il data-ora della card della tappa', popup.length > 0 && popupKo.length === 0, `${popup.length} marker con orario` + (popupKo.length ? ' · sbagliati: ' + popupKo.map((x) => `${x.marker} ${x.nota}≠${x.card.join('/') || 'nessuna card'}`).join(', ') : ''))
await p.evaluate(() => { location.hash = '#programma' }); await p.waitForTimeout(500)
// storage: si usa la pagina come la usa qualcuno (novità, Piove, plus, codici) e poi si guarda cosa resta
await p.evaluate(() => scrollTo(0, 0))
await p.evaluate(() => { document.getElementById('novApri').click(); document.getElementById('novOk').click(); document.getElementById('pioveBtnAd').click(); document.querySelector('.plus-riga').click(); document.getElementById('plusOk').click(); document.getElementById('pkBox').click() })
await p.waitForTimeout(500); await p.keyboard.press('Escape')
const storage = await p.evaluate(async () => ({ piove: localStorage.getItem('londra:piove'), local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage), idb: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [], cookie: document.cookie }))
// Piove si ricorda solo per il giorno: londra:piove = {"data":"AAAA-MM-GG","valore":true}
const pioveOk = !storage.piove || /^\{"data":"\d{4}-\d{2}-\d{2}","valore":true\}$/.test(storage.piove)
ok('storage: solo londra:novita:vista e londra:piove (data del giorno, valore)', storage.local.every((k) => k === 'londra:novita:vista' || k === 'londra:piove') && storage.local.includes('londra:novita:vista') && pioveOk && !storage.session.length && !storage.idb.length && !storage.cookie, JSON.stringify(storage))

// service worker: controlla le pagine di Londra, non quelle di Barcellona
const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope })
const fuori = []
// (/rigori-classic.html e non /rigori.html: quest'ultima reindirizza al gioco 3D, che nel Chromium senza GPU dei container di prova fa cadere il browser)
for (const u of ['/', '/index.html', '/gym/', '/soldi/', '/rigori-classic.html']) {
  const q = await ctx.newPage(); await q.goto(base + u, { waitUntil: 'load' }).catch(() => {})
  const c = await q.evaluate(() => !!navigator.serviceWorker?.controller && navigator.serviceWorker.controller.scriptURL.includes('londra-sw')).catch(() => false)
  if (c) fuori.push(u); await q.close()
}
ok('service worker con scope solo su /londra…, nessuna pagina di Barcellona controllata', /\/londra$/.test(reg) && !fuori.length, `scope ${reg}${fuori.length ? ' · controlla ' + fuori.join(', ') : ''}`)
// ---------- bagni puliti (data/bagni-londra.json) ----------
const bagni = await p.evaluate(async () => { const r = await fetch('data/bagni-londra.json'); return r.ok ? r.json() : null })
const idTappe = bagni ? bagni.tappe.map((t) => t.tappa) : []
const dataBagno = await p.$$eval('#programma article.tcard[data-bagno]', (c) => c.map((x) => x.dataset.bagno))
const orfani = dataBagno.filter((id) => !idTappe.includes(id))
ok('bagni: ogni data-bagno esiste nel JSON', !!bagni && dataBagno.length > 0 && !orfani.length, `${dataBagno.length} card, ${orfani.length} senza tappa${orfani.length ? ': ' + orfani.join(', ') : ''}`)
const incompleti = idTappe.length ? bagni.tappe.filter((t) => !(t.principale && t.principale.id && t.principale.nome && Number.isFinite(t.principale.lat)) || !(t.riserva && t.riserva.id && t.riserva.nome && Number.isFinite(t.riserva.lat))).map((t) => t.tappa) : ['JSON assente']
ok('bagni: ogni tappa del JSON ha principale e riserva', !incompleti.length, `${idTappe.length} tappe${incompleti.length ? ' · incomplete: ' + incompleti.join(', ') : ''}`)
const sw = await p.evaluate(async () => {
  const testo = await (await fetch('londra-sw.js')).text()
  const nelleCache = []; for (const k of await caches.keys()) if (k.startsWith('londra-')) nelleCache.push(!!(await (await caches.open(k)).match('data/bagni-londra.json')))
  return { lista: /"data\/bagni-londra\.json"/.test(testo), cache: nelleCache.some(Boolean) }
})
ok('bagni: il JSON è nel precache del service worker (nella lista e nella cache)', sw.lista && sw.cache, JSON.stringify(sw))
// la riga «🚻» sta accanto a «Portami qui» (fase 6 UX), il pannello sotto in .bagno-box: si cerca per aria-controls
const righe = await p.$$eval('#programma article.tcard[data-bagno]', (c) => c.filter((x) => x.querySelector('.bagno-riga[aria-controls^="bagno-"]')).length)
ok('bagni: ogni card con data-bagno ha la sua riga «🚻»', righe === dataBagno.length, `${righe}/${dataBagno.length}`)
// «i 18 URL Maps esistenti non sono stati toccati»: è il controllo dei percorsi qui sopra, e i bagni non ne aggiungono
// (i loro link Maps sono ricerche per coordinate dentro i pannelli, non «a.percorso»)
await p.evaluate(() => { document.querySelectorAll('details').forEach((d) => (d.open = true)); document.querySelectorAll('.bagno-riga').forEach((r) => { if (document.getElementById(r.getAttribute('aria-controls')).hidden) r.click() }) })
const bassi = await p.$$eval('.bagno-riga, .bagno-maps', (e) => e.filter((x) => x.offsetParent).map((x) => x.getBoundingClientRect().height).filter((h) => h < 44).length)
ok('bagni: righe e link Maps dei pannelli alti almeno 44 px', bassi === 0, `${bassi} sotto 44`)
// ---------- depositi bagagli (data/depositi-londra.json): stesso schema dei bagni ----------
const dep = await p.evaluate(async () => { const r = await fetch('data/depositi-londra.json'); return r.ok ? r.json() : null })
const idDep = dep ? dep.depositi.map((d) => d.id) : []
const scelte = await p.evaluate(() => window.DEPOSITI ? DEPOSITI.scelte : null)
const dataDep = await p.$$eval('#programma article.tcard[data-deposito]', (c) => c.map((x) => x.dataset.deposito))
const depOrfani = dataDep.filter((t) => !scelte || !scelte[t] || scelte[t].length < 2 || scelte[t].some((id) => !idDep.includes(id)))
ok('depositi: data-deposito sulle 4 card, ogni tappa con principale e riserva che esistono nel JSON', !!dep && dataDep.sort().join() === 'camden,casa,coventgarden,sealife' && !depOrfani.length, `${dataDep.join(', ')}${depOrfani.length ? ' · senza scelta: ' + depOrfani.join(', ') : ''}`)
const depSw = await p.evaluate(async () => {
  const testo = await (await fetch('londra-sw.js')).text()
  const c = []; for (const k of await caches.keys()) if (k.startsWith('londra-')) c.push(!!(await (await caches.open(k)).match('data/depositi-londra.json')))
  return { lista: /"data\/depositi-londra\.json"/.test(testo), cache: c.some(Boolean) }
})
ok('depositi: il JSON è nel precache del service worker (nella lista e nella cache)', depSw.lista && depSw.cache, JSON.stringify(depSw))
const depRighe = await p.$$eval('#programma article.tcard[data-deposito]', (c) => c.filter((x) => /^🧳/.test(x.querySelector('.deposito-box .bagno-riga')?.textContent || '')).length)
ok('depositi: ogni card con data-deposito ha la sua riga «🧳»', depRighe === dataDep.length && depRighe === 4, `${depRighe}/${dataDep.length}`)
const depBassi = await p.$$eval('.deposito-box .bagno-riga, .deposito-box .bagno-maps, #depositiLista .bagno-maps', (e) => e.filter((x) => x.offsetParent).map((x) => x.getBoundingClientRect().height).filter((h) => h < 44).length)
ok('depositi: righe, Maps e Prenota alti almeno 44 px', depBassi === 0, `${depBassi} sotto 44`)

await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300)
const largo = await p.evaluate(() => ({ larghezza: innerWidth, scroll: document.documentElement.scrollWidth }))
ok('bagni: a 375 px, con tutto aperto, la pagina non scorre di lato', largo.scroll <= largo.larghezza, JSON.stringify(largo))
await p.setViewportSize({ width: 390, height: 844 })
ok('nessun errore JavaScript', !errori.length, errori.join(' | '))
await b.close()
