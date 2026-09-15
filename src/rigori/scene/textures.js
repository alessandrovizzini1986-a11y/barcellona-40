import * as THREE from 'three'
// Texture procedurali (canvas): niente file esterni, niente marchi.
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
export function grassTexture() {
  const c = canvas(512, 512), g = c.getContext('2d')
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2e8b45' : '#33994c'; g.fillRect(0, i * 64, 512, 64) }
  const img = g.getImageData(0, 0, 512, 512), d = img.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n * .6 }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 9); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
// Normal map leggera per il rilievo dell'erba: rumore a bassa frequenza + fili sottili
export function grassNormalTexture() {
  const S = 256, c = canvas(S, S), g = c.getContext('2d')
  const h = new Float32Array(S * S)
  for (let i = 0; i < h.length; i++) h[i] = Math.random()
  // sfocatura in due passate per ammorbidire il rumore
  const blur = (src) => { const out = new Float32Array(src.length); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[((y + dy + S) % S) * S + (x + dx + S) % S]; out[y * S + x] = s / 9 } return out }
  const hb = blur(blur(h))
  const img = g.createImageData(S, S), d = img.data
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const l = hb[y * S + (x - 1 + S) % S], r = hb[y * S + (x + 1) % S], u = hb[((y - 1 + S) % S) * S + x], dn = hb[((y + 1) % S) * S + x]
    const nx = (l - r) * 2.5, ny = (u - dn) * 2.5
    const i = (y * S + x) * 4; d[i] = 128 + nx * 127; d[i + 1] = 128 + ny * 127; d[i + 2] = 255; d[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 50)
  return t
}
// Rete: griglia sottile e nitida (maglie da ~10 cm), da usare con opacità 0,6 e anisotropia alta
export function netTexture() {
  const c = canvas(64, 64), g = c.getContext('2d')
  g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(250,250,250,1)'; g.lineWidth = 1.5
  g.beginPath(); g.moveTo(0.75, 0); g.lineTo(0.75, 64); g.moveTo(0, 0.75); g.lineTo(64, 0.75); g.stroke()
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}
// Ombra di contatto: disco sfumato radiale (nero → trasparente)
export function blobShadowTexture() {
  const c = canvas(128, 128), g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 8, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(0.55, 'rgba(0,0,0,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
// Maglia del corpo (capsula): 512×512, u gira attorno al busto. Davanti al centro (u≈0,25), dietro a u≈0,75.
// Strisce verticali che avvolgono il corpo, numero sul retro. Nessuno stemma, nessuno sponsor.
export function bodyTexture(maglia, numero) {
  const S = 512, c = canvas(S, S), g = c.getContext('2d')
  if (maglia.tipo === 'strisce') {
    const [a, b] = maglia.colori; const n = 14, w = S / n
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * w, 0, w + 1, S) }
  } else { g.fillStyle = maglia.colore; g.fillRect(0, 0, S, S) }
  // colletto scuro in alto
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, S, 22)
  // numero sul retro (u 0,75 → x = 384), a metà altezza (la parte alta della capsula è coperta dalla testa)
  g.fillStyle = maglia.numeroColore || '#F2E9DE'
  g.font = '900 150px "Clash Display", Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 8; g.strokeText(String(numero), 384, 250); g.fillText(String(numero), 384, 250)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4
  return t
}
// Testa: equirettangolare 1024×512. Colore pelle ovunque, la foto solo sull'emisfero frontale (u 0..0,5, centro 0,25)
// con maschera ellittica morbida. Ritorna la texture e una funzione per disegnare la foto quando arriva.
export function headTexture(skin = '#C8956D') {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d')
  g.fillStyle = skin; g.fillRect(0, 0, W, H)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4
  const draw = (img) => {
    // area della foto: larghezza 0,34 di u (≈122° di longitudine), altezza 0,62 di v; centrata sul davanti
    const w = W * 0.42, h = H * 0.72, cx = W * 0.25, cy = H * 0.50
    const m = canvas(Math.round(w), Math.round(h)), mg = m.getContext('2d')
    mg.drawImage(img, 0, 0, m.width, m.height)
    // foto scure (selfie notturni del legacy): alzo la luminosità media fino a ~0,45 così la testa non diventa una palla nera
    try {
      const px = mg.getImageData(0, 0, m.width, m.height).data; let lum = 0, n = 0
      for (let i = 0; i < px.length; i += 16) { if (px[i + 3] < 128) continue; lum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; n++ }
      lum = n ? lum / n : 0.5
      if (lum < 0.45) { mg.filter = `brightness(${Math.min(2.0, 0.5 / lum).toFixed(2)}) contrast(1.05)`; mg.drawImage(m, 0, 0); mg.filter = 'none' }
    } catch { /* canvas contaminato o filter non supportato: si tiene la foto com'è */ }
    // maschera ellittica con bordo morbido: fuori dall'ellisse resta la pelle
    mg.globalCompositeOperation = 'destination-in'
    const rg = mg.createRadialGradient(m.width / 2, m.height / 2, 0, m.width / 2, m.height / 2, 1)
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.6, 'rgba(0,0,0,1)'); rg.addColorStop(0.9, 'rgba(0,0,0,0)')
    mg.save(); mg.translate(m.width / 2, m.height / 2); mg.scale(m.width / 2, m.height / 2); mg.translate(-m.width / 2, -m.height / 2)
    mg.fillStyle = rg; mg.fillRect(0, 0, m.width, m.height); mg.restore()
    g.fillStyle = skin; g.fillRect(0, 0, W, H)
    g.drawImage(m, cx - w / 2, cy - h / 2)
    t.needsUpdate = true
  }
  return { texture: t, draw }
}
// Alone luminoso: disco bianco sfumato (per gli sprite additivi dei fari)
export function glowTexture() {
  const c = canvas(128, 128), g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,245,215,1)'); r.addColorStop(0.25, 'rgba(255,240,200,.55)'); r.addColorStop(0.6, 'rgba(255,235,190,.12)'); r.addColorStop(1, 'rgba(255,235,190,0)')
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
