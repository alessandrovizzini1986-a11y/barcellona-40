import * as THREE from 'three'
// Pubblico: una InstancedMesh di piccole capsule (uno spettatore ciascuna) su 8 file per lato, colori dalla palette.
// Bob verticale con fase casuale, ola al gol con braccia alzate (scala Y), "oooh" (abbassamento) sulla parata.
// Dietro l'ultima fila: pannello scuro con i telefoni accesi (Points con tremolio).
export const STAND = { cx: 0, cz: 30, halfW: 48, halfD: 62, rows: 8, rise: 0.95, depth: 1.5, y0: 2.2 }
const PALETTE = [0xA50044, 0x004D98, 0xA50044, 0x004D98, 0xE8552E, 0xF2B705, 0xF2E9DE, 0x7d0a36, 0x0a3a70]
export function createCrowd(count = 6400) {
  const S = STAND
  const geo = new THREE.CapsuleGeometry(0.22, 0.42, 1, 5)
  geo.translate(0, 0.43, 0) // i piedi sul gradino: la scala Y (braccia alzate) parte da terra
  const mat = new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.06 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false
  const base = new Float32Array(count * 3), phase = new Float32Array(count), wave = new Float32Array(count)
  const m = new THREE.Matrix4(), col = new THREE.Color()
  let i = 0
  const place = (x, y, z, w) => {
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z; phase[i] = Math.random() * Math.PI * 2; wave[i] = w
    const ry = Math.random() * 0.6 - 0.3
    m.makeRotationY(ry); m.setPosition(x, y, z); mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, col.setHex(PALETTE[(Math.random() * PALETTE.length) | 0]).multiplyScalar(0.8 + Math.random() * 0.25)); i++
  }
  // ogni fila: quattro lati; la "wave" è l'ascissa lungo il perimetro, usata dall'ola
  const perim = 2 * (S.halfW * 2) + 2 * (S.halfD * 2)
  const perRow = Math.floor(count / S.rows)
  for (let r = 0; r < S.rows && i < count; r++) {
    const off = S.depth * (r + 0.5), y = S.y0 + r * S.rise
    const w = S.halfW + off, d = S.halfD + off
    const nSide = Math.round(perRow * (w * 2) / (perim + 8 * off)), nEnd = Math.round(perRow * (d * 2) / (perim + 8 * off))
    for (let k = 0; k < nSide && i < count; k++) { const u = (k + 0.5) / nSide, x = S.cx - w + u * w * 2 + (Math.random() - .5) * 0.2; place(x, y, S.cz - d, u * w * 2); if (i < count) place(x, y, S.cz + d, perim / 2 + u * w * 2) }
    for (let k = 0; k < nEnd && i < count; k++) { const u = (k + 0.5) / nEnd, z = S.cz - d + u * d * 2 + (Math.random() - .5) * 0.2; place(S.cx - w, y, z, perim - u * d * 2); if (i < count) place(S.cx + w, y, z, w * 2 + u * d * 2) }
  }
  mesh.count = i
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  const total = i
  // Telefoni accesi sul pannello dietro l'ultima fila
  const phones = createPhones(S)
  let mode = 'idle', t = 0
  const e = m.elements
  return {
    mesh, phones: phones.points,
    react(kind) { mode = kind; t = 0 }, // 'ola' | 'oooh' | 'idle'
    setDensity(f) { mesh.count = Math.max(400, Math.floor(total * f)) },
    update(dt) {
      t += dt; phones.update(t)
      const n = mesh.count
      for (let k = 0; k < n; k++) {
        const bx = base[k * 3], by = base[k * 3 + 1], bz = base[k * 3 + 2]
        let y = by, sy = 1
        if (mode === 'ola') {
          // onda che corre lungo il perimetro + tutti alzano le braccia (scala Y) nei primi due secondi
          const w = Math.sin(t * 2.6 - wave[k] * 0.045 + phase[k] * 0.15)
          y += Math.max(0, w) * 0.55
          sy = 1 + Math.max(0, Math.sin(Math.min(Math.PI, Math.max(0, t * 2.2 - phase[k] * 0.12)))) * 0.38
          if (t > 4.2) mode = 'idle'
        } else if (mode === 'oooh') { y -= Math.min(0.3, t * 1.6); sy = 0.92; if (t > 1.6) mode = 'idle' }
        else y += Math.sin(t * 1.9 + phase[k]) * 0.035
        // scrittura diretta della matrice: traslazione + scala Y (nessuna rotazione per restare economici)
        e[0] = 1; e[5] = sy; e[10] = 1; e[12] = bx; e[13] = y; e[14] = bz
        e[1] = e[2] = e[4] = e[6] = e[8] = e[9] = 0; e[3] = e[7] = e[11] = 0; e[15] = 1
        mesh.setMatrixAt(k, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }
}
// Punti luminosi (telefoni) sparsi sul pannello scuro dietro le gradinate, con tremolio individuale
function createPhones(S, n = 1800) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), colors = new Float32Array(n * 3)
  const back = S.depth * (S.rows + 0.6), yTop = S.y0 + S.rows * S.rise, h = 9
  const c = new THREE.Color()
  for (let i = 0; i < n; i++) {
    const side = (Math.random() * 4) | 0, u = Math.random(), y = yTop + 0.6 + Math.random() * h
    const w = S.halfW + back, d = S.halfD + back
    if (side === 0) { pos[i * 3] = S.cx - w + u * w * 2; pos[i * 3 + 2] = S.cz - d } else if (side === 1) { pos[i * 3] = S.cx - w + u * w * 2; pos[i * 3 + 2] = S.cz + d } else if (side === 2) { pos[i * 3] = S.cx - w; pos[i * 3 + 2] = S.cz - d + u * d * 2 } else { pos[i * 3] = S.cx + w; pos[i * 3 + 2] = S.cz - d + u * d * 2 }
    pos[i * 3 + 1] = y; ph[i] = Math.random() * Math.PI * 2
    c.setHSL(0.55 + Math.random() * 0.12, 0.35, 0.75 + Math.random() * 0.2); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float phase; varying vec3 vC; varying float vA; uniform float time;
      void main(){ vC = color; float tw = 0.55 + 0.45 * sin(time * 2.3 + phase * 3.0); vA = tw;
      vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (1.0 + 0.9 * tw) * (80.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * 1.3, (1.0 - d * 2.0) * vA * 0.7); }`,
    vertexColors: true
  })
  const points = new THREE.Points(g, mat); points.frustumCulled = false
  return { points, update(t) { mat.uniforms.time.value = t } }
}
