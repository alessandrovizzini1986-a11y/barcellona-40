import * as THREE from 'three'
// "Juice": hit-stop, slow-motion prima dell'esito, replay laterale, particelle (coriandoli, polvere).
// Con "riduci flash e shake" o prefers-reduced-motion: niente shake né particelle intense; lo slow-mo resta.
export function createJuice({ scene, rig, game, reduced = () => false }) {
  // ---- particelle: un solo Points riusato, con velocità per particella ----
  const MAX = 600
  const pos = new Float32Array(MAX * 3), vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), col = new Float32Array(MAX * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, sizeAttenuation: true })
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; scene.add(points)
  const PALETTE = [0xE8552E, 0x2CA6A4, 0xF2B705, 0x3D5A80, 0xF2E9DE].map((h) => new THREE.Color(h))
  let head = 0
  const spawn = (p, v, color, ttl) => { const i = head; head = (head + 1) % MAX; pos.set([p.x, p.y, p.z], i * 3); vel.set([v.x, v.y, v.z], i * 3); life[i] = ttl; col.set([color.r, color.g, color.b], i * 3) }
  // ---- stato del tempo ----
  let hitStop = 0, slow = false, replay = null, replayCam = 'lateraleReplay'
  return {
    // Coriandoli (vittoria, gol decisivo): dall'alto, colori del sito
    confetti(n = 220, origin = new THREE.Vector3(0, 6, 4)) {
      if (reduced()) n = Math.min(n, 60)
      for (let i = 0; i < n; i++) spawn(origin.clone().add(new THREE.Vector3((Math.random() - .5) * 8, Math.random() * 2, (Math.random() - .5) * 4)), new THREE.Vector3((Math.random() - .5) * 2, -1 - Math.random() * 2, (Math.random() - .5) * 2), PALETTE[i % PALETTE.length], 2.5 + Math.random() * 1.5)
    },
    // Polvere sul tuffo
    dust(at, n = 40) {
      if (reduced()) return
      const c = new THREE.Color(0xa89f8a)
      for (let i = 0; i < n; i++) spawn(at.clone().add(new THREE.Vector3((Math.random() - .5) * .4, 0.05, (Math.random() - .5) * .4)), new THREE.Vector3((Math.random() - .5) * 1.6, Math.random() * 1.4, (Math.random() - .5) * 1.6), c, 0.5 + Math.random() * 0.4)
    },
    // Hit-stop di 60 ms su palo e guanti
    hitStop(ms = 60) { hitStop = ms / 1000 },
    setSlow(on) { slow = on },
    // Replay: NON risimula niente. Riesegue il record del tiro chiamando `render(t)` con t che avanza
    // a velocità ridotta, da un'altra camera. Stessa funzione di disegno del gioco dal vivo.
    setReplayCamera(name) { replayCam = name || 'lateraleReplay' },
    startReplay({ from = 0, to = 0, speed = 0.3, render, onEnd, camera = null, segui = false } = {}) {
      if (!render || to <= from) { onEnd?.(); return }
      replay = { t: from, to, speed, render, onEnd, segui }
      rig.followLook(null)
      if (camera) rig.goToPoint({ ...camera, instant: true }); else rig.goTo(replayCam, { instant: true })
    },
    get replaying() { return !!replay },
    // Restituisce la scala del tempo da applicare al gioco in questo frame
    update(raw, ballMesh) {
      // particelle
      let any = false
      for (let i = 0; i < MAX; i++) {
        if (life[i] <= 0) continue
        any = true; life[i] -= raw
        vel[i * 3 + 1] -= 4.5 * raw
        pos[i * 3] += vel[i * 3] * raw; pos[i * 3 + 1] += vel[i * 3 + 1] * raw; pos[i * 3 + 2] += vel[i * 3 + 2] * raw
        if (pos[i * 3 + 1] < 0.02) { pos[i * 3 + 1] = 0.02; vel[i * 3 + 1] = 0; vel[i * 3] *= 0.6; vel[i * 3 + 2] *= 0.6 }
        if (life[i] <= 0) pos[i * 3 + 1] = -5
      }
      points.visible = any
      if (any) { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true }
      // replay
      if (replay) {
        replay.t = Math.min(replay.to, replay.t + raw * replay.speed)
        replay.render(replay.t)
        if (replay.segui) rig.followLook(ballMesh)
        if (replay.t >= replay.to) { const cb = replay.onEnd; replay = null; rig.followLook(null); cb?.() }
        return 0 // durante il replay il tempo di gioco è fermo: avanza solo il replay
      }
      if (hitStop > 0) { hitStop -= raw; return 0 }
      return slow ? 0.3 : 1
    }
  }
}
