import * as THREE from 'three'
import { netTexture } from './textures.js'
// Porta 7,32 × 2,44 con rete a griglia. La rete si gonfia al gol: i vertici vicini all'impatto
// vengono spinti indietro e tornano con smorzamento (molla).
export const GOAL = { w: 7.32, h: 2.44, depth: 2.0, post: 0.06 }
export function createGoal() {
  const g = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35, metalness: .1 })
  const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post, GOAL.post, GOAL.h + GOAL.post, 16), white); m.position.set(x, (GOAL.h + GOAL.post) / 2, 0); m.castShadow = true; g.add(m); return m }
  post(-GOAL.w / 2); post(GOAL.w / 2)
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post, GOAL.post, GOAL.w + GOAL.post * 2, 16), white)
  bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL.h + GOAL.post, 0); g.add(bar)
  const back = (x, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post * .6, GOAL.post * .6, GOAL.depth, 10), white); m.rotation.x = Math.PI / 2; m.position.set(x, 0.05, -GOAL.depth / 2); g.add(m) }
  back(-GOAL.w / 2); back(GOAL.w / 2)
  const tex = netTexture()
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: .85 })
  const panels = []
  const panel = (w, h, segsW, segsH, setup) => {
    const geo = new THREE.PlaneGeometry(w, h, segsW, segsH)
    const m = new THREE.Mesh(geo, mat.clone()); m.material.map = tex.clone(); m.material.map.repeat.set(w * 2.2, h * 2.2); m.material.map.needsUpdate = true
    setup(m); g.add(m); m.userData.base = geo.attributes.position.array.slice(); m.userData.vel = new Float32Array(geo.attributes.position.count * 3); panels.push(m); return m
  }
  panel(GOAL.w, GOAL.h, 24, 10, (m) => { m.position.set(0, GOAL.h / 2, -GOAL.depth) })                              // fondo
  panel(GOAL.depth, GOAL.h, 8, 10, (m) => { m.rotation.y = Math.PI / 2; m.position.set(-GOAL.w / 2, GOAL.h / 2, -GOAL.depth / 2) })
  panel(GOAL.depth, GOAL.h, 8, 10, (m) => { m.rotation.y = -Math.PI / 2; m.position.set(GOAL.w / 2, GOAL.h / 2, -GOAL.depth / 2) })
  panel(GOAL.w, GOAL.depth, 24, 8, (m) => { m.rotation.x = Math.PI / 2; m.position.set(0, GOAL.h, -GOAL.depth / 2) })  // tetto
  const local = new THREE.Vector3()
  return {
    group: g,
    // Spinta sulla rete nel punto (mondo) di impatto, in direzione -z
    punch(worldPoint, strength = 0.9) {
      for (const m of panels) {
        local.copy(worldPoint); m.worldToLocal(local)
        const pos = m.geometry.attributes.position; const vel = m.userData.vel
        for (let i = 0; i < pos.count; i++) {
          const dx = pos.getX(i) - local.x, dy = pos.getY(i) - local.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 1.6) vel[i * 3 + 2] -= strength * (1 - d / 1.6) * 6
        }
      }
    },
    update(dt) {
      for (const m of panels) {
        const pos = m.geometry.attributes.position, base = m.userData.base, vel = m.userData.vel
        let active = false
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i), z0 = base[i * 3 + 2]
          let v = vel[i * 3 + 2]
          if (Math.abs(v) < 1e-4 && Math.abs(z - z0) < 1e-4) continue
          active = true
          v += (z0 - z) * 40 * dt; v *= Math.exp(-6 * dt)  // molla + smorzamento · DA VERIFICARE: costanti a occhio
          vel[i * 3 + 2] = v; pos.setZ(i, z + v * dt)
        }
        if (active) pos.needsUpdate = true
      }
    }
  }
}
