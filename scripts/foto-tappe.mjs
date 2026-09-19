// Foto delle tappe da Wikimedia Commons: cerca, filtra per licenza, scarica a 800 px e converte in WebP.
// Le foto di Google Places NON si possono usare: l'attribuzione è per singolo autore e non sono
// ripubblicabili. Commons sì, purché la licenza sia CC0 / CC BY / CC BY-SA / pubblico dominio e
// l'attribuzione resti visibile sulla card (vedi CREDITS.md).
//
//   node scripts/foto-tappe.mjs --cerca            elenca i candidati e salva le anteprime in /tmp
//   node scripts/foto-tappe.mjs                    scarica le scelte e scrive public/assets/tappe/*.webp
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'

const API = 'https://commons.wikimedia.org/w/api.php'
const OUT = 'public/assets/tappe'
const LARGHEZZA = 800
const LICENZE_OK = [/^cc0/i, /^cc[- ]by(-sa)?([- ]\d)?/i, /^public domain/i, /^pd/i]

// Soggetti. `cerca` è la ricerca di partenza, `scelta` il file scelto dopo aver GUARDATO i candidati:
// orizzontale, di giorno, soggetto intero e riconoscibile, niente interni né dettagli né foto storiche.
// Se la scelta non compare fra i risultati di quella ricerca (capita: Commons indicizza male i nomi di via)
// viene recuperata per titolo esatto, così lo scaricamento resta ripetibile.
export const SOGGETTI = [
  { id: 'ciutadella', cerca: 'Cascada Parc de la Ciutadella', scelta: 'File:Barcelona Parc Ciutadella cascada.jpg' },
  { id: 'santamaria', cerca: 'Basílica de Santa Maria del Mar exterior', scelta: 'File:Basilica de Santa Maria del Mar, 14th century (1) (30393970184).jpg' },
  { id: 'montcada', cerca: 'Carrer de Montcada Barcelona', scelta: 'File:Carrer Montcada- Museu Picasso.jpg' },
  { id: 'pontbisbe', cerca: 'Pont del Bisbe Barcelona', scelta: 'File:Barrio gótico 13.jpg' },
  { id: 'santfelip', cerca: 'Plaça de Sant Felip Neri', scelta: 'File:San Felip Neri Square in Barcelona.jpg' },
  { id: 'santacaterina', cerca: 'Mercat de Santa Caterina roof', scelta: 'File:Market Roof (5832285437) (2).jpg' }
]

const testo = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const licenzaOk = (l) => LICENZE_OK.some((r) => r.test(l))

async function cerca(termine, limite = 12) {
  const u = new URL(API)
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: termine, gsrnamespace: '6', gsrlimit: String(limite),
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: String(LARGHEZZA), format: 'json'
  })
  const r = await fetch(u, { headers: { 'User-Agent': 'barcelona40-site/1.0 (foto tappe)' } })
  if (!r.ok) throw new Error(`Commons HTTP ${r.status}`)
  const pagine = Object.values((await r.json()).query?.pages || {})
  return pagine.map((p) => {
    const i = p.imageinfo?.[0] || {}
    const m = i.extmetadata || {}
    return {
      titolo: p.title,
      autore: testo(m.Artist?.value) || testo(m.Credit?.value) || null,
      licenza: testo(m.LicenseShortName?.value) || null,
      licenzaUrl: testo(m.LicenseUrl?.value) || null,
      pagina: i.descriptionurl,
      thumb: i.thumburl,
      originale: i.url,
      w: i.width, h: i.height, mime: i.mime,
      orizzontale: i.width > i.height
    }
  }).filter((c) => /^image\/(jpeg|png)$/.test(c.mime || '') && c.orizzontale && licenzaOk(c.licenza || ''))
}

async function scarica(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': 'barcelona40-site/1.0 (foto tappe)' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${url}`)
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

const modoCerca = process.argv.includes('--cerca')
mkdirSync(OUT, { recursive: true })
mkdirSync('/tmp/foto-candidati', { recursive: true })
const crediti = []

for (const s of SOGGETTI) {
  const candidati = await cerca(s.cerca)
  if (modoCerca) {
    console.log(`\n## ${s.id} — "${s.cerca}" (${candidati.length} candidati con licenza libera e orizzontali)`)
    for (const [i, c] of candidati.slice(0, 8).entries()) {
      const f = `/tmp/foto-candidati/${s.id}-${i}.jpg`
      try { await scarica(c.thumb, f) } catch { /* si salta */ }
      console.log(`${i}. ${c.titolo} · ${c.w}x${c.h} · ${c.licenza} · ${c.autore || 'autore ignoto'} · ${f}`)
    }
    continue
  }
  if (!s.scelta) { console.log(`— ${s.id}: nessuna scelta, saltata`); continue }
  const c = candidati.find((x) => x.titolo === s.scelta) || (await cercaPerTitolo(s.scelta))
  if (!c) { console.log(`✗ ${s.id}: "${s.scelta}" non trovata`); process.exitCode = 1; continue }
  if (!licenzaOk(c.licenza || '')) { console.log(`✗ ${s.id}: licenza non ammessa (${c.licenza})`); process.exitCode = 1; continue }
  const tmp = `/tmp/foto-candidati/${s.id}-scelta.jpg`
  await scarica(c.thumb, tmp)
  const dest = path.join(OUT, `${s.id}.webp`)
  // 800 px di larghezza (il thumb di Commons è già a 800), WebP q80
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', tmp, '-vf', `scale=${LARGHEZZA}:-2`, '-c:v', 'libwebp', '-quality', '80', dest])
  const kb = Math.round(statSync(dest).size / 1024)
  crediti.push({ id: s.id, file: `assets/tappe/${s.id}.webp`, titolo: c.titolo, autore: c.autore, licenza: c.licenza, licenzaUrl: c.licenzaUrl, pagina: c.pagina, originale: c.originale, kb })
  console.log(`✓ ${s.id}: ${c.titolo} · ${c.licenza} · ${kb} kB`)
}

// Una sola ricerca per titolo esatto, quando la scelta non compare fra i primi risultati
async function cercaPerTitolo(titolo) {
  const u = new URL(API)
  u.search = new URLSearchParams({ action: 'query', titles: titolo, prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: String(LARGHEZZA), format: 'json' })
  const r = await fetch(u, { headers: { 'User-Agent': 'barcelona40-site/1.0 (foto tappe)' } })
  const p = Object.values((await r.json()).query?.pages || {})[0]
  const i = p?.imageinfo?.[0]
  if (!i) return null
  const m = i.extmetadata || {}
  return { titolo: p.title, autore: testo(m.Artist?.value) || testo(m.Credit?.value) || null, licenza: testo(m.LicenseShortName?.value) || null, licenzaUrl: testo(m.LicenseUrl?.value) || null, pagina: i.descriptionurl, thumb: i.thumburl, originale: i.url, w: i.width, h: i.height, mime: i.mime }
}

if (!modoCerca && crediti.length) {
  writeFileSync('data/foto-tappe.json', JSON.stringify({ fonte: 'Wikimedia Commons', foto: crediti }, null, 2) + '\n')
  console.log(`\nScritto data/foto-tappe.json con ${crediti.length} foto`)
}
