import * as THREE from 'three'
import { GOAL } from '../scene/net.js'
import { BALL_R } from './ball.js'
// Stato del tiro: dal gesto alla traiettoria (Bézier cubica), timing bar, collisioni con pali, traversa, rete e portiere.
// Tempo di volo 0,55–0,85 s in base alla potenza (da prompt). Sopra soglia il tiro sale: rischio traversa.
const SPOT = new THREE.Vector3(0, BALL_R, 11)
const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3()
const tmp = new THREE.Vector3(), prev = new THREE.Vector3()

// Da un gesto (px) a un bersaglio sul piano della porta (m). DA VERIFICARE: fattori di scala scelti da me.
export function aimFromGesture(g, size) {
  const x = (g.dx / (size.w * 0.50)) * (GOAL.w / 2 + 0.9)
  const up = -g.dy
  let y = Math.max(0.12, (up / (size.h * 0.55)) * (GOAL.h + 0.5))
  const speedBonus = Math.min(0.3, g.speed / 6000)
  let power = Math.min(1.2, Math.max(0.35, 0.35 + (g.len / (size.h * 0.45)) * 0.6 + speedBonus))
  if (power > 0.95) y += (power - 0.95) * 4 // il tiro "sale"
  return { x, y, power, curve: g.curve }
}
export function flightTime(power) { return 0.85 - ((power - 0.35) / (1.2 - 0.35)) * 0.30 }

// Punti della Bézier per la traiettoria fantasma e per il volo
export function buildCurve(aim) {
  P0.copy(SPOT)
  P3.set(aim.x, aim.y, 0)
  const lift = Math.max(0.6, aim.y * 0.55 + 0.4)
  P1.set(P0.x + aim.curve * 2.2, P0.y + lift, P0.z - 3.4)
  P2.set(P3.x + aim.curve * 2.4, P3.y + lift * 0.45, P3.z + 3.2)
  return new THREE.CubicBezierCurve3(P0.clone(), P1.clone(), P2.clone(), P3.clone())
}

export function createShot({ ball, goal, keeper, onEvent, precision = 1 }) {
  let prec = precision
  let state = 'idle' // idle | flying | done
  let curve = null, T = 0, t = 0, vel = new THREE.Vector3(), free = false, freeVel = new THREE.Vector3(), resolved = null
  let aim = null, timing = 0, held = 0, windup = 0, pendingFire = null
  const emit = (type, data = {}) => onEvent?.({ ...data, type }) // il tipo dell'evento vince sui campi del payload

  return {
    get state() { return state }, get aim() { return aim }, get resolved() { return resolved },
    // secondi di volo che mancano al piano della porta (Infinity se non in volo guidato)
    get remaining() { return state === 'flying' && !free ? Math.max(0, (1 - t) * T) : Infinity },
    get flying() { return state === 'flying' || state === 'held' },
    get busy() { return state !== 'idle' },
    setPrecision(v) { prec = v }, setKeeper(k) { keeper = k },
    // timingPerfect: rilascio nella finestra centrale → dispersione ridotta
    fire(a, { timingPerfect = false, delay = 0 } = {}) {
      if (state !== 'idle') return
      if (delay > 0) { state = 'windup'; windup = delay; pendingFire = { a, timingPerfect }; emit('windup', { aim: a, delay }); return }
      aim = { ...a }
      // dispersione: più forte il tiro, meno preciso; il timing perfetto la dimezza · DA VERIFICARE: entità
      const spread = (0.15 + Math.max(0, aim.power - 0.7) * 0.6) * (timingPerfect ? 0.5 : 1) * prec
      aim.x += (Math.random() - .5) * spread; aim.y += (Math.random() - .5) * spread * 0.6
      curve = buildCurve(aim); T = flightTime(aim.power); t = 0; free = false; resolved = null
      timing = timingPerfect ? 1 : 0
      state = 'flying'
      emit('kick', { aim, timingPerfect })
    },
    reset() { state = 'idle'; curve = null; resolved = null; aim = null; pendingFire = null; ball.reset() },
    update(dt) {
      if (state === 'windup') { windup -= dt; if (windup <= 0) { state = 'idle'; const f = pendingFire; pendingFire = null; this.fire(f.a, { timingPerfect: f.timingPerfect }) } return }
      if (state === 'held') { held -= dt; if (held <= 0) { state = 'done'; emit('settled', { result: 'save' }) } return }
      if (state !== 'flying') return
      const m = ball.mesh
      if (!free) {
        prev.copy(m.position)
        t += dt / T
        const u = Math.min(1, t)
        curve.getPoint(u, m.position)
        vel.copy(m.position).sub(prev).divideScalar(Math.max(dt, 1e-4))
        // rotazione visiva della palla
        m.rotation.x -= vel.length() * dt * 2.2; m.rotation.y += aim.curve * dt * 6
        // Intervento del portiere sul piano della porta (o poco prima)
        if (keeper && !resolved && m.position.z < 0.9 && m.position.z > -0.2) {
          const hit = keeper.tryStop(m.position, aim)
          if (hit) { resolved = 'save'; free = true; freeVel.copy(vel).multiplyScalar(-0.25); freeVel.x += hit.deflectX; freeVel.y = Math.abs(freeVel.y) * 0.4 + 1.2; emit('save', { point: m.position.clone(), catch: hit.catch }); if (hit.catch) { held = 0.9; state = 'held'; emit('result', { result: 'save', catch: true, point: m.position.clone() }) } return }
        }
        if (u >= 1 || m.position.z <= 0) {
          // sul piano della porta: palo, traversa, gol o fuori
          const x = m.position.x, y = m.position.y
          const inX = Math.abs(x) < GOAL.w / 2 - BALL_R, underBar = y < GOAL.h - BALL_R
          const onPost = Math.abs(Math.abs(x) - GOAL.w / 2) <= BALL_R + GOAL.post && y < GOAL.h + GOAL.post
          const onBar = Math.abs(y - (GOAL.h + GOAL.post)) <= BALL_R + GOAL.post && Math.abs(x) < GOAL.w / 2 + GOAL.post
          free = true
          if (onPost || onBar) {
            resolved = onBar ? 'crossbar' : 'post'
            freeVel.copy(vel).multiplyScalar(0.45); if (onPost) freeVel.x *= -1; else freeVel.y = -Math.abs(freeVel.y) - 1; freeVel.z = Math.abs(freeVel.z) * 0.9
            emit(resolved, { point: m.position.clone() }); emit('result', { result: resolved, point: m.position.clone() })
          } else if (inX && underBar) {
            resolved = 'goal'
            freeVel.copy(vel).multiplyScalar(0.55)
            const corner = Math.abs(x) > GOAL.w / 2 - 0.9 && y > GOAL.h - 0.7
            emit('goal', { point: m.position.clone(), corner }); emit('result', { result: 'goal', corner, point: m.position.clone() })
          } else {
            resolved = 'miss'
            freeVel.copy(vel).multiplyScalar(0.8)
            emit('miss', { point: m.position.clone() }); emit('result', { result: 'miss', point: m.position.clone() })
          }
        }
        ball.update(dt)
        return
      }
      // volo libero dopo l'esito: gravità, rete che frena, rimbalzo a terra
      freeVel.y -= 9.8 * dt
      m.position.addScaledVector(freeVel, dt)
      if (resolved === 'goal' && m.position.z < -GOAL.depth + BALL_R) { m.position.z = -GOAL.depth + BALL_R; if (freeVel.z < 0) { goal.punch(m.position, Math.min(1, freeVel.length() / 8)); freeVel.z *= -0.15; freeVel.x *= 0.3; freeVel.y *= 0.3 } }
      if (m.position.y < BALL_R) { m.position.y = BALL_R; freeVel.y = Math.abs(freeVel.y) * 0.35; freeVel.x *= 0.8; freeVel.z *= 0.8 }
      freeVel.multiplyScalar(1 - 0.8 * dt)
      m.rotation.x -= freeVel.length() * dt * 2
      ball.update(dt)
      if (freeVel.lengthSq() < 0.02 || m.position.z < -12 || m.position.z > 30 || Math.abs(m.position.x) > 20) { state = 'done'; emit('settled', { result: resolved }) }
    }
  }
}
