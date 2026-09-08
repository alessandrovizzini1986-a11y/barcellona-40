// Confetti caricati lazy (canvas-confetti) e disattivati con prefers-reduced-motion
let mod = null
async function load() {
  if (mod) return mod
  const m = await import('canvas-confetti')
  mod = m.default || m
  return mod
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const COLORS = ['#E8552E', '#2CA6A4', '#F2B705', '#3D5A80', '#F2E9DE']

export async function burst(opts = {}) {
  if (reduced()) return
  try {
    const c = await load()
    c({ particleCount: 90, spread: 70, startVelocity: 38, origin: { y: .75 }, colors: COLORS, ticks: 160, disableForReducedMotion: true, ...opts })
  } catch { /* nessun confetti: non è mai bloccante */ }
}
export async function short() { return burst({ particleCount: 50, spread: 55, ticks: 110 }) }
export async function big() {
  if (reduced()) return
  await burst({ particleCount: 140, spread: 100, origin: { y: .6 } })
  setTimeout(() => burst({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: .7 } }), 220)
  setTimeout(() => burst({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: .7 } }), 220)
}
