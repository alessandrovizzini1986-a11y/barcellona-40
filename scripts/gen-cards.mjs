// Card stilizzate per i luoghi che su Commons non hanno una foto libera: mosaico trencadís seedato,
// vignettatura e icona in stile Lucide. Grafica originale del progetto, nessuna attribuzione dovuta.
//
//   node scripts/gen-cards.mjs        (npm run cards)
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

const OUT = 'public/assets/tappe'
const W = 800, H = 450, CELLA = 50
const PALETTE = ['#E8552E', '#2CA6A4', '#F2B705', '#3D5A80', '#A50044']

// Icone in stile Lucide, su viewBox 24×24
const ICONE = {
  car: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 17v-5l2-5h14l2 5v5"/><path d="M6 12h12"/>',
  duck: '<path d="M14 6a3 3 0 1 1 6 0c0 1-.5 2-1.5 2.5L22 10h-3c0 4-3 7-7 7H6a4 4 0 0 1-4-4c0-2 1-3 3-3h4"/><circle cx="16.5" cy="5.5" r=".6" fill="currentColor"/>',
  fork: '<path d="M7 3v8a3 3 0 0 0 6 0V3M10 11v10M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7ZM17 10v11"/>',
  home: '<path d="M3 11 12 3l9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  bottle: '<path d="M10 2h4v4l2 3v13H8V9l2-3V2Z"/><path d="M8 13h8"/>',
  flame: '<path d="M12 2c2 4-1 5 0 8 2-1 3-3 3-5 2 2 3 5 3 8a6 6 0 0 1-12 0c0-3 2-6 6-11Z"/>',
  glass: '<path d="M6 3h12l-5 8v8h3M8 19h3v-8L6 3"/>',
  cake: '<path d="M4 21h16v-8H4v8Z"/><path d="M4 13a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4"/><path d="M12 9V5M9 9V7M15 9V7"/>',
  shower: '<path d="M5 20V7a3 3 0 0 1 6 0M8 7h11l-3 4H8"/><path d="M11 15v2M14 14v2M17 15v2"/>',
  chips: '<path d="M3 18a4 2.2 0 0 0 8 0M3 18a4 2.2 0 0 1 8 0v3a4 2.2 0 0 1-8 0Z"/><path d="M3 14.5a4 2.2 0 0 0 8 0M3 14.5a4 2.2 0 0 1 8 0"/><path d="M14 4h6a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M17 8.5 18.5 11h-3L17 8.5Z"/>'
}

export const CARD = [
  { id: 'parcheggio', label: 'P2 · Bologna', accento: '#3D5A80', icona: 'car' },
  { id: 'duckstore', label: 'Barcelona Duck Store', accento: '#F2B705', icona: 'duck' },
  { id: 'barjoan', label: 'Bar Joan', accento: '#E8552E', icona: 'fork' },
  { id: 'apt', label: 'Nàpols 116', accento: '#2CA6A4', icona: 'home' },
  { id: 'taps', label: 'Enoteca Taps', accento: '#A50044', icona: 'bottle' },
  { id: 'braseria', label: 'Braseria Sarrià', accento: '#E8552E', icona: 'flame' },
  { id: 'olimpo', label: 'Vermutería Olimpo', accento: '#F2B705', icona: 'glass' },
  { id: 'biarritz', label: 'Bodega Biarritz 1881', accento: '#E8552E', icona: 'cake' },
  { id: 'canudas', label: 'Sala VIP Canudas', accento: '#3D5A80', icona: 'shower' },
  // Il seme è dato, non calcolato dalla posizione: questa card è arrivata dopo le altre e
  // il mosaico non deve cambiare se un giorno se ne aggiunge un'altra in mezzo.
  { id: 'casino', label: 'Casino Barcelona', accento: '#A50044', icona: 'chips', seme: 1337 }
]

// PRNG con seme: stesso seme, stesso mosaico. Un seme diverso per card.
function rng(seed) {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n2 = (x) => Number(x.toFixed(2))

function svg({ id, label, accento, icona }, seme) {
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
      <stop offset="0" stop-color="#1C232C"/><stop offset="1" stop-color="#0E1116"/>
    </linearGradient>
    <radialGradient id="vignetta" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fondo)"/>
  <g>${tessere.join('')}</g>
  <rect width="${W}" height="${H}" fill="url(#vignetta)"/>
  <g transform="translate(400 185) scale(4.6) translate(-12 -12)" fill="none" color="${accento}" stroke="${accento}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONE[icona]}</g>
  <text x="400" y="330" font-size="34" text-anchor="middle" fill="#F2E9DE" font-family="system-ui,-apple-system,sans-serif" font-weight="700">${esc(label)}</text>
</svg>
`
}

mkdirSync(OUT, { recursive: true })
let totale = 0
CARD.forEach((c, i) => {
  const dest = path.join(OUT, `${c.id}.svg`)
  writeFileSync(dest, svg(c, c.seme ?? i * 31 + 7))
  const kb = statSync(dest).size / 1024
  totale += kb
  console.log(`✓ ${c.id}.svg · ${c.icona} · ${c.accento} · ${kb.toFixed(1)} kB`)
})
console.log(`\n${CARD.length} card stilizzate, ${totale.toFixed(0)} kB in tutto`)
