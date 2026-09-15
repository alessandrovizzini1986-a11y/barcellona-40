import * as THREE from 'three'
import { grassTexture } from './textures.js'
// Campo: erba tileable, area di rigore (16,5 × 40,32), area piccola (5,5 × 18,32), dischetto a 11 m, lunetta.
export function createField() {
  const g = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: .95, metalness: 0 }))
  ground.rotation.x = -Math.PI / 2; ground.position.z = 30; ground.receiveShadow = true
  g.add(ground)
  const white = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 })
  const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); g.add(m) }
  const LW = 0.12
  line(70, LW, 0, 0)                                  // linea di porta
  line(40.32, LW, 0, 16.5); line(LW, 16.5, -20.16, 8.25); line(LW, 16.5, 20.16, 8.25) // area di rigore
  line(18.32, LW, 0, 5.5); line(LW, 5.5, -9.16, 2.75); line(LW, 5.5, 9.16, 2.75)       // area piccola
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), white); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.012, 11); g.add(spot)
  // Lunetta: solo la parte oltre la linea dell'area (z > 16,5), cioè verso il tiratore.
  // Il ring è nel piano XY e ruotato di -90° su X: la sua +y locale punta verso la porta, quindi l'arco sta attorno a 270°.
  const arc = new THREE.Mesh(new THREE.RingGeometry(9.15 - LW / 2, 9.15 + LW / 2, 64, 1, Math.PI * 1.294, Math.PI * 0.412), white)
  arc.rotation.x = -Math.PI / 2; arc.position.set(0, 0.012, 11); g.add(arc)
  return g
}
