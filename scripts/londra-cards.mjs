// Card stilizzate per le tappe di Londra che su Commons non hanno una foto libera (alloggio, negozi,
// attività private): mosaico seedato, vignettatura e icona in stile Lucide, nella palette
// "London Winter Night" del sito. Grafica originale del progetto, nessuna attribuzione dovuta.
//
//   node scripts/londra-cards.mjs        (npm run cards:londra)
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

const OUT = 'public/assets/tappe/londra'
const W = 800, H = 450, CELLA = 50
// London Winter Night: oro delle luci, rosso del bus, azzurro notte, oro chiaro, blu profondo
const PALETTE = ['#d4a94e', '#c8362b', '#6db3d8', '#e8c87e', '#1f3a5f']

// Icone in stile Lucide, su viewBox 24×24
const ICONE = {
  home: '<path d="M3 11 12 3l9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  plane: '<path d="M10.5 2.5a1.5 1.5 0 0 1 3 0V9l8 4.5v2.5l-8-2.5v4l2.5 2v2L12 20.5 8.5 21.5v-2l2.5-2v-4L3 16v-2.5L10.5 9Z"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14"/><circle cx="9" cy="13.5" r=".9" fill="currentColor"/><circle cx="15" cy="13.5" r=".9" fill="currentColor"/><path d="M8 16 6 21M16 16l2 5M7.5 19h9"/>'
}

export const CARD = [
  { id: 'apt', label: '79 Beak Street · Soho', accento: '#d4a94e', icona: 'home' },
]

// PRNG con seme: stesso seme, stesso mosaico. Un seme diverso per card.
function rng(seed) {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n2 = (x) => Number(x.toFixed(2))

export function svg({ label, accento, icona }, seme) {
  const r = rng(seme)
  const fra = (a, b) => a + r() * (b - a)
  // l'accento entra due volte nell'urna: domina leggermente sugli altri colori
  const urna = [...PALETTE, accento, accento]
  const tessere = []
  for (let gx = -1; gx <= 16; gx++) {
    for (let gy = -1; gy <= 9; gy++) {
      if (r() > 0.58) continue
      const x = gx * CELLA + fra(-8, 8), y = gy * CELLA + fra(-8, 8)
      const w = CELLA * fra(0.55, 0.95), h = CELLA * fra(0.55, 0.95)
      const col = urna[Math.floor(r() * urna.length)]
      const op = fra(0.18, 0.55), rot = fra(-8, 8)
      tessere.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="5" fill="${col}" opacity="${n2(op)}" transform="rotate(${n2(rot)} ${n2(x + w / 2)} ${n2(y + h / 2)})"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a2332"/><stop offset="1" stop-color="#0d1321"/>
    </linearGradient>
    <radialGradient id="vignetta" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fondo)"/>
  <g>${tessere.join('')}</g>
  <rect width="${W}" height="${H}" fill="url(#vignetta)"/>
  <g transform="translate(400 185) scale(4.6) translate(-12 -12)" fill="none" color="${accento}" stroke="${accento}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONE[icona]}</g>
  <text x="400" y="330" font-size="34" text-anchor="middle" fill="#f5f0e8" font-family="system-ui,-apple-system,sans-serif" font-weight="700">${esc(label)}</text>
</svg>
`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true })
  let totale = 0
  CARD.forEach((c, i) => {
    const dest = path.join(OUT, `${c.id}.svg`)
    writeFileSync(dest, svg(c, i * 37 + 11))
    const kb = statSync(dest).size / 1024
    totale += kb
    console.log(`✓ ${c.id}.svg · ${c.icona} · ${c.accento} · ${kb.toFixed(1)} kB`)
  })
  console.log(`\n${CARD.length} card stilizzate, ${totale.toFixed(0)} kB in tutto`)
}
