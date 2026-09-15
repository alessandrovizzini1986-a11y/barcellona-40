import * as THREE from 'three'
// Texture procedurali (canvas): niente file esterni, niente marchi.
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
export function grassTexture() {
  const c = canvas(512, 512), g = c.getContext('2d')
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f7d3a' : '#347f3c'; g.fillRect(0, i * 64, 512, 64) }
  const img = g.getImageData(0, 0, 512, 512), d = img.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n * .6 }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 9); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
export function netTexture() {
  const c = canvas(128, 128), g = c.getContext('2d')
  g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(245,245,245,.9)'; g.lineWidth = 2
  for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
  return t
}
export function seatsTexture() {
  const c = canvas(256, 64), g = c.getContext('2d')
  const cols = ['#A50044', '#004D98', '#A50044', '#004D98']
  for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(i * 64, 0, 64, 64) }
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < 256; x += 8) g.fillRect(x, 0, 2, 64)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
  return t
}
// Maglia: tinta unita o strisce verticali, numero sul retro. Nessuno stemma, nessuno sponsor.
export function jerseyTexture(maglia, numero, numeroColore) {
  const c = canvas(256, 256), g = c.getContext('2d')
  if (maglia.tipo === 'strisce') {
    const [a, b] = maglia.colori; const w = 256 / 8
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * w, 0, w, 256) }
  } else { g.fillStyle = maglia.colore; g.fillRect(0, 0, 256, 256) }
  g.fillStyle = numeroColore || maglia.numeroColore || '#F2E9DE'
  g.font = '900 120px "Clash Display", Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(String(numero), 128, 132)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
