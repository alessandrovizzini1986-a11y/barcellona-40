import * as THREE from 'three'
import { GOAL } from '../scene/net.js'
// IA del portiere: 6 zone (alto/basso × sx/centro/dx), lettura del tell, tuffi, difficoltà per modalità.
// Le probabilità sono mie scelte, marcate DA VERIFICARE; il prompt fissa solo: Boss = reattività +40% e tell quasi assenti.
export const ZONES = ['altoSx', 'altoCentro', 'altoDx', 'bassoSx', 'bassoCentro', 'bassoDx']
export const zoneOf = (x, y) => (y > 1.15 ? 0 : 3) + (x < -1.22 ? 0 : x > 1.22 ? 2 : 1)
export const zoneCenter = (z) => ({ x: [-2.4, 0, 2.4][z % 3], y: z < 3 ? 1.75 : 0.6 })
const DIFF = {
  facile:  { pCol: 0.40, tell: 0.15, pRow: 0.55, reach: 0.85, delay: 0.16, speed: 1.0 },
  normale: { pCol: 0.52, tell: 0.20, pRow: 0.62, reach: 0.95, delay: 0.08, speed: 1.0 },   // DA VERIFICARE
  boss:    { pCol: 0.78, tell: 0.06, pRow: 0.78, reach: 1.15, delay: 0.02, speed: 1.4 }    // +40% reattività, tell quasi assente
}
export function createKeeper(char, { difficulty = 'normale', onDive } = {}) {
  const g = char.group
  g.position.set(0, 0, 0.55) // sulla linea, un passo avanti, rivolto verso il dischetto (+z)
  let state = 'idle', plan = null, t = 0, forced = null, diff = DIFF[difficulty] || DIFF.normale
  let playable = false, playerDive = null, passive = false
  const zoneX = (z) => [-1.9, 0, 1.9][z % 3]
  const idle = () => { state = 'idle'; char.play('keeperIdle', { loop: true, fade: 0.3 }) }
  idle()
  // Le clip Mixamo hanno una lunga preparazione: si parte più avanti e più veloci, così l'allungo
  // arriva mentre la palla è ancora in volo (0,55–0,85 s). DA VERIFICARE: offset e velocità a occhio.
  const CLIP_START = { diveL: 0.55, diveR: 0.55, block: 0.35, catch: 0.30, high: 0.50 }
  const dive = (zone, speed = 1) => {
    plan = { ...plan, zone, target: zoneCenter(zone), startX: g.position.x, t: 0, speed }
    const col = zone % 3, row = zone < 3 ? 0 : 1
    const clip = row === 0 && col !== 1 ? 'high' : col === 0 ? 'diveL' : col === 2 ? 'diveR' : row === 0 ? 'block' : 'catch'
    char.play(clip, { fade: 0.06, timeScale: 1.7 * speed, from: CLIP_START[clip] || 0 })
    onDive?.(zone, g.position)
    // le clip "high" non hanno direzione: specchio il modello per il lato sinistro
    char.model.scale.x = (row === 0 && col === 0) ? -1 : 1
    state = 'diving'
  }
  return {
    group: g, ZONES,
    get state() { return state }, get plan() { return plan }, get difficulty() { return difficulty },
    setDifficulty(d) { difficulty = d; diff = DIFF[d] || DIFF.normale },
    force(zone) { forced = zone }, // QA: zona del tuffo forzata (null = IA)
    setPlayable(v) { playable = !!v },
    setPassive(v) { passive = !!v; if (passive) { state = 'passive'; char.play('ready', { loop: true, fade: 0.3 }) } else idle() },
    playerDiveZone() { return playerDive?.zone ?? null },
    // Tuffo comandato dal giocatore (modalità portiere): zona + istante
    playerDive(zone) { playerDive = { zone, at: performance.now() }; if (state !== 'diving') dive(zone, 1) },
    // Chiamata al calcio: il portiere legge il tell e decide dove buttarsi
    prepare({ aim, timingPerfect = false, power = 0.7 }) {
      const real = zoneOf(aim.x, aim.y)
      if (passive) { plan = null; return }
      plan = { ...(plan || {}), real, power, pending: true, delay: diff.delay } // conserva un tuffo già iniziato (portiere giocabile)
      if (playable) return
      let zone
      if (forced != null) zone = forced
      else {
        const pCol = Math.min(0.95, diff.pCol + (timingPerfect ? diff.tell * 0.5 : diff.tell))
        const realCol = real % 3, realRow = real < 3 ? 0 : 1
        const col = Math.random() < pCol ? realCol : [0, 1, 2].filter((c) => c !== realCol)[(Math.random() * 2) | 0]
        const row = Math.random() < diff.pRow ? realRow : 1 - realRow
        zone = row * 3 + col
      }
      plan.zone = zone
    },
    // Chiamata quando la palla arriva sul piano della porta: parata sì/no
    tryStop(ballPos, aim) {
      if (!plan) return null
      const zone = playable ? playerDive?.zone : plan.zone
      if (zone == null || state !== 'diving') return null
      const c = zoneCenter(zone)
      const d = Math.hypot(ballPos.x - c.x, ballPos.y - c.y)
      const corner = zone % 3 !== 1 && zone < 3
      let reach = diff.reach * (corner ? 0.78 : 1) * Math.min(1, (plan.t || 0) / 0.32 + 0.35) // il braccio arriva col tempo
      if (plan.power > 1.0) reach *= 0.85
      if (d > reach) return null
      const catchIt = plan.power < 0.8 && d < reach * 0.5
      char.play(catchIt ? 'catch' : 'block', { fade: 0.05 }); state = 'saved'
      return { catch: catchIt, deflectX: Math.sign(ballPos.x - c.x || 1) * 2.2 }
    },
    react(result) {
      if (passive) return
      if (result === 'goal') { state = 'beaten'; char.play('beaten', { fade: 0.2 }) }
      else if (result === 'miss' || result === 'post' || result === 'crossbar') { if (state === 'diving') state = 'missed' }
      setTimeout(() => { if (passive) return; plan = null; playerDive = null; g.position.x = 0; char.model.scale.x = 1; idle() }, 1800)
    },
    reset() { plan = null; playerDive = null; g.position.x = 0; char.model.scale.x = 1; if (!passive) idle() },
    update(dt) {
      char.update(dt)
      if (plan?.pending) {
        plan.delay -= dt
        if (plan.delay <= 0) { plan.pending = false; if (!playable && plan.zone != null) dive(plan.zone, diff.speed); else if (!playable) idle() }
      }
      if (state === 'diving' && plan) {
        plan.t = (plan.t || 0) + dt
        const k = Math.min(1, plan.t / 0.30)
        if (plan.zone != null) g.position.x = THREE.MathUtils.lerp(plan.startX ?? 0, zoneX(plan.zone), k * k * (3 - 2 * k))
      }
    }
  }
}
