import * as THREE from 'three'
// Pallone: sfera con la texture del progetto (pentagoni, senza marchi). La fisica del tiro arriva in shot.js.
export const BALL_R = 0.11
export function createBall(texture) {
  const mat = new THREE.MeshStandardMaterial({ map: texture || null, color: texture ? 0xffffff : 0xf2e9de, roughness: .45, metalness: 0 })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 20), mat)
  mesh.castShadow = true
  mesh.position.set(0, BALL_R, 11)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.014, 11)
  return {
    mesh, shadow,
    reset() { mesh.position.set(0, BALL_R, 11); mesh.rotation.set(0, 0, 0); shadow.position.set(0, 0.014, 11); shadow.scale.setScalar(1) },
    update() { shadow.position.set(mesh.position.x, 0.014, mesh.position.z); const s = Math.max(0.3, 1 - (mesh.position.y - BALL_R) * 0.35); shadow.scale.setScalar(s); shadow.material.opacity = 0.35 * s }
  }
}
