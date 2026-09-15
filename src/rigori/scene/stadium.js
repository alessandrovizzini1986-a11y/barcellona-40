import * as THREE from 'three'
import { STAND } from './crowd.js'
import { glowTexture } from './textures.js'
// Stadio low-poly: gradinate a 8 gradoni per lato (colori piatti, niente texture), pannello scuro dietro,
// strisce LED terracotta/acqua, quattro torri faro con fascio visibile, cielo notturno a gradiente e stelle.
export function createStadium() {
  const g = new THREE.Group()
  const S = STAND
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x2a3148, roughness: .95 })
  const riserMat = new THREE.MeshStandardMaterial({ color: 0x1c2234, roughness: .95 })
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d1019, roughness: 1 })
  const led = [new THREE.MeshBasicMaterial({ color: new THREE.Color(0xE8552E).multiplyScalar(2.4) }), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2CA6A4).multiplyScalar(2.4) })]
  // Un gradone = pedata (box sottile) + alzata; quattro lati per fila
  for (let r = 0; r < S.rows; r++) {
    const off = S.depth * r, y = S.y0 + r * S.rise, w = S.halfW + off, d = S.halfD + off
    const tread = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.18, sz), stepMat); m.position.set(x, y - 0.09, z); g.add(m) }
    const riser = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, S.rise, sz), riserMat); m.position.set(x, y - S.rise / 2, z); g.add(m) }
    tread(w * 2 + S.depth * 2, S.depth, S.cx, S.cz - d - S.depth / 2); tread(w * 2 + S.depth * 2, S.depth, S.cx, S.cz + d + S.depth / 2)
    tread(S.depth, d * 2, S.cx - w - S.depth / 2, S.cz); tread(S.depth, d * 2, S.cx + w + S.depth / 2, S.cz)
    riser(w * 2, 0.2, S.cx, S.cz - d); riser(w * 2, 0.2, S.cx, S.cz + d); riser(0.2, d * 2, S.cx - w, S.cz); riser(0.2, d * 2, S.cx + w, S.cz)
    if (r % 3 === 0) { // strisce LED sull'alzata del gradone, alternate terracotta/acqua per lato
      const strip = (sx, sz, x, z, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.34, sz), led[i % 2]); m.position.set(x, y - 0.45, z); g.add(m) }
      strip(w * 2, 0.3, S.cx, S.cz - d - 0.05, r); strip(w * 2, 0.3, S.cx, S.cz + d + 0.05, r + 1)
      strip(0.3, d * 2, S.cx - w - 0.05, S.cz, r + 1); strip(0.3, d * 2, S.cx + w + 0.05, S.cz, r)
    }
  }
  // Parapetto davanti alla prima fila e pannello scuro dietro l'ultima
  const front = new THREE.Mesh(new THREE.BoxGeometry(S.halfW * 2 + 0.4, S.y0, 0.3), riserMat); front.position.set(S.cx, S.y0 / 2, S.cz - S.halfD); g.add(front)
  const front2 = front.clone(); front2.position.z = S.cz + S.halfD; g.add(front2)
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, S.y0, S.halfD * 2), riserMat); side.position.set(S.cx - S.halfW, S.y0 / 2, S.cz); g.add(side)
  const side2 = side.clone(); side2.position.x = S.cx + S.halfW; g.add(side2)
  const back = S.depth * (S.rows + 0.6), yTop = S.y0 + S.rows * S.rise, wallH = 11
  const wall = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, wallH, sz), wallMat); m.position.set(x, yTop + wallH / 2 - 0.5, z); g.add(m) }
  wall((S.halfW + back) * 2 + 1, 0.6, S.cx, S.cz - S.halfD - back - 0.3); wall((S.halfW + back) * 2 + 1, 0.6, S.cx, S.cz + S.halfD + back + 0.3)
  wall(0.6, (S.halfD + back) * 2, S.cx - S.halfW - back - 0.3, S.cz); wall(0.6, (S.halfD + back) * 2, S.cx + S.halfW + back + 0.3, S.cz)
  // Torri faro: palo, testa emissiva (il bloom la accende), alone e cono di luce additivo verso il campo
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1c8, emissiveIntensity: 6 })
  const pole = new THREE.MeshStandardMaterial({ color: 0x6f7480, roughness: .6, metalness: .4 })
  // Fascio: cono additivo che sfuma dall'apice (α 0,09) alla base (0); solo le facce interne, così da dentro
  // il cono si vede un solo strato e l'immagine non si lava
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    uniforms: { color: { value: new THREE.Color(0xfff1c8) } },
    vertexShader: 'varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 color; varying float vT; void main(){ float a = 0.13 * pow(vT, 2.0); gl_FragColor = vec4(color * a, a); }'
  })
  const haloTex = glowTexture()
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, color: 0xfff1c8, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  const towers = [], lightPos = []
  const aim = new THREE.Vector3(0, 0, 22)
  for (const [x, z, h] of [[-17, -64, 30], [17, -64, 30], [-62, 126, 40], [62, 126, 40]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.9, h, 8), pole); p.position.set(x, h / 2, z); g.add(p)
    const head = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 0.9), lamp); head.position.set(x, h, z); head.lookAt(aim); g.add(head); towers.push(head)
    const halo = new THREE.Sprite(haloMat); halo.position.copy(head.position); halo.scale.set(13, 13, 1); g.add(halo)
    // cono: apice sulla testa, base verso il campo (lunghezza = distanza dal punto mirato)
    const dir = aim.clone().sub(head.position), len = dir.length()
    const cone = new THREE.Mesh(new THREE.ConeGeometry(9, len, 20, 1, true), beamMat)
    cone.geometry.translate(0, -len / 2, 0) // apice nell'origine, cono verso -y
    cone.position.copy(head.position); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize()); g.add(cone)
    lightPos.push(new THREE.Vector3(x, h, z))
  }
  // Cielo: sfera con gradiente notturno scuro (niente blu piatto) e stelle non toccate dalla nebbia
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x04060d) }, mid: { value: new THREE.Color(0x0e1530) }, bottom: { value: new THREE.Color(0x1a2447) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); vec3 c = h < 0.18 ? mix(bottom, mid, h / 0.18) : mix(mid, top, (h - 0.18) / 0.82); gl_FragColor = vec4(c, 1.0); }'
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 24, 12), skyMat); sky.position.z = 30; g.add(sky)
  const N = 700, sp = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - Math.random() * 0.9); const r = 300; sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 25; sp[i * 3 + 2] = 30 + r * Math.sin(ph) * Math.sin(th) }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.1, sizeAttenuation: true, fog: false }))
  g.add(stars)
  return { group: g, towers, lightPos, aim }
}
