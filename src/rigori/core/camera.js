import * as THREE from 'three'
// Rig di camera con preset e interpolazione. La porta sta sul piano z=0, il dischetto a z=DISCHETTO (8,5 m).
// DA VERIFICARE: posizioni dei preset scelte a occhio per un portrait 9:16.
export const PRESETS = {
  // Le camere seguono la porta in scala (4,60 × 1,90) e il dischetto a 8,5 m: più basse e più vicine
  // di quelle di prima, altrimenti la porta resterebbe un francobollo in fondo al campo.
  dietroTiratore:  { pos: [0, 1.95, 13.6], look: [0, 0.95, 0] },
  dietroPortiere:  { pos: [0, 3.1, -7.4],  look: [0, 0.75, 5], fov: 74 }, // abbastanza indietro da tenere i pali nel quadro portrait
  lateraleReplay:  { pos: [-6.4, 1.3, 3.5], look: [0, 0.9, 1.2] },
  drone:           { pos: [0, 10.5, 9.5],  look: [0, 0.5, 1.6] },
  dischetto:       { pos: [0.3, 0.32, 9.1], look: [0, 1.0, 0] },
  // primi piani (QA visivo e schermate): portiere in porta, tiratore sul dischetto
  primoPianoPortiere: { pos: [1.0, 1.35, 3.6], look: [0, 1.0, 0.55] },
  primoPianoTiratore: { pos: [0.2, 1.2, 7.6], look: [0.5, 0.95, 10.0] }
}
export function createCameraRig(aspect) {
  const camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 400)
  const pos = new THREE.Vector3(), look = new THREE.Vector3()
  const target = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 58 }
  const shake = { t: 0, dur: 0, amp: 0 }
  const tmp = new THREE.Vector3()
  let follow = null, speed = 4
  const rig = {
    camera, current: 'dietroTiratore',
    goTo(name, { instant = false, speed: s = 4 } = {}) {
      const p = PRESETS[name] || PRESETS.dietroTiratore
      rig.current = name; speed = s
      target.pos.fromArray(p.pos); target.look.fromArray(p.look); target.fov = p.fov || 58
      if (instant) { pos.copy(target.pos); look.copy(target.look); camera.fov = target.fov; camera.updateProjectionMatrix() }
    },
    // Camera libera: posizione e punto d'interesse calcolati sul tiro (usata dai replay)
    goToPoint({ pos: pp, look: ll, fov = 58, instant = false, speed: sp = 4 } = {}) {
      rig.current = 'libera'; speed = sp
      target.pos.set(pp[0], pp[1], pp[2]); target.fov = fov
      if (ll) target.look.set(ll[0], ll[1], ll[2])
      if (instant) { pos.copy(target.pos); if (ll) look.copy(target.look); camera.fov = fov; camera.updateProjectionMatrix() }
    },
    // Segue un oggetto (la palla) con lo sguardo, senza spostarsi
    followLook(obj) { follow = obj },
    shake(amp = 0.12, dur = 0.35) { shake.t = 0; shake.dur = dur; shake.amp = amp },
    setAspect(a) { camera.aspect = a; camera.updateProjectionMatrix() },
    update(dt) {
      const k = 1 - Math.exp(-speed * dt)
      pos.lerp(target.pos, k)
      if (follow) { tmp.copy(follow.position); tmp.y += 0.2; look.lerp(tmp, 1 - Math.exp(-8 * dt)) } else look.lerp(target.look, k)
      camera.position.copy(pos)
      if (Math.abs(camera.fov - target.fov) > 0.05) { camera.fov += (target.fov - camera.fov) * k; camera.updateProjectionMatrix() }
      if (shake.t < shake.dur) {
        shake.t += dt
        const f = (1 - shake.t / shake.dur) * shake.amp
        camera.position.x += (Math.random() - .5) * f; camera.position.y += (Math.random() - .5) * f
      }
      camera.lookAt(look)
    }
  }
  rig.goTo('dietroTiratore', { instant: true })
  return rig
}
