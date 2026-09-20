// Foto delle tappe da Wikimedia Commons: scarica, ritaglia 16:9, 800×450, WebP q80, aggiorna i crediti.
// Le foto di Google Places NON si possono usare: l'attribuzione è per singolo autore e non sono
// ripubblicabili. Qui si accettano solo CC0 / CC BY / CC BY-SA / pubblico dominio, verificate leggendo
// `extmetadata` PRIMA di salvare il file: se la licenza non torna, la foto si scarta e al suo posto va la
// card stilizzata (le card disegnate non esistono più: ogni tappa ha la sua foto).
//
//   node scripts/fetch-photos.mjs        (npm run foto)
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'barcelona40-site/1.0'
const OUT = 'public/assets/tappe'
const W = 800, H = 450

// Titoli esatti su Commons: non vanno modificati, sono l'indirizzo del file.
export const FILE = {
  blq: 'File:Bologna Guglielmo Marconi Airport Terminal.jpg',
  bcn_t2: 'File:Terminal 2A Aeropuerto Barcelona-El Prat.jpg',
  ciutadella: 'File:Fountains at Cascada Monumental (32730873275).jpg',
  santamaria: 'File:01 Santa Maria del Mar (Barcelona).jpg',
  montcada: 'File:Placeta de Montcada, Barcelona - panoramio.jpg',
  pontbisbe: 'File:PONT del CARRER del BISBE - panoramio.jpg',
  santfelip: 'File:San Felip Neri Square in Barcelona.jpg',
  santacaterina: 'File:Barcelona - Mercat de Santa Caterina.jpg',
  elpalace: 'File:El Palace Hotel in Barcelona.jpg',
  sagrada: 'File:Sagrada Família 2010.JPG',
  monumental: 'File:La Monumental-Barcelona.jpg',
  pobleespanyol: 'File:004 Poble Espanyol (Barcelona), plaça Major i glorieta.jpg',
  apolo: 'File:Gatibu a la Sala Apolo de Barcelona 20251101 02.jpg',
  sarria: 'File:Carrer Major de Sarrià (Barcelona) 01.jpg',
  bunkers: 'File:Barcelona, View from Bunkers del Carmel.jpg',
  elborn: 'File:Mercat del Born ruïnes - panoramio.jpg'
}
// Quanto spazio verticale lasciare SOPRA il ritaglio: 0,5 = centrato. Più basso = si tiene l'alto,
// altrimenti le torri finiscono tagliate.
const BIAS = { sagrada: 0.1, santamaria: 0.15, monumental: 0.35, elpalace: 0.25, elborn: 0.45 }
// Nome umano della tappa, per i crediti e per l'alt
export const TITOLI = {
  blq: 'Aeroporto di Bologna', bcn_t2: 'Barcellona T2', ciutadella: 'Parc de la Ciutadella',
  santamaria: 'Basílica de Santa Maria del Mar', montcada: 'Carrer de Montcada', pontbisbe: 'Pont del Bisbe',
  santfelip: 'Plaça de Sant Felip Neri', santacaterina: 'Mercat de Santa Caterina',
  elpalace: 'Rooftop Garden · El Palace', sagrada: 'Sagrada Família', monumental: 'Plaza Monumental',
  pobleespanyol: 'La Terrrazza · Poble Espanyol', apolo: 'Sala Apolo', sarria: 'Sarrià',
  bunkers: 'Bunkers del Carmel', elborn: 'El Born Centre de Cultura i Memòria'
}
const LIBERA = [/^cc0/i, /^cc[- ]by(-sa)?([- ]\d)?/i, /^public domain/i, /^pd/i]
// Foto NON di Commons: private, usate con permesso. Non hanno licenza libera, quindi non stanno nella
// tabella dei crediti e sotto la card non compare nessuna riga di attribuzione. Il file non lo scarica
// questo script: sta nel repo e basta. Elencarle qui serve a `npm run validate`, che così sa che quella
// .webp è a posto anche senza crediti da Commons.
const PRIVATE = [
  { id: 'elmirador', file: 'assets/tappe/elmirador.webp', tappa: 'El Mirador', nota: 'Foto di un amico di Alessandro, uso autorizzato. Per gentile concessione.' }
]
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
    pagina: i.descriptionurl, thumb: i.thumburl, w: i.thumbwidth, h: i.thumbheight, mime: i.mime
  }
}

// Ritaglio 16:9 massimo dentro l'originale, con il bias verticale richiesto
function ritaglio(w, h, bias = 0.5) {
  const target = W / H
  if (w / h > target) { const cw = Math.round(h * target); return { left: Math.round((w - cw) / 2), top: 0, width: cw, height: h } }
  const ch = Math.round(w / target)
  return { left: 0, top: Math.round((h - ch) * bias), width: w, height: ch }
}

mkdirSync(OUT, { recursive: true })
const crediti = []
const scartate = []
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
    crediti.push({ id, file: `assets/tappe/${id}.webp`, tappa: TITOLI[id], titolo: c.titolo, autore: c.autore, licenza: c.licenza, licenzaUrl: c.licenzaUrl, pagina: c.pagina, kb })
    console.log(`✓ ${id} · ${c.autore} · ${c.licenza} · ${kb} kB${BIAS[id] ? ` · bias ${BIAS[id]}` : ''}`)
    await attesa(700)
  } catch (e) {
    scartate.push({ id, motivo: e.message })
    console.log(`✗ ${id}: ${e.message} → al suo posto va una card stilizzata`)
    process.exitCode = 1
  }
}

writeFileSync('data/foto-tappe.json', JSON.stringify({ fonte: 'Wikimedia Commons', foto: crediti, private: PRIVATE, scartate }, null, 2) + '\n')

// Crediti: si riscrive solo il blocco fra i marcatori, il resto del file resta com'è
const righe = crediti.map((f) => `| ${f.tappa} | \`public/${f.file}\` | ${f.autore} | [${f.licenza}](${f.licenzaUrl}) | [${f.titolo.replace('File:', '')}](${f.pagina}) |`)
const blocco = ['<!-- foto:start -->', '', '| Tappa | File nel sito | Autore | Licenza | Originale su Commons |', '|---|---|---|---|---|', ...righe, '', `Ultimo aggiornamento: \`npm run foto\` · ${crediti.length} foto, ${Math.round(crediti.reduce((n, f) => n + f.kb, 0))} kB in tutto.`, '', '<!-- foto:end -->'].join('\n')
const cred = readFileSync('CREDITS.md', 'utf8')
const i0 = cred.indexOf('<!-- foto:start -->'), i1 = cred.indexOf('<!-- foto:end -->')
if (i0 < 0 || i1 < 0) console.log('! CREDITS.md: marcatori <!-- foto:start --> / <!-- foto:end --> non trovati, tabella non aggiornata')
else writeFileSync('CREDITS.md', cred.slice(0, i0) + blocco + cred.slice(i1 + '<!-- foto:end -->'.length))
console.log(`\n${crediti.length} foto scaricate, ${scartate.length} scartate`)
