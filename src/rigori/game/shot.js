import * as THREE from 'three'
import { verificaParata, RAGGIO_CAPSULA } from './copertura.js'
import { GOAL, DISCHETTO } from '../scene/net.js'
import { BALL_R } from './ball.js'
import { makeRng, newSeed } from '../core/rng.js'
// IL TIRO È UN RECORD IMMUTABILE, LA PALLA È INTEGRATA CON LA FISICA.
//
// Al calcio si costruisce uno ShotRecord con un seme: dispersione, velocità iniziale, rotazione, decisione
// del portiere ed esito vengono decisi TUTTI lì. La traiettoria non è una curva disegnata a mano ma
// un'integrazione di Eulero semi-implicito a passo fisso (1/120 s) con gravità, resistenza quadratica ed
// effetto Magnus. L'integrazione avviene UNA VOLTA SOLA, alla creazione del record, e i campioni restano
// nel record: il gioco dal vivo e i replay rileggono gli stessi numeri, quindi non possono divergere.
// (Ri-integrare a ogni passata darebbe lo stesso risultato ma costerebbe CPU e lascerebbe aperta la porta
// a differenze fra una passata e l'altra: conservare i campioni è la garanzia più forte.)
export const FISICA = {
  g: 9.81,          // gravità
  drag: 0.0045,     // resistenza quadratica: a = -k |v| v (pallone da calcio)
  magnus: 0.0048,   // a = k (ω × v); tarato sulla distanza del dischetto
  spinMax: 60,      // rad/s alla curvatura massima dello swipe (≈ 9,5 giri al secondo)
  spinDecay: 0.6,   // la rotazione si smorza in volo (al secondo)
  dt: 1 / 120,
  // Velocità in scala col mondo: col dischetto a 8,5 m invece di 11, tenere 15-30 m/s avrebbe accorciato il
  // volo a 0,33-0,60 s e il portiere non avrebbe fatto in tempo a tuffarsi su niente. Con 11,5-22 m/s il volo
  // torna nella finestra 0,40-0,75 s e il tiro si legge come prima.
  vMin: 11.5, vMax: 22,        // m/s: 41–79 km/h, dal tiro piazzato alla botta
  restituzione: 0.6,           // rimbalzo su palo e traversa
  dragRete: 8,                 // dentro la rete la palla frena di brutto
  durataMax: 3.2,
  presa: 0.9        // la palla presa resta nei guanti prima di dichiarare il tiro concluso
}
const SPOT = new THREE.Vector3(0, BALL_R, DISCHETTO)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion()

// Da un gesto (px) a un bersaglio sul piano della porta (m) + potenza + curva. DA VERIFICARE: scale mie.
export function aimFromGesture(g, size) {
  // Mezzo schermo di trascinamento = mezza porta più il 15 % di margine fuori: con la porta in scala la
  // mira conta, e serve risoluzione. Il margine è quello che permette di sbagliare, non un'area utile.
  const x = (g.dx / (size.w * 0.50)) * (GOAL.w / 2 * 1.15)
  const up = -g.dy
  let y = Math.max(0.12, (up / (size.h * 0.55)) * (GOAL.h * 1.15))
  const speedBonus = Math.min(0.3, g.speed / 6000)
  let power = Math.min(1.2, Math.max(0.35, 0.35 + (g.len / (size.h * 0.45)) * 0.6 + speedBonus))
  if (power > 0.95) y += (power - 0.95) * 4 // il tiro "sale"
  return { x, y, power, curve: g.curve }
}
// Velocità iniziale in m/s dalla potenza del gesto: piazzato lento 15, botta 30
export const velocitaDa = (power) => FISICA.vMin + THREE.MathUtils.clamp((power - 0.35) / 0.85, 0, 1) * (FISICA.vMax - FISICA.vMin)

// Un passo di Eulero semi-implicito: prima la velocità, poi la posizione.
function passo(p, v, spin, dt, dragExtra = 0) {
  const vel = v.length()
  _a.set(0, -FISICA.g, 0)
  if (vel > 1e-4) _a.addScaledVector(v, -(FISICA.drag + dragExtra) * vel)
  _b.copy(spin).cross(v).multiplyScalar(FISICA.magnus)
  _a.add(_b)
  v.addScaledVector(_a, dt)
  p.addScaledVector(v, dt)
  spin.multiplyScalar(1 - FISICA.spinDecay * dt)
}
// Integra dal dischetto finché la palla non attraversa il piano della porta (z = 0).
function volaAllaPorta(dir, velocita, spin0, maxT = 2) {
  const p = SPOT.clone(), v = dir.clone().multiplyScalar(velocita), spin = spin0.clone()
  const prev = p.clone()
  let t = 0, prevZ = p.z
  while (t < maxT) {
    prev.copy(p); prevZ = p.z
    passo(p, v, spin, FISICA.dt)
    t += FISICA.dt
    if (p.z <= 0) {
      const k = prevZ === p.z ? 0 : prevZ / (prevZ - p.z) // punto esatto di attraversamento
      return { punto: prev.clone().lerp(p, k), tempo: t - FISICA.dt * (1 - k), v: v.clone(), spin: spin.clone() }
    }
  }
  return { punto: p.clone(), tempo: t, v: v.clone(), spin: spin.clone(), fuoriTempo: true }
}
// Direzione di lancio che porta la palla sul bersaglio, tenendo conto di gravità, resistenza e Magnus.
// Punto fisso: si mira a un bersaglio virtuale corretto dall'errore; converge in pochi giri.
function miraVerso(bersaglio, velocita, spin) {
  const virtuale = bersaglio.clone()
  let esito = null
  for (let i = 0; i < 10; i++) {
    esito = volaAllaPorta(virtuale.clone().sub(SPOT).normalize(), velocita, spin)
    const errX = bersaglio.x - esito.punto.x, errY = bersaglio.y - esito.punto.y
    if (Math.abs(errX) < 0.002 && Math.abs(errY) < 0.002) break
    virtuale.x += errX; virtuale.y += errY
  }
  return { dir: virtuale.clone().sub(SPOT).normalize(), esito }
}

// Anteprima della traiettoria per la linea di mira: stessa fisica, senza dispersione e senza portiere.
export function traiettoriaPrevista(aim, punti = 24) {
  const velocita = velocitaDa(aim.power)
  const spin = new THREE.Vector3(-Math.abs(aim.curve) * FISICA.spinMax * 0.25, THREE.MathUtils.clamp(aim.curve, -1, 1) * FISICA.spinMax, 0)
  const { dir, esito } = miraVerso(new THREE.Vector3(aim.x, aim.y, 0), velocita, spin)
  const p = SPOT.clone(), v = dir.clone().multiplyScalar(velocita), sp = spin.clone()
  const out = [p.clone()]
  const passiTot = Math.max(1, Math.round(esito.tempo / FISICA.dt))
  const ogni = Math.max(1, Math.floor(passiTot / (punti - 1)))
  for (let i = 1; i <= passiTot; i++) { passo(p, v, sp, FISICA.dt); if (i % ogni === 0 || i === passiTot) out.push(p.clone()) }
  return out
}

// Posizione della palla a un istante, ri-integrando dal dischetto: serve prima che la traiettoria sia campionata.
function posizioneA(rec, t) {
  const p = SPOT.clone(), v = rec.dir.clone().multiplyScalar(rec.velocita), spin = rec.spin.clone()
  const n = Math.max(0, Math.round(t / FISICA.dt))
  for (let i = 0; i < n; i++) passo(p, v, spin, FISICA.dt)
  return p
}
// Volo libero campionato a passo fisso, prima che l'esito sia deciso: è su questo che si misura se il
// portiere ci arriva. Nessuna scorciatoia: sono le stesse posizioni che poi si vedono a schermo.
export function voloLibero(rec, tMax, dt = 1 / 240) {
  const p = SPOT.clone(), v = rec.dir.clone().multiplyScalar(rec.velocita), spin = rec.spin.clone()
  const punti = [p.clone()]
  for (let t = dt; t <= tMax + 1e-9; t += dt) { passo(p, v, spin, dt); punti.push(p.clone()) }
  return { punti, dt }
}
// Istante in cui la palla passa più vicino a un punto (le mani del portiere), nel volo prima della linea.
function passaggioPiuVicino(rec, punto) {
  const p = SPOT.clone(), v = rec.dir.clone().multiplyScalar(rec.velocita), spin = rec.spin.clone()
  let best = { t: rec.contactTime, p: rec.contact.clone(), d: Infinity }
  const n = Math.max(1, Math.round(rec.contactTime / FISICA.dt))
  for (let i = 1; i <= n; i++) {
    passo(p, v, spin, FISICA.dt)
    const d = p.distanceTo(punto)
    if (d < best.d) best = { t: i * FISICA.dt, p: p.clone(), d }
  }
  return best
}

// ---------------------------------------------------------------- record
// `ruoli` = { tiratore: {id, nome}, portiere: {id, nome} }, presi dal turno: nel record non c'è nessun nome fisso.
export function buildShotRecord({ aim: raw, timingPerfect = false, precision = 1, keeper = null, seed = newSeed(), ruoli = {} }) {
  const rnd = makeRng(seed)
  const aim = { ...raw }
  // dispersione: più forte il tiro, meno preciso; il timing perfetto la dimezza · DA VERIFICARE: entità
  const spread = (0.15 + Math.max(0, aim.power - 0.7) * 0.6) * (timingPerfect ? 0.5 : 1) * precision
  aim.x += (rnd() - .5) * spread
  aim.y = Math.max(0.12, aim.y + (rnd() - .5) * spread * 0.6)
  const velocita = velocitaDa(aim.power)
  // la curva dello swipe diventa rotazione attorno a y (curva orizzontale) più un po' di retroeffetto
  const spin = new THREE.Vector3(-Math.abs(aim.curve) * FISICA.spinMax * 0.25, THREE.MathUtils.clamp(aim.curve, -1, 1) * FISICA.spinMax, 0)
  const { dir, esito } = miraVerso(new THREE.Vector3(aim.x, aim.y, 0), velocita, spin)
  const rec = {
    seed, aim, timingPerfect, rnd,
    velocita, dir: dir.clone(), spin: spin.clone(),
    contact: esito.punto.clone(),      // dove la palla attraversa il piano della porta
    contactTime: esito.tempo,          // quando (s dal calcio)
    vImpatto: esito.v.length(),
    ruoli: { tiratore: { ...ruoli.tiratore }, portiere: { ...ruoli.portiere } },
    keeper: keeper ? keeper.decide({ aim, timingPerfect, rnd, contactTime: esito.tempo }) : null,
    outcome: null, corner: false, catch: false, guanto: null,
    traiettoria: null, netPunch: null, duration: esito.tempo, sealed: false
  }
  if (!rec.keeper || rec.keeper.mode !== 'player') sealShotRecord(rec, keeper)
  return rec
}
// Chiude il record: esito, traiettoria completa campionata, durata. Da qui in poi il record non cambia più.
export function sealShotRecord(rec, keeper) {
  if (rec.sealed) return rec
  rec.sealed = true
  // Prima si decide se è parata (lo dice la portata del tuffo), poi la posa si adatta: se para, il guanto
  // arriva sulla palla; se non para, resta lontano. L'esito comanda la posa, mai il contrario.
  // ESITO DALLA GEOMETRIA REALE: si campiona il volo libero e si guarda se passa dentro la capsula
  // guanto→spalla della direzione scelta, misurata sul modello, mentre il tuffo è almeno al 60 %.
  // Nessuna zona astratta, nessuna probabilità: se il guanto non ci arriva, è gol.
  rec.volo = voloLibero(rec, rec.contactTime)
  const prova = rec.keeper?.zone != null
    ? verificaParata({ zona: rec.keeper.zone, tDive: rec.keeper.reactionDelay ?? 0, volo: rec.volo, tMax: rec.contactTime })
    : null
  rec.distanzaGuanto = prova ? +prova.distanza.toFixed(4) : null
  const hit = prova?.parata ? prova : null
  // La parata avviene dove la palla passa dentro la capsula, non sulla linea di porta: il portiere sta
  // 0,55 m davanti e nel tuffo si porta ancora più avanti.
  rec.tRisoluzione = hit ? hit.t : rec.contactTime
  if (hit) { rec.puntoGuanto = hit.punto.clone(); rec.guantoLato = hit.guanto; rec.guanto = hit.capsula.clone() }
  const x = rec.contact.x, y = rec.contact.y
  const dentroX = Math.abs(x) < GOAL.w / 2 - BALL_R, sottoTraversa = y < GOAL.h - BALL_R
  const suPalo = Math.abs(Math.abs(x) - GOAL.w / 2) <= BALL_R + GOAL.post && y < GOAL.h + GOAL.post
  const suTraversa = Math.abs(y - (GOAL.h + GOAL.post)) <= BALL_R + GOAL.post && Math.abs(x) < GOAL.w / 2 + GOAL.post
  // presa se la palla è lenta e passa in pieno nel guanto, altrimenti respinta
  if (hit) { rec.outcome = 'save'; rec.catch = rec.aim.power < 0.8 && hit.distanza < RAGGIO_CAPSULA * 0.5 }
  else if (suPalo || suTraversa) rec.outcome = suTraversa ? 'crossbar' : 'post'
  else if (dentroX && sottoTraversa) { rec.outcome = 'goal'; rec.corner = Math.abs(x) > GOAL.w / 2 - 0.55 && y > GOAL.h - 0.45 }
  else rec.outcome = 'miss'
  rec.traiettoria = simula(rec)
  rec.duration = rec.traiettoria.dur
  return rec
}
// Integrazione completa: volo fino all'impatto, poi la conseguenza dell'esito. Campionata a passo fisso.
function simula(rec) {
  // Il passo viene aggiustato di pochissimo perché l'istante dell'impatto cada ESATTAMENTE su un campione:
  // così a t = contactTime la palla disegnata è nel punto d'impatto, senza errore di interpolazione.
  const tRis = rec.tRisoluzione ?? rec.contactTime
  const N = Math.max(1, Math.round(tRis / FISICA.dt))
  const dt = tRis / N
  const p = SPOT.clone(), v = rec.dir.clone().multiplyScalar(rec.velocita), spin = rec.spin.clone()
  const rot = new THREE.Quaternion(), asse = new THREE.Vector3()
  const pos = [], quat = []
  const campiona = () => { pos.push(p.x, p.y, p.z); quat.push(rot.x, rot.y, rot.z, rot.w) }
  const ruota = (dt) => { const w = spin.length(); if (w > 1e-4) { asse.copy(spin).divideScalar(w); rot.premultiply(_q2.setFromAxisAngle(asse, w * dt)) } }
  campiona()
  let t = 0, risolto = false, dentroRete = false
  while (t < FISICA.durataMax) {
    passo(p, v, spin, dt, dentroRete ? FISICA.dragRete : 0)
    ruota(dt)
    t += dt
    if (!risolto && t >= tRis - dt * 1e-6) {
      risolto = true
      p.copy(rec.outcome === 'save' && rec.puntoGuanto ? rec.puntoGuanto : rec.contact)
      if (rec.outcome === 'save') {
        // la palla rimbalza DAL guanto: velocità riflessa attorno alla normale guanto→palla
        _a.copy(p).sub(rec.guanto)
        if (_a.lengthSq() < 1e-6) _a.set(Math.sign(rec.contact.x) || 1, 0.3, 1)
        _a.normalize()
        v.addScaledVector(_a, -2 * v.dot(_a)).multiplyScalar(0.35)
        if (v.y < 0.5) v.y = 0.5 + Math.abs(v.y) * 0.3 // il guanto alza sempre un po' la palla
        if (v.z < 0.5) v.z = 0.5 + Math.abs(v.z) * 0.5 // e la rimanda verso il campo, mai dentro il portiere
        spin.multiplyScalar(0.3)
        if (rec.catch) { v.set(0, 0, 0); spin.set(0, 0, 0) }
      } else if (rec.outcome === 'post' || rec.outcome === 'crossbar') {
        const e = FISICA.restituzione * (0.9 + rec.rnd() * 0.2) // un filo di casualità, dal seme
        if (rec.outcome === 'post') { v.x = -v.x * e; v.z = Math.abs(v.z) * e } else { v.y = -Math.abs(v.y) * e; v.z = Math.abs(v.z) * e }
        v.multiplyScalar(0.85)
      } else if (rec.outcome === 'goal') v.multiplyScalar(0.9)
    }
    if (rec.outcome === 'goal' && !dentroRete && p.z < -GOAL.depth + BALL_R * 2) {
      dentroRete = true
      if (!rec.netPunch) rec.netPunch = { t, punto: p.clone(), velocita: v.length() }
    }
    if (p.y < BALL_R) { p.y = BALL_R; v.y = Math.abs(v.y) * 0.35; v.x *= 0.8; v.z *= 0.8 }
    campiona()
    // sulla presa la palla resta ferma nei guanti: si continua a campionare per far durare la posa
    if (rec.catch && t < tRis + FISICA.presa) continue
    if (risolto && (v.lengthSq() < 0.05 || p.z < -GOAL.depth - 3 || p.z > 26 || Math.abs(p.x) > 18)) break
  }
  return { pos: new Float32Array(pos), quat: new Float32Array(quat), dur: t, step: dt, indiceContatto: N }
}

// ---------------------------------------------------------------- disegno
// UNICA funzione di disegno del tiro. Pura rispetto al record: nessuna decisione, nessun caso, nessun random.
export function renderShotAt(rec, t, { ball, keeper, live = true }) {
  const m = ball.mesh, tr = rec.traiettoria
  if (tr) {
    const n = tr.quat.length / 4
    const i = THREE.MathUtils.clamp(t / tr.step, 0, n - 1)
    const i0 = Math.floor(i), i1 = Math.min(n - 1, i0 + 1), k = i - i0
    m.position.set(
      THREE.MathUtils.lerp(tr.pos[i0 * 3], tr.pos[i1 * 3], k),
      THREE.MathUtils.lerp(tr.pos[i0 * 3 + 1], tr.pos[i1 * 3 + 1], k),
      THREE.MathUtils.lerp(tr.pos[i0 * 3 + 2], tr.pos[i1 * 3 + 2], k)
    )
    _q.set(tr.quat[i0 * 4], tr.quat[i0 * 4 + 1], tr.quat[i0 * 4 + 2], tr.quat[i0 * 4 + 3])
    _q2.set(tr.quat[i1 * 4], tr.quat[i1 * 4 + 1], tr.quat[i1 * 4 + 2], tr.quat[i1 * 4 + 3])
    m.quaternion.copy(_q).slerp(_q2, k)
  }
  keeper?.renderAt(rec.keeper, t, rec.tRisoluzione ?? rec.contactTime, live)
  ball.update(0)
}

// ---------------------------------------------------------------- esecuzione
export function createShot({ ball, goal, keeper, onEvent, precision = 1 }) {
  let prec = precision
  let state = 'idle'      // idle | windup | live | done
  let rec = null, t = 0, windup = 0, pendingFire = null, pendingZone = null
  let ruoli = { tiratore: { id: null, nome: 'Tu', utente: true }, portiere: { id: null, nome: 'Il portiere', utente: false } }
  let announced = false, punched = false, lastT = 0
  let onFrame = null // QA: gancio sulla posa disegnata, per i test di determinismo
  const emit = (type, data = {}) => onEvent?.({ ...data, type })
  const draw = (at, live = true) => {
    if (!rec) return
    if (at < lastT) punched = false // t torna indietro = nuova passata (replay): la rete può gonfiarsi di nuovo
    lastT = at
    renderShotAt(rec, at, { ball, keeper, live })
    if (rec.netPunch && !punched && at >= rec.netPunch.t) {
      punched = true
      if (goal.impulso) goal.impulso(rec.netPunch.punto, rec.netPunch.velocita); else goal.punch?.(rec.netPunch.punto, 1)
    }
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
    emit('result', { result: rec.outcome, corner: rec.corner, catch: rec.catch, point: p, velocita: rec.vImpatto, ruoli: rec.ruoli })
  }
  return {
    get state() { return state === 'live' ? 'flying' : state }, get aim() { return rec?.aim || null },
    get resolved() { return announced ? rec?.outcome || null : null },
    get record() { return rec },
    get remaining() { return state === 'live' && !announced ? Math.max(0, (rec.tRisoluzione ?? rec.contactTime) - t) : Infinity },
    get flying() { return state === 'live' },
    get busy() { return state !== 'idle' },
    get time() { return t },
    setPrecision(v) { prec = v }, setKeeper(k) { keeper = k },
    // Ruoli del turno: finiscono nel record, e da lì li leggono HUD, sfottò, punteggio e XP.
    setRuoli(r) { ruoli = { tiratore: { ...r.tiratore }, portiere: { ...r.portiere } } },
    get ruoli() { return ruoli },
    fire(a, { timingPerfect = false, delay = 0, seed } = {}) {
      if (state !== 'idle') return null
      if (delay > 0) { state = 'windup'; windup = delay; pendingFire = { a, timingPerfect, seed }; emit('windup', { aim: a, delay }); return null }
      rec = buildShotRecord({ aim: a, timingPerfect, precision: prec, keeper, seed: seed === undefined ? newSeed() : seed, ruoli })
      if (pendingZone != null && rec.keeper?.mode === 'player') { rec.keeper = keeper.playerDecision(pendingZone, 0); sealShotRecord(rec, keeper) }
      pendingZone = null
      t = 0; lastT = 0; announced = false; punched = false
      state = 'live'
      draw(0)
      emit('kick', { aim: rec.aim, timingPerfect, seed: rec.seed, record: rec, velocita: rec.velocita })
      return rec
    },
    playerDive(zone) {
      if (state === 'windup') { pendingZone = zone; return true } // tuffo anticipato, durante la rincorsa
      if (state !== 'live' || !rec || rec.sealed || !keeper) return false
      rec.keeper = keeper.playerDecision(zone, Math.min(t, rec.contactTime))
      sealShotRecord(rec, keeper)
      return true
    },
    playerDiveZone() { return rec?.keeper?.zone ?? pendingZone ?? null },
    set onFrame(f) { onFrame = f }, get onFrame() { return onFrame },
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
      if (!rec.sealed && t >= rec.contactTime) sealShotRecord(rec, keeper)
      draw(t)
      if (rec.sealed && t >= (rec.tRisoluzione ?? rec.contactTime)) announce()
      if (rec.sealed && t >= rec.duration) { state = 'done'; emit('settled', { result: rec.outcome }) }
    }
  }
}
