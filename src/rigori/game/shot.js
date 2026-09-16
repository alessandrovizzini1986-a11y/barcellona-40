import * as THREE from 'three'
import { GOAL } from '../scene/net.js'
import { BALL_R } from './ball.js'
import { makeRng, newSeed } from '../core/rng.js'
// IL TIRO È UN RECORD IMMUTABILE.
//
// Al momento del calcio si costruisce un ShotRecord con un seme: dispersione, traiettoria, decisione del portiere
// ed esito vengono decisi TUTTI lì, con quel seme. Dopo, nessuno estrae più numeri casuali e nessuno "guarda dove
// è finita la palla" per decidere cos'è successo. Il volo libero dopo l'impatto è simulato subito e campionato.
//
// Esiste una sola funzione di disegno, `renderShotAt(record, t)`: dato il tempo trascorso dal calcio posiziona
// palla e portiere. Il gioco dal vivo la chiama con t che avanza al ritmo della partita; il replay la chiama con
// t che avanza a velocità ridotta, da un'altra camera. Stesso record, stessa immagine, quante volte si vuole.
const SPOT = new THREE.Vector3(0, BALL_R, 11)
const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3()
const _a = new THREE.Vector3(), _b = new THREE.Vector3()
const FREE_STEP = 1 / 120, FREE_MAX = 3.2, HOLD = 0.9 // presa: la palla resta ferma nei guanti prima di 'settled'

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
// Tempo di volo 0,55–0,85 s in base alla potenza (da prompt). Il minimo lascia al portiere il tempo di tuffarsi.
export function flightTimeFor(power) { return 0.85 - ((THREE.MathUtils.clamp(power, 0.35, 1.2) - 0.35) / (1.2 - 0.35)) * 0.30 }

// Punti della Bézier per la traiettoria fantasma e per il volo
export function buildCurve(aim) {
  P0.copy(SPOT)
  P3.set(aim.x, aim.y, 0)
  const lift = Math.max(0.6, aim.y * 0.55 + 0.4)
  P1.set(P0.x + aim.curve * 2.2, P0.y + lift, P0.z - 3.4)
  P2.set(P3.x + aim.curve * 2.4, P3.y + lift * 0.45, P3.z + 3.2)
  return new THREE.CubicBezierCurve3(P0.clone(), P1.clone(), P2.clone(), P3.clone())
}

// ---------------------------------------------------------------- record
// Costruisce il record. Il portiere CPU decide qui; con il portiere giocabile la zona non è ancora nota
// (la sceglie il giocatore durante il volo) e il record viene chiuso da `sealShotRecord` al gesto o all'impatto.
export function buildShotRecord({ aim: raw, timingPerfect = false, precision = 1, keeper = null, seed = newSeed() }) {
  const rnd = makeRng(seed)
  const aim = { ...raw }
  // dispersione: più forte il tiro, meno preciso; il timing perfetto la dimezza · DA VERIFICARE: entità
  const spread = (0.15 + Math.max(0, aim.power - 0.7) * 0.6) * (timingPerfect ? 0.5 : 1) * precision
  aim.x += (rnd() - .5) * spread
  aim.y = Math.max(0.12, aim.y + (rnd() - .5) * spread * 0.6)
  const curve = buildCurve(aim)
  const flightTime = flightTimeFor(aim.power)
  const rec = {
    seed, aim, timingPerfect, curve, flightTime,
    contactTime: flightTime,                 // istante in cui la palla arriva sul piano della porta
    lengths: curve.getLengths(48),           // per la rotazione della palla, uguale a ogni passata
    keeper: keeper ? keeper.decide({ aim, timingPerfect, rnd }) : null,
    outcome: null, corner: false, catch: false,
    contact: new THREE.Vector3(aim.x, aim.y, 0),
    free: null, netPunch: null, duration: flightTime, sealed: false
  }
  if (!rec.keeper || rec.keeper.mode !== 'player') sealShotRecord(rec, keeper)
  return rec
}
// Chiude il record: esito, volo libero campionato, durata. Da qui in poi il record non cambia più.
export function sealShotRecord(rec, keeper) {
  if (rec.sealed) return rec
  rec.sealed = true
  const aim = rec.aim
  const hit = keeper && rec.keeper ? keeper.evaluate({ aim, decision: rec.keeper, contactTime: rec.contactTime }) : null
  // velocità all'arrivo, dalla derivata della Bézier (niente stato accumulato: stessa curva, stessa velocità)
  const vel = _a.copy(rec.curve.getPoint(1)).sub(_b.copy(rec.curve.getPoint(0.98))).divideScalar(0.02 * rec.flightTime)
  const freeVel = new THREE.Vector3()
  if (hit) {
    rec.outcome = 'save'; rec.catch = !!hit.catch
    freeVel.copy(vel).multiplyScalar(-0.25); freeVel.x += hit.deflectX; freeVel.y = Math.abs(freeVel.y) * 0.4 + 1.2
  } else {
    const x = aim.x, y = aim.y
    const inX = Math.abs(x) < GOAL.w / 2 - BALL_R, underBar = y < GOAL.h - BALL_R
    const onPost = Math.abs(Math.abs(x) - GOAL.w / 2) <= BALL_R + GOAL.post && y < GOAL.h + GOAL.post
    const onBar = Math.abs(y - (GOAL.h + GOAL.post)) <= BALL_R + GOAL.post && Math.abs(x) < GOAL.w / 2 + GOAL.post
    if (onPost || onBar) {
      rec.outcome = onBar ? 'crossbar' : 'post'
      freeVel.copy(vel).multiplyScalar(0.45); if (onPost) freeVel.x *= -1; else freeVel.y = -Math.abs(freeVel.y) - 1; freeVel.z = Math.abs(freeVel.z) * 0.9
    } else if (inX && underBar) {
      rec.outcome = 'goal'
      rec.corner = Math.abs(x) > GOAL.w / 2 - 0.9 && y > GOAL.h - 0.7
      freeVel.copy(vel).multiplyScalar(0.55)
    } else {
      rec.outcome = 'miss'
      freeVel.copy(vel).multiplyScalar(0.8)
    }
  }
  rec.free = simulateFree(rec, freeVel)
  rec.duration = rec.contactTime + rec.free.dur
  return rec
}
// Volo libero dopo l'impatto: gravità, rete che frena, rimbalzo a terra. Simulato una volta, a passo fisso,
// e campionato: il replay non risimula niente, rilegge questi numeri.
function simulateFree(rec, v0) {
  const p = rec.contact.clone(), v = v0.clone()
  const pos = [], rot = []
  let rotX = -2.2 * rec.lengths[rec.lengths.length - 1], t = 0
  const push = () => { pos.push(p.x, p.y, p.z); rot.push(rotX) }
  push()
  if (rec.catch) { // presa: la palla resta nei guanti
    const n = Math.round(HOLD / FREE_STEP)
    for (let i = 0; i < n; i++) push()
    return { pos: new Float32Array(pos), rot: new Float32Array(rot), dur: HOLD, step: FREE_STEP }
  }
  while (t < FREE_MAX) {
    v.y -= 9.8 * FREE_STEP
    p.addScaledVector(v, FREE_STEP)
    if (rec.outcome === 'goal' && p.z < -GOAL.depth + BALL_R) {
      p.z = -GOAL.depth + BALL_R
      if (v.z < 0) { if (!rec.netPunch) rec.netPunch = { t: rec.contactTime + t, point: p.clone(), strength: Math.min(1, v.length() / 8) }; v.z *= -0.15; v.x *= 0.3; v.y *= 0.3 }
    }
    if (p.y < BALL_R) { p.y = BALL_R; v.y = Math.abs(v.y) * 0.35; v.x *= 0.8; v.z *= 0.8 }
    v.multiplyScalar(1 - 0.8 * FREE_STEP)
    rotX -= v.length() * FREE_STEP * 2
    t += FREE_STEP
    push()
    if (v.lengthSq() < 0.02 || p.z < -12 || p.z > 30 || Math.abs(p.x) > 20) break
  }
  return { pos: new Float32Array(pos), rot: new Float32Array(rot), dur: t, step: FREE_STEP }
}

// ---------------------------------------------------------------- disegno
// UNICA funzione di disegno del tiro. Pura rispetto al record: nessuna decisione, nessun caso, nessun random.
export function renderShotAt(rec, t, { ball, keeper, live = true }) {
  const m = ball.mesh
  if (t <= rec.contactTime) {
    const u = rec.flightTime > 0 ? THREE.MathUtils.clamp(t / rec.flightTime, 0, 1) : 1
    rec.curve.getPoint(u, m.position)
    const L = rec.lengths, i = THREE.MathUtils.clamp(u * (L.length - 1), 0, L.length - 1)
    const i0 = Math.floor(i), i1 = Math.min(L.length - 1, i0 + 1)
    m.rotation.x = -2.2 * THREE.MathUtils.lerp(L[i0], L[i1], i - i0)
    m.rotation.y = rec.aim.curve * t * 6
  } else if (rec.free) {
    const f = rec.free
    const n = f.rot.length
    const i = THREE.MathUtils.clamp((t - rec.contactTime) / f.step, 0, n - 1)
    const i0 = Math.floor(i), i1 = Math.min(n - 1, i0 + 1), k = i - i0
    m.position.set(
      THREE.MathUtils.lerp(f.pos[i0 * 3], f.pos[i1 * 3], k),
      THREE.MathUtils.lerp(f.pos[i0 * 3 + 1], f.pos[i1 * 3 + 1], k),
      THREE.MathUtils.lerp(f.pos[i0 * 3 + 2], f.pos[i1 * 3 + 2], k)
    )
    m.rotation.x = THREE.MathUtils.lerp(f.rot[i0], f.rot[i1], k)
  }
  keeper?.renderAt(rec.keeper, t, rec.contactTime, live)
  ball.update(0)
}

// ---------------------------------------------------------------- esecuzione
export function createShot({ ball, goal, keeper, onEvent, precision = 1 }) {
  let prec = precision
  let state = 'idle'      // idle | windup | live | done
  let rec = null, t = 0, windup = 0, pendingFire = null, pendingZone = null
  let announced = false, punched = false, lastT = 0
  let onFrame = null // QA: gancio sulla posa disegnata, per i test di determinismo
  const emit = (type, data = {}) => onEvent?.({ ...data, type }) // il tipo dell'evento vince sui campi del payload
  const draw = (at, live = true) => {
    if (!rec) return
    if (at < lastT) punched = false // t torna indietro = nuova passata (replay): la rete può gonfiarsi di nuovo
    lastT = at
    renderShotAt(rec, at, { ball, keeper, live })
    if (rec.netPunch && !punched && at >= rec.netPunch.t) { punched = true; goal.punch(rec.netPunch.point, rec.netPunch.strength) }
    onFrame?.(at)
  }
  // Esito: lo dice il record, una volta sola. Nessun altro pezzo di codice lo può cambiare.
  const announce = () => {
    if (announced) return
    announced = true
    const p = rec.contact.clone()
    if (rec.outcome === 'save') emit('save', { point: p, catch: rec.catch })
    else if (rec.outcome === 'goal') emit('goal', { point: p, corner: rec.corner })
    else emit(rec.outcome, { point: p })
    emit('result', { result: rec.outcome, corner: rec.corner, catch: rec.catch, point: p })
  }
  return {
    get state() { return state === 'live' ? 'flying' : state }, get aim() { return rec?.aim || null },
    get resolved() { return announced ? rec?.outcome || null : null },
    get record() { return rec },
    // secondi che mancano all'impatto (per lo slow-motion)
    get remaining() { return state === 'live' && !announced ? Math.max(0, rec.contactTime - t) : Infinity },
    get flying() { return state === 'live' },
    get busy() { return state !== 'idle' },
    get time() { return t },
    setPrecision(v) { prec = v }, setKeeper(k) { keeper = k },
    // timingPerfect: rilascio nella finestra centrale → dispersione ridotta. seed: per i test deterministici.
    fire(a, { timingPerfect = false, delay = 0, seed } = {}) {
      if (state !== 'idle') return null
      if (delay > 0) { state = 'windup'; windup = delay; pendingFire = { a, timingPerfect, seed }; emit('windup', { aim: a, delay }); return null }
      rec = buildShotRecord({ aim: a, timingPerfect, precision: prec, keeper, seed: seed === undefined ? newSeed() : seed })
      // tuffo già scelto durante la rincorsa: entra nel record come reazione immediata
      if (pendingZone != null && rec.keeper?.mode === 'player') { rec.keeper = keeper.playerDecision(pendingZone, 0); sealShotRecord(rec, keeper) }
      pendingZone = null
      t = 0; lastT = 0; announced = false; punched = false
      state = 'live'
      draw(0)
      emit('kick', { aim: rec.aim, timingPerfect, seed: rec.seed, record: rec })
      return rec
    },
    // Tuffo del giocatore (modalità portiere): completa e chiude il record all'istante del gesto
    playerDive(zone) {
      if (state === 'windup') { pendingZone = zone; return true } // tuffo anticipato, durante la rincorsa
      if (state !== 'live' || !rec || rec.sealed || !keeper) return false
      rec.keeper = keeper.playerDecision(zone, Math.min(t, rec.contactTime))
      sealShotRecord(rec, keeper)
      return true
    },
    playerDiveZone() { return rec?.keeper?.zone ?? pendingZone ?? null },
    set onFrame(f) { onFrame = f }, get onFrame() { return onFrame },
    // Ri-esecuzione del record da un'altra camera: stessa funzione di disegno, nessuna decisione, nessun evento
    renderAt(at) { draw(at, false) }, // ri-esecuzione: nessun effetto casuale, nessuna decisione
    reset() { state = 'idle'; rec = null; announced = false; punched = false; t = 0; lastT = 0; pendingFire = null; pendingZone = null; ball.reset() },
    update(dt) {
      if (state === 'windup') {
        windup -= dt
        if (windup <= 0) { state = 'idle'; const f = pendingFire; pendingFire = null; this.fire(f.a, { timingPerfect: f.timingPerfect, seed: f.seed }) }
        return
      }
      if (state !== 'live') return
      t += dt
      // con il portiere giocabile il record si chiude all'impatto, anche se il giocatore non si è tuffato
      if (!rec.sealed && t >= rec.contactTime) sealShotRecord(rec, keeper)
      draw(t)
      if (rec.sealed && t >= rec.contactTime) announce()
      if (rec.sealed && t >= rec.duration) { state = 'done'; emit('settled', { result: rec.outcome }) }
    }
  }
}
