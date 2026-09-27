import * as THREE from 'three'
// Swipe dal pallone (Pointer Events): direzione = angolo del gesto, potenza = lunghezza × velocità,
// curva = deviazione del tracciato dalla retta. Campiona i punti e li espone a chi disegna la traiettoria fantasma.
// Presa: tutta la metà bassa dello schermo, sia da tiratore che da portiere. Il raggio di 70 px attorno al
// pallone faceva fallire il primo swipe a chi partiva col pollice appena fuori. Lunghezza minima 40 px.
export function createInput(el, { camera, getBallWorld, size, enabled = () => true }) {
  const listeners = { start: [], move: [], end: [], reject: [] }
  const on = (ev, fn) => { listeners[ev].push(fn); return () => { listeners[ev] = listeners[ev].filter((f) => f !== fn) } }
  const emit = (ev, d) => listeners[ev].forEach((f) => f(d))
  let active = null, mode = 'shooter' // 'shooter' | 'keeper'
  const v = new THREE.Vector3()
  const ballOnScreen = () => { v.copy(getBallWorld()); v.project(camera); return { x: (v.x + 1) / 2 * size.w, y: (1 - v.y) / 2 * size.h } }
  const analyze = (pts) => {
    const a = pts[0], b = pts[pts.length - 1]
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy)
    const dur = Math.max(1, b.t - a.t) / 1000
    // deviazione massima con segno dalla retta a→b, normalizzata sulla lunghezza
    let dev = 0
    for (const p of pts) { const d = ((p.x - a.x) * dy - (p.y - a.y) * dx) / (len || 1); if (Math.abs(d) > Math.abs(dev)) dev = d }
    const curve = Math.max(-1, Math.min(1, (dev / (len || 1)) * 3.2))
    const speed = len / dur // px/s
    return { dx, dy, len, dur, speed, curve, ok: len >= 40 }
  }
  const down = (e) => {
    if (!enabled() || active) return
    if (e.clientY < size.h * 0.45) { if (mode === 'shooter') emit('reject', { x: e.clientX, y: e.clientY, ball: ballOnScreen() }); return } // metà bassa dello schermo, per tutti e due i ruoli
    active = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] }
    el.setPointerCapture?.(e.pointerId); e.preventDefault()
    emit('start', { x: e.clientX, y: e.clientY })
  }
  const move = (e) => {
    if (!active || e.pointerId !== active.id) return
    active.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp }); if (active.pts.length > 64) active.pts.splice(1, 1)
    emit('move', analyze(active.pts))
  }
  const up = (e) => {
    if (!active || e.pointerId !== active.id) return
    active.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp })
    const r = analyze(active.pts); active = null
    emit('end', r)
  }
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  return { on, ballOnScreen, get active() { return !!active }, setMode(m) { mode = m }, get mode() { return mode }, dispose() { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) } }
}
