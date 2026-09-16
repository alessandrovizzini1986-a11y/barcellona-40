import * as THREE from 'three'
import { mosaicBallTexture } from '../scene/textures.js'
// Pallone: sfera con la texture del progetto (pentagoni, senza marchi). La fisica del tiro arriva in shot.js.
export const BALL_R = 0.11
export function createBall(texture) {
  const mat = new THREE.MeshStandardMaterial({ map: texture || null, color: texture ? 0xffffff : 0xf2e9de, roughness: .45, metalness: 0 })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 20), mat)
  mesh.castShadow = true
  mesh.position.set(0, BALL_R, 11)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.014, 11)
  let mosaic = null
  return {
    mesh, shadow,
    // Palloni sbloccabili: classico (texture), mosaico trencadís (procedurale), oro (metallo)
    setSkin(id) {
      if (id === 'ball:mosaico') { mosaic = mosaic || mosaicBallTexture(); mat.map = mosaic; mat.color.set(0xffffff); mat.metalness = 0; mat.roughness = .35 }
      else if (id === 'ball:oro') { mat.map = null; mat.color.set(0xE6B422); mat.metalness = .9; mat.roughness = .25 }
      else { mat.map = texture || null; mat.color.set(texture ? 0xffffff : 0xf2e9de); mat.metalness = 0; mat.roughness = .45 }
      mat.needsUpdate = true
    },
    reset() { mesh.position.set(0, BALL_R, 11); mesh.rotation.set(0, 0, 0); shadow.position.set(0, 0.014, 11); shadow.scale.setScalar(1) },
    update() { shadow.position.set(mesh.position.x, 0.014, mesh.position.z); const s = Math.max(0.3, 1 - (mesh.position.y - BALL_R) * 0.35); shadow.scale.setScalar(s); shadow.material.opacity = 0.35 * s }
  }
}
