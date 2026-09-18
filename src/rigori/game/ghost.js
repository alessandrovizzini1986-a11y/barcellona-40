import * as THREE from 'three'
import { traiettoriaPrevista } from './shot.js'
import { GOAL } from '../scene/net.js'
// Traiettoria fantasma e MIRINO durante il trascinamento. Con la porta in scala coi personaggi la mira conta,
// e mirare al buio sarebbe frustrante: il mirino sta sul piano della porta, dove arriverà la palla.
// Giallo dentro lo specchio, terracotta fuori: il margine del 15 % oltre i pali serve a poter sbagliare,
// e si deve vedere che si sta sbagliando.
const DENTRO = 0xF2B705, FUORI = 0xE8552E
export function createGhost(scene) {
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3()))
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: DENTRO, dashSize: 0.18, gapSize: 0.13, transparent: true, opacity: .9, depthTest: false }))
  line.visible = false; line.renderOrder = 5; scene.add(line)
  // Mirino: anello più due trattini incrociati, così si legge anche piccolo e in controluce
  const mirino = new THREE.Group(); mirino.visible = false; mirino.renderOrder = 6; scene.add(mirino)
  const mat = new THREE.MeshBasicMaterial({ color: DENTRO, transparent: true, opacity: .95, depthTest: false, side: THREE.DoubleSide })
  const anello = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.20, 28), mat)
  const braccio = (w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); return m }
  const cx = braccio(0.34, 0.035), cy = braccio(0.035, 0.34)
  mirino.add(anello, cx, cy)
  return {
    show(aim) {
      const pts = traiettoriaPrevista(aim, 24)
      geo.setFromPoints(pts); line.computeLineDistances(); line.visible = true
      mirino.position.set(aim.x, aim.y, 0.03); mirino.visible = true
      const dentro = Math.abs(aim.x) < GOAL.w / 2 && aim.y < GOAL.h
      mat.color.setHex(dentro ? DENTRO : FUORI)
      line.material.color.setHex(dentro ? DENTRO : FUORI)
    },
    hide() { line.visible = false; mirino.visible = false }
  }
}
