import * as THREE from 'three'
import { seatsTexture } from './textures.js'
// Stadio low-poly: quattro anelli di gradinate, torri faro, cielo notturno con stelle. Tutto procedurale.
export function createStadium() {
  const g = new THREE.Group()
  const seats = seatsTexture()
  const tierMat = new THREE.MeshStandardMaterial({ map: seats, roughness: .9 })
  const concrete = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: .95 })
  // Le tribune: per ogni lato, 3 gradoni inclinati. Il campo è centrato su (0, 0, 30) [z da -30 a 90 per il rettangolo lungo]
  const cx = 0, cz = 30, halfW = 48, halfD = 62
  const tier = (w, d, x, z, rotY, i) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2 + i * 0.6, d), i === 3 ? concrete : tierMat)
    step.position.set(x, 1.6 + i * 3.2, z); step.rotation.y = rotY; g.add(step)
  }
  for (let i = 0; i < 4; i++) {
    const off = i * 7
    tier(halfW * 2 + off * 2, 7, cx, cz - halfD - off, 0, i)            // dietro la porta (fondo)
    tier(halfW * 2 + off * 2, 7, cx, cz + halfD + off, 0, i)            // lato opposto
    tier(7, halfD * 2 + off * 2, cx - halfW - off, cz, 0, i)            // sinistra
    tier(7, halfD * 2 + off * 2, cx + halfW + off, cz, 0, i)            // destra
  }
  // Torri faro
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 1.1 })
  const pole = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: .6, metalness: .4 })
  const towers = []
  // Due torri dietro la porta restano nell'inquadratura del tiratore (portrait): il bagliore è parte della scena
  for (const [x, z, h] of [[-11, -42, 28], [11, -42, 28], [-60, 100, 44], [60, 100, 44]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h, 8), pole); p.position.set(x, h / 2, z); g.add(p)
    const head = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 1.0), lamp); head.position.set(x, h, z + (z < 30 ? 1.5 : -1.5)); head.lookAt(0, 0, 11); g.add(head); towers.push(head)
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: .07, depthWrite: false })); halo.position.copy(head.position); halo.lookAt(0, 0, 11); g.add(halo)
  }
  // Cielo: sfera con gradiente notturno e stelle
  const skyGeo = new THREE.SphereGeometry(300, 24, 12)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x03060f) }, bottom: { value: new THREE.Color(0x14233f) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.8 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }'
  })
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.position.z = 30; g.add(sky)
  const N = 700, sp = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - Math.random() * 0.9); const r = 280; sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 20; sp[i * 3 + 2] = 30 + r * Math.sin(ph) * Math.sin(th) }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.9, sizeAttenuation: true }))
  g.add(stars)
  return { group: g, towers }
}
