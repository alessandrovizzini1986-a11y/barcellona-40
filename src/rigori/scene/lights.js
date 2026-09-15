import * as THREE from 'three'
// Emisferica + direzionale con ombre strette (solo palla e portiere le proiettano) + due punti caldi dai fari
export function createLights() {
  const g = new THREE.Group()
  const hemi = new THREE.HemisphereLight(0x8fb0ff, 0x1a2b1c, 0.55); g.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.7); sun.position.set(-14, 26, 22); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.near = 5; sun.shadow.camera.far = 70
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -6
  sun.shadow.bias = -0.0008; sun.target.position.set(0, 0, 4); g.add(sun); g.add(sun.target)
  const p1 = new THREE.PointLight(0xffe9b8, 30, 60, 1.6); p1.position.set(-12, 12, 10); g.add(p1)
  const p2 = new THREE.PointLight(0xffe9b8, 30, 60, 1.6); p2.position.set(12, 12, 10); g.add(p2)
  // Accenti colorati sulle gradinate: terracotta e acqua, alternati per lato (direzione visiva del progetto)
  const accents = [[0xE8552E, -46, 10, -20], [0x2CA6A4, 46, 10, -20], [0x2CA6A4, -46, 10, 60], [0xE8552E, 46, 10, 60], [0xE8552E, 0, 12, -58], [0x2CA6A4, 0, 12, 118]]
  for (const [c, x, y, z] of accents) { const l = new THREE.PointLight(c, 260, 75, 1.8); l.position.set(x, y, z); g.add(l) }
  return { group: g, sun, setShadows(on) { sun.castShadow = !!on } }
}
