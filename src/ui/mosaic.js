// Motivo "trencadís": tessere irregolari (5 colori accento, opacità .12) come data-URI SVG.
// Seed per giorno: lo stesso giorno produce sempre lo stesso mosaico.
const COLORS = ['#E8552E', '#2CA6A4', '#F2B705', '#3D5A80', '#F2E9DE']

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}

export function mosaicDataUri(seed = 40, tiles = 40, size = 420) {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < tiles; i++) {
    const x = (r() * size).toFixed(0), y = (r() * size).toFixed(0)
    const w = 24 + r() * 70, h = 20 + r() * 56, rot = ((r() - .5) * 40).toFixed(0)
    const pts = [[0, 0], [w, r() * 8], [w - r() * 10, h], [r() * 8, h - r() * 8]].map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')
    const c = COLORS[Math.floor(r() * COLORS.length)]
    out += `<polygon points="${pts}" fill="${c}" fill-opacity=".12" transform="translate(${x} ${y}) rotate(${rot})"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${out}</svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
}

// Seed derivato dalla data (YYYY-MM-DD)
export function seedForDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function applyMosaic(date) {
  document.documentElement.style.setProperty('--mosaic', mosaicDataUri(seedForDate(date)))
}
