// Foto delle tappe di Londra da Wikimedia Commons: scarica, ritaglia 16:9, 800×450, WebP q80,
// aggiorna i crediti. Stesso metodo di scripts/fetch-photos.mjs (Barcellona), cartella separata.
//
// Le foto di Google Places NON si possono usare: l'attribuzione è per singolo autore e non sono
// ripubblicabili. Qui solo CC0 / CC BY / CC BY-SA / pubblico dominio, verificate leggendo `extmetadata`
// PRIMA di salvare: se la licenza non torna, la foto si scarta e al suo posto va la card stilizzata
// di scripts/londra-cards.mjs.
//
// I titoli sono stati scelti guardando i provini uno per uno, non dal nome del file: la ricerca su
// Commons restituisce spesso dettagli irriconoscibili (il mozzo del London Eye, il quadrante di Big Ben)
// o omonimi sbagliati (il Clock Tower di Città del Capo, il Harrods Depository di Barnes).
//
//   node scripts/londra-foto.mjs        (npm run foto:londra)
import { writeFileSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'londra-site/1.0'
const OUT = 'public/assets/tappe/londra'
const W = 800, H = 450

// Titoli esatti su Commons: non vanno modificati, sono l'indirizzo del file.
export const FILE = {
  blq: 'File:Bologna Guglielmo Marconi Airport Terminal.jpg',
  ba: 'File:Airbus A319-131 G-EUPL British Airways (6990563152).jpg',
  lhr: 'File:Terminal 5 at London Heathrow Airport, 2008.jpg',
  bakerloo: 'File:Edgware Road-Bakerloo Line-Northbound.jpg',
  southbank: 'File:Yellow steps at the Southbank Centre, London - geograph.org.uk - 7261180.jpg',
  sealife: 'File:Underwater Walk of Sea Life London Aquarium.jpg',
  eye: 'File:London Eye by Day.jpg',
  lina: 'File:Lina Stores, Soho, W1.jpg',
  soho: 'File:Dean Street - Old Compton Street corner.JPG',
  trafalgar: 'File:Trafalgar Square, London 2 - Jun 2009.jpg',
  horseguards: 'File:London , Westminster - Horse Guards Parade - geograph.org.uk - 2546769.jpg',
  bigben: 'File:Palace of Westminster and Elizabeth Tower 20250522.jpg',
  stjames: "File:St James's Park Lake – East from the Blue Bridge - 2012-10-06.jpg",
  buckingham: 'File:Buckingham Palace from gardens, London, UK - Diliff.jpg',
  greenpark: 'File:View from Green Park towards Victoria Memorial.jpg',
  harrods: 'File:Harrods Knightsbridge exterior Christmas decorations in November 2022.jpg',
  nhm: 'File:Natural History Museum London Jan 2006.jpg',
  covent: 'File:London, Covent Garden -- 2016 -- 4878.jpg',
  lhr_dep: 'File:Departures Terminal 5, London Heathrow Airport (33215594911).jpg',
  blq_arr: 'File:Bologna Guglielmo Marconi Airport aerial.jpg',
  carnaby: 'File:Carnaby Street Christmas Lights 2019 - geograph.org.uk - 6329567.jpg',
  regent: 'File:Regent Street Christmas Lights 2016 - geograph.org.uk - 5233956.jpg',
  nhm_balena: 'File:Hintze Hall, Natural History Museum, London - 4.jpg'
}
// Quanto spazio verticale lasciare SOPRA il ritaglio: 0,5 = centrato. Più basso = si tiene l'alto,
// altrimenti torri, insegne e luminarie appese finiscono tagliate.
const BIAS = {
  eye: 0.15, lina: 0.1, nhm: 0.15, regent: 0.2, sealife: 0.3, trafalgar: 0.25, buckingham: 0.25,
  soho: 0.3, covent: 0.3, southbank: 0.35, horseguards: 0.4, nhm_balena: 0.25, bakerloo: 0.45, ba: 0.45
}
// Nome umano della tappa, per i crediti
export const TITOLI = {
  blq: 'Aeroporto di Bologna', ba: 'Volo British Airways', lhr: 'Arrivo a Heathrow',
  bakerloo: 'Linea Bakerloo', southbank: 'Southbank Centre', sealife: 'SEA LIFE London Aquarium',
  eye: 'London Eye', lina: 'Lina Stores', soho: 'Soho', trafalgar: 'Trafalgar Square',
  horseguards: 'Horse Guards Parade', bigben: 'Big Ben e Parlamento', stjames: "St James's Park",
  buckingham: 'Buckingham Palace', greenpark: 'Green Park', harrods: 'Harrods',
  nhm: 'Natural History Museum', covent: 'Covent Garden', lhr_dep: 'Partenza da Heathrow',
  blq_arr: 'Atterraggio a Bologna', carnaby: 'Luci di Carnaby Street', regent: 'Luci di Regent Street',
  nhm_balena: 'Hintze Hall (per Olly)'
}
const LIBERA = [/^cc0/i, /^cc[- ]by(-sa)?([- ]\d)?/i, /^public domain/i, /^pd/i]
const testo = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const attesa = (ms) => new Promise((r) => setTimeout(r, ms))

// Commons risponde 429 se lo si martella: una richiesta alla volta, con pausa e ritentativi crescenti.
async function chiedi(url) {
  let ultimo = null
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (r.ok) return r
    ultimo = r.status
    if (r.status !== 429 && r.status < 500) break
    await attesa(2000 * 2 ** i)
  }
  throw new Error(`Commons HTTP ${ultimo}`)
}

async function info(titolo) {
  const u = new URL(API)
  u.search = new URLSearchParams({ action: 'query', titles: titolo, prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600', format: 'json' })
  const r = await chiedi(u)
  const p = Object.values((await r.json()).query?.pages || {})[0]
  const i = p?.imageinfo?.[0]
  if (!i) throw new Error('file inesistente su Commons')
  const m = i.extmetadata || {}
  return {
    titolo: p.title, autore: testo(m.Artist?.value) || testo(m.Credit?.value) || null,
    licenza: testo(m.LicenseShortName?.value) || null, licenzaUrl: testo(m.LicenseUrl?.value) || null,
    pagina: i.descriptionurl, thumb: i.thumburl, mime: i.mime
  }
}

// Ritaglio 16:9 massimo dentro l'originale, con il bias verticale richiesto
function ritaglio(w, h, bias = 0.5) {
  const target = W / H
  if (w / h > target) { const cw = Math.round(h * target); return { left: Math.round((w - cw) / 2), top: 0, width: cw, height: h } }
  const ch = Math.round(w / target)
  return { left: 0, top: Math.round((h - ch) * bias), width: w, height: ch }
}

// Tetto della cartella: oltre questo, le foto più pesanti si ricomprimono a q70 finché si rientra.
const BUDGET_KB = 1500

mkdirSync(OUT, { recursive: true })
const crediti = []
const scartate = []
const sorgenti = new Map()
for (const [id, titolo] of Object.entries(FILE)) {
  try {
    const c = await info(titolo)
    if (!LIBERA.some((r) => r.test(c.licenza || ''))) throw new Error(`licenza non ammessa: ${c.licenza}`)
    const r = await chiedi(c.thumb)
    const buf = Buffer.from(await r.arrayBuffer())
    const meta = await sharp(buf).metadata()
    const dest = path.join(OUT, `${id}.webp`)
    await sharp(buf).extract(ritaglio(meta.width, meta.height, BIAS[id] ?? 0.5)).resize(W, H).webp({ quality: 80 }).toFile(dest)
    const kb = Math.round(statSync(dest).size / 1024)
    sorgenti.set(id, { buf, crop: ritaglio(meta.width, meta.height, BIAS[id] ?? 0.5) })
    crediti.push({ id, file: `assets/tappe/londra/${id}.webp`, tappa: TITOLI[id], titolo: c.titolo, autore: c.autore, licenza: c.licenza, licenzaUrl: c.licenzaUrl, pagina: c.pagina, kb })
    console.log(`✓ ${id} · ${c.autore} · ${c.licenza} · ${kb} kB${BIAS[id] ? ` · bias ${BIAS[id]}` : ''}`)
    await attesa(700)
  } catch (e) {
    scartate.push({ id, motivo: e.message })
    console.log(`✗ ${id}: ${e.message} → al suo posto va una card stilizzata`)
    process.exitCode = 1
  }
}

// Seconda passata: se la cartella sfora il tetto, le foto più pesanti tornano giù a q70
let totale = crediti.reduce((n, f) => n + f.kb, 0)
if (totale > BUDGET_KB) {
  console.log(`\n${totale} kB: sopra il tetto di ${BUDGET_KB} kB, ricomprimo le più pesanti a q70`)
  for (const f of [...crediti].sort((a, b) => b.kb - a.kb)) {
    if (totale <= BUDGET_KB) break
    const s = sorgenti.get(f.id)
    if (!s) continue
    const dest = path.join(OUT, `${f.id}.webp`)
    await sharp(s.buf).extract(s.crop).resize(W, H).webp({ quality: 70 }).toFile(dest)
    const kb = Math.round(statSync(dest).size / 1024)
    console.log(`  · ${f.id}: ${f.kb} → ${kb} kB`)
    totale += kb - f.kb
    f.kb = kb
    f.qualita = 70
  }
  console.log(`  totale ora ${totale} kB`)
}

writeFileSync('data/foto-tappe-londra.json', JSON.stringify({ fonte: 'Wikimedia Commons', foto: crediti, scartate }, null, 2) + '\n')

// Crediti: si riscrive solo il blocco fra i marcatori, il resto del file resta com'è
const righe = crediti.map((f) => `| ${f.tappa} | \`public/${f.file}\` | ${f.autore} | [${f.licenza}](${f.licenzaUrl}) | [${f.titolo.replace('File:', '')}](${f.pagina}) |`)
const totKb = crediti.reduce((n, f) => n + f.kb, 0)
const blocco = ['<!-- foto-londra:start -->', '', '| Tappa | File nel sito | Autore | Licenza | Originale su Commons |', '|---|---|---|---|---|', ...righe, '', `Ultimo aggiornamento: \`npm run foto:londra\` · ${crediti.length} foto, ${totKb} kB in tutto.`, '', '<!-- foto-londra:end -->'].join('\n')
const cred = readFileSync('CREDITS.md', 'utf8')
const i0 = cred.indexOf('<!-- foto-londra:start -->'), i1 = cred.indexOf('<!-- foto-londra:end -->')
if (i0 < 0 || i1 < 0) console.log('! CREDITS.md: marcatori <!-- foto-londra:start --> / <!-- foto-londra:end --> non trovati, tabella non aggiornata')
else writeFileSync('CREDITS.md', cred.slice(0, i0) + blocco + cred.slice(i1 + '<!-- foto-londra:end -->'.length))
console.log(`\n${crediti.length} foto scaricate, ${scartate.length} scartate, ${totKb} kB in tutto`)
