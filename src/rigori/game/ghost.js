import * as THREE from 'three'
import { traiettoriaPrevista } from './shot.js'
// Traiettoria fantasma durante il drag: linea tratteggiata sui punti della Bézier
export function createGhost(scene) {
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3()))
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xF2B705, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: .9, depthTest: false }))
  line.visible = false; line.renderOrder = 5; scene.add(line)
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 24), new THREE.MeshBasicMaterial({ color: 0xF2B705, transparent: true, opacity: .9, depthTest: false, side: THREE.DoubleSide }))
  marker.visible = false; marker.renderOrder = 6; scene.add(marker)
  return {
    show(aim) {
      const pts = traiettoriaPrevista(aim, 24)
      geo.setFromPoints(pts); line.computeLineDistances(); line.visible = true
      marker.position.set(aim.x, aim.y, 0.02); marker.visible = true
    },
    hide() { line.visible = false; marker.visible = false }
  }
}
