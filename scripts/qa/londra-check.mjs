// Controllo automatico della pagina di Londra: le cose che non devono rompersi mai.
// Gira sulla build (dist/) servita da `npm run preview`, come le altre suite di scripts/qa.
//
//   npm run build && npm run preview &   poi   node scripts/qa/londra-check.mjs [http://localhost:4173]
//
// Controlla: gli 11 percorsi identici al riferimento, il payload del QR e i 3 barcode (decodificati
// dagli SVG, non letti dal testo), le voci «da verificare» uguali fra pagina e DA_VERIFICARE_LONDRA.md,
// nessuna chiave di storage oltre londra:novita:vista, cartella foto sotto 1,5 MB, alt su tutte le
// immagini, nessun controllo sotto 44 px, service worker che non copre le pagine di Barcellona.
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const base = (process.argv[2] || 'http://localhost:4173').replace(/\/$/, '')
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'
const PAGINA = base + '/londra.html'
const ok = (n, c, x = '') => { if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x !== '' ? ' · ' + x : ''}`) }

// Riferimenti scritti a mano: se qualcuno li "ripulisce" nella pagina, il controllo cade.
const PERCORSI = [
  'https://www.google.com/maps/dir/?api=1&origin=51.4723,-0.4887&destination=51.5054668,-0.1171985&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5054668,-0.1171985&destination=51.5031864,-0.1195192&waypoints=51.501558,-0.119506&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5031864,-0.1195192&destination=51.5129114,-0.1364381&waypoints=51.5123401,-0.1342553%7C51.5133,-0.1391&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5129114,-0.1364381&destination=51.5007292,-0.1246254&waypoints=51.508039,-0.128069%7C51.5047752,-0.1272358&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5007292,-0.1246254&destination=51.5039416,-0.1434016&waypoints=51.502967,-0.1339534%7C51.501364,-0.14189&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5039416,-0.1434016&destination=51.4994055,-0.1632344&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.4994055,-0.1632344&destination=51.4967150,-0.1763672&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.4967150,-0.1763672&destination=51.5098,-0.1342&travelmode=transit',
  'https://www.google.com/maps/dir/?api=1&origin=51.5098,-0.1342&destination=51.5129114,-0.1364381&waypoints=51.5131,-0.1400&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5129114,-0.1364381&destination=51.5122737,-0.1234492&travelmode=walking',
  'https://www.google.com/maps/dir/?api=1&origin=51.5122737,-0.1234492&destination=51.4723,-0.4887&travelmode=transit'
]
const QR_PAYLOAD = '$BLQ3039188LGT@'
const BARCODE = ['1001401807011726169', '1001401807011726170', '1001401807011726171']
const LIMITE_FOTO_KB = 1500

// ---------- decodifica QR (versioni 1–3, un blocco) da un path SVG a tratti orizzontali ----------
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
    if (leggi(4) !== 4) continue                                   // solo modalità byte
    const len = leggi(v < 10 ? 8 : 16); if (len < 1 || p + len * 8 > flusso.length) continue
    let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(leggi(8))
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

const percorsi = await p.$$eval('a.percorso', (a) => a.map((x) => x.getAttribute('href')))
const diversi = PERCORSI.filter((u, i) => percorsi[i] !== u).length
ok('11 percorsi identici al riferimento, carattere per carattere', percorsi.length === 11 && diversi === 0, `${percorsi.length} trovati, ${diversi} diversi`)

const qr = await p.evaluate(() => { const s = document.querySelector('#biglietti .pk__svg'); return { vb: s.getAttribute('viewBox'), d: s.querySelector('path[stroke]').getAttribute('d'), sfondo: s.querySelector('path[fill]')?.getAttribute('fill') } })
const lato = +qr.vb.split(/\s+/)[2], quiet = 4, nMod = lato - 2 * quiet
const letti = decodificaQR(moduliDaPath(qr.d, quiet), nMod)
ok('QR del parcheggio: payload esatto, fondo bianco', letti.length === 1 && letti[0] === QR_PAYLOAD && /^#fff/i.test(qr.sfondo), JSON.stringify(letti))

const bc = await p.evaluate(() => [...document.querySelectorAll('#biglietti .tk-svg')].map((s) => ({ d: s.querySelector('path').getAttribute('d'), sfondo: s.querySelector('rect')?.getAttribute('fill'), num: s.closest('.tk-box')?.querySelector('.tk-num')?.textContent.trim() })))
const decod = bc.map((x) => decodificaC128(x.d))
ok('3 barcode del museo: CODE128 decodificati, numero in chiaro uguale, fondo bianco', bc.length === 3 && BARCODE.every((n, i) => decod[i] === n && bc[i].num === n && bc[i].sfondo === '#fff'), decod.join(' · '))

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

// storage: si usa la pagina come la usa qualcuno (novità, Piove, plus, codici) e poi si guarda cosa resta
await p.evaluate(() => scrollTo(0, 0))
await p.evaluate(() => { document.getElementById('novApri').click(); document.getElementById('novOk').click(); document.getElementById('pioveBtnAd').click(); document.querySelector('.plus-riga').click(); document.getElementById('plusOk').click(); document.getElementById('pkBox').click() })
await p.waitForTimeout(500); await p.keyboard.press('Escape')
const storage = await p.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), idb: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [], cookie: document.cookie }))
ok('storage: solo londra:novita:vista', storage.local.join() === 'londra:novita:vista' && !storage.session.length && !storage.idb.length && !storage.cookie, JSON.stringify(storage))

// service worker: controlla le pagine di Londra, non quelle di Barcellona
const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope })
const fuori = []
for (const u of ['/', '/index.html', '/gym/', '/soldi/', '/rigori.html']) {
  const q = await ctx.newPage(); await q.goto(base + u, { waitUntil: 'load' }).catch(() => {})
  const c = await q.evaluate(() => !!navigator.serviceWorker?.controller && navigator.serviceWorker.controller.scriptURL.includes('londra-sw')).catch(() => false)
  if (c) fuori.push(u); await q.close()
}
ok('service worker con scope solo su /londra…, nessuna pagina di Barcellona controllata', /\/londra$/.test(reg) && !fuori.length, `scope ${reg}${fuori.length ? ' · controlla ' + fuori.join(', ') : ''}`)
ok('nessun errore JavaScript', !errori.length, errori.join(' | '))
await b.close()
