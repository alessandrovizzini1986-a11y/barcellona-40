import * as THREE from 'three'
import { grassTexture, grassNormalTexture } from './textures.js'
// Campo: erba tileable, aree e lunetta. Le misure NON sono regolamentari: sono scalate sulla porta, che è
// in scala coi personaggi (4,60 × 1,90). Il rapporto fra le righe resta quello vero, cambia la taglia.
// Il dischetto sta a DISCHETTO metri dalla linea di porta.
import { GOAL, DISCHETTO } from './net.js'
const SCALA = GOAL.w / 7.32   // quanto è più piccola questa porta di una regolamentare
const AREA = { w: 40.32 * SCALA, d: 16.5 * SCALA }        // area di rigore
const PICCOLA = { w: 18.32 * SCALA, d: 5.5 * SCALA }      // area piccola
const RAGGIO_LUNETTA = 9.15 * SCALA
export function createField() {
  const g = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), new THREE.MeshStandardMaterial({ map: grassTexture(), normalMap: grassNormalTexture(), normalScale: new THREE.Vector2(0.35, 0.35), roughness: .95, metalness: 0 }))
  ground.rotation.x = -Math.PI / 2; ground.position.z = 30; ground.receiveShadow = true
  g.add(ground)
  const white = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 })
  const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); g.add(m) }
  const LW = 0.12
  line(70, LW, 0, 0)                                  // linea di porta
  line(AREA.w, LW, 0, AREA.d); line(LW, AREA.d, -AREA.w / 2, AREA.d / 2); line(LW, AREA.d, AREA.w / 2, AREA.d / 2)          // area di rigore
  line(PICCOLA.w, LW, 0, PICCOLA.d); line(LW, PICCOLA.d, -PICCOLA.w / 2, PICCOLA.d / 2); line(LW, PICCOLA.d, PICCOLA.w / 2, PICCOLA.d / 2) // area piccola
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), white); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.012, DISCHETTO); g.add(spot)
  // Lunetta: solo la parte oltre la linea dell'area (z > 16,5), cioè verso il tiratore.
  // Il ring è nel piano XY e ruotato di -90° su X: la sua +y locale punta verso la porta, quindi l'arco sta attorno a 270°.
  const arc = new THREE.Mesh(new THREE.RingGeometry(RAGGIO_LUNETTA - LW / 2, RAGGIO_LUNETTA + LW / 2, 64, 1, Math.PI * 1.294, Math.PI * 0.412), white)
  arc.rotation.x = -Math.PI / 2; arc.position.set(0, 0.012, DISCHETTO); g.add(arc)
  return g
}
