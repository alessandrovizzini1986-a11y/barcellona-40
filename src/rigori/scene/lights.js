import * as THREE from 'three'
// Illuminazione notturna: emisferica fredda, quattro fari conici (SpotLight) dalle torri, un riempimento
// direzionale morbido, accenti colorati terracotta (sinistra) e acqua (destra) sulle gradinate.
// Nessuna ombra dura: le ombre dei personaggi sono ombre di contatto (vedi players.js), la palla ha il suo disco.
export function createLights({ towerPositions = [], aim = new THREE.Vector3(0, 0, 22) } = {}) {
  const g = new THREE.Group()
  const hemi = new THREE.HemisphereLight(0x8aa6e0, 0x141a12, 0.6); g.add(hemi)
  const fill = new THREE.DirectionalLight(0xfff1d6, 1.1); fill.position.set(-14, 30, 24); fill.castShadow = false; fill.target.position.set(0, 0, 8); g.add(fill); g.add(fill.target)
  const spots = []
  for (const p of towerPositions) {
    const s = new THREE.SpotLight(0xfff3d0, 3800, 0, 0.42, 0.55, 2)
    s.position.copy(p); s.target.position.copy(aim); s.castShadow = false; g.add(s); g.add(s.target); spots.push(s)
  }
  // Accenti sulle gradinate: terracotta a sinistra, acqua a destra, intensità bassa (direzione visiva del progetto)
  const accents = [[0xE8552E, -50, 9, 30], [0x2CA6A4, 50, 9, 30], [0xE8552E, -30, 9, -60], [0x2CA6A4, 30, 9, -60]]
  for (const [c, x, y, z] of accents) { const l = new THREE.PointLight(c, 140, 70, 1.9); l.position.set(x, y, z); g.add(l) }
  return { group: g, sun: fill, spots, setShadows() { /* ombre dure disattivate: ombre di contatto morbide */ } }
}
