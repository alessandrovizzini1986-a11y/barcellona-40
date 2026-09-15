import * as THREE from 'three'
// Emisferica + direzionale con ombre strette (solo palla e portiere le proiettano) + due punti caldi dai fari
export function createLights() {
  const g = new THREE.Group()
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x1b2a1d, 0.9); g.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff4dc, 2.1); sun.position.set(-14, 26, 22); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.near = 5; sun.shadow.camera.far = 70
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -6
  sun.shadow.bias = -0.0008; sun.target.position.set(0, 0, 4); g.add(sun); g.add(sun.target)
  const p1 = new THREE.PointLight(0xffe9b8, 40, 60, 1.6); p1.position.set(-12, 12, 10); g.add(p1)
  const p2 = new THREE.PointLight(0xffe9b8, 40, 60, 1.6); p2.position.set(12, 12, 10); g.add(p2)
  return { group: g, sun, setShadows(on) { sun.castShadow = !!on } }
}
