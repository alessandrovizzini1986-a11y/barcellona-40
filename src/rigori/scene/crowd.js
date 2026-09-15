import * as THREE from 'three'
// Pubblico: una sola InstancedMesh, colori per istanza, ola al gol e "oooh" (abbassamento) sulla parata.
export function createCrowd(count = 2600) {
  const geo = new THREE.BoxGeometry(0.5, 0.9, 0.35)
  const mat = new THREE.MeshStandardMaterial({ roughness: .9 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const base = new Float32Array(count * 3), phase = new Float32Array(count)
  const palette = [0xA50044, 0x004D98, 0xF2B705, 0xF2E9DE, 0x2CA6A4, 0xE8552E, 0x3D5A80, 0x8b1d3a]
  const m = new THREE.Matrix4(), col = new THREE.Color()
  const cx = 0, cz = 30, halfW = 48, halfD = 62
  let i = 0
  const place = (x, y, z) => { base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z; phase[i] = Math.random() * Math.PI * 2; m.makeTranslation(x, y, z); mesh.setMatrixAt(i, m); mesh.setColorAt(i, col.setHex(palette[(Math.random() * palette.length) | 0])); i++ }
  const rows = 3, perSide = Math.floor(count / 4 / rows)
  for (let t = 0; t < rows && i < count; t++) {
    const off = t * 7, y = 3.2 + t * 3.2 + 0.7
    for (let k = 0; k < perSide && i < count; k++) {
      const u = (k + 0.5) / perSide
      place(cx - halfW - off + u * (halfW + off) * 2, y, cz - halfD - off + 2)   // fondo
      if (i < count) place(cx - halfW - off + u * (halfW + off) * 2, y, cz + halfD + off - 2)
      if (i < count) place(cx - halfW - off + 2, y, cz - halfD - off + u * (halfD + off) * 2)
      if (i < count) place(cx + halfW + off - 2, y, cz - halfD - off + u * (halfD + off) * 2)
    }
  }
  mesh.count = i
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  let mode = 'idle', t = 0
  return {
    mesh,
    react(kind) { mode = kind; t = 0 }, // 'ola' | 'oooh' | 'idle'
    setDensity(f) { mesh.count = Math.max(200, Math.floor(i * f)) },
    update(dt) {
      t += dt
      const n = mesh.count
      for (let k = 0; k < n; k++) {
        let y = base[k * 3 + 1]
        if (mode === 'ola') { const w = Math.sin(t * 3.5 - base[k * 3] * 0.06 - base[k * 3 + 2] * 0.03); y += Math.max(0, w) * 0.7; if (t > 4) mode = 'idle' }
        else if (mode === 'oooh') { y -= Math.min(0.35, t * 2); if (t > 1.6) mode = 'idle' }
        else y += Math.sin(t * 1.8 + phase[k]) * 0.03
        m.makeTranslation(base[k * 3], y, base[k * 3 + 2]); mesh.setMatrixAt(k, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }
}
