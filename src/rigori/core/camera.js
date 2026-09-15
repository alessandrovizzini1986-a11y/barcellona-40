import * as THREE from 'three'
// Rig di camera con preset e interpolazione. Il gol sta sul piano z=0, il dischetto a z=11.
// DA VERIFICARE: posizioni dei preset scelte a occhio per un portrait 9:16.
export const PRESETS = {
  dietroTiratore:  { pos: [0, 2.6, 17.5],  look: [0, 1.2, 0] },
  dietroPortiere:  { pos: [0, 2.2, -4.5],  look: [0, 1.0, 11] },
  lateraleReplay:  { pos: [-9.5, 1.6, 4.5], look: [0, 1.1, 1.5] },
  drone:           { pos: [0, 14, 12],     look: [0, 0.5, 2] },
  dischetto:       { pos: [0.35, 0.35, 11.6], look: [0, 1.3, 0] },
  // primi piani (QA visivo e schermate): portiere in porta, tiratore sul dischetto
  primoPianoPortiere: { pos: [1.0, 1.35, 3.6], look: [0, 1.0, 0.55] },
  primoPianoTiratore: { pos: [0.2, 1.25, 9.9], look: [0.55, 1.0, 12.7] }
}
export function createCameraRig(aspect) {
  const camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 400)
  const pos = new THREE.Vector3(), look = new THREE.Vector3()
  const target = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  const shake = { t: 0, dur: 0, amp: 0 }
  const tmp = new THREE.Vector3()
  let follow = null, speed = 4
  const rig = {
    camera, current: 'dietroTiratore',
    goTo(name, { instant = false, speed: s = 4 } = {}) {
      const p = PRESETS[name] || PRESETS.dietroTiratore
      rig.current = name; speed = s
      target.pos.fromArray(p.pos); target.look.fromArray(p.look)
      if (instant) { pos.copy(target.pos); look.copy(target.look) }
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
