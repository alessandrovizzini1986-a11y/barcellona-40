import * as THREE from 'three'
import { netTexture } from './textures.js'
// Porta 7,32 × 2,44. La rete è un tessuto verlet: i bordi che toccano pali, traversa e terreno sono fissi,
// l'impatto della palla gonfia i nodi vicini e i vincoli di distanza la riportano a riposo.
// PORTA IN SCALA COI PERSONAGGI, non regolamentare. I "big head" sono alti ~1,5 m equivalenti: contro una
// porta da 7,32 × 2,44 il portiere non copriva fisicamente lo specchio e ogni tiro laterale era gol, per
// geometria e non per taratura. Qui è 4,60 × 1,90, cioè il portiere in piedi occupa circa un terzo della
// larghezza e in tuffo arriva vicino al palo. Tutto il resto (zone, mira, camere, campo) deriva da qui.
// 4,40 × 1,82: partito da 4,60 come da indicazione, ridotto di un passo perché a 4,60 i gol erano il 70,5 %,
// cioè al limite della fascia chiesta (60-70 %); a 4,40 sono il 62,5 %. La misura è in QA_REPORT.md.
export const GOAL = { w: 4.40, h: 1.82, depth: 1.40, post: 0.10 }
export const DISCHETTO = 8.5 // distanza del dischetto dalla linea di porta, in metri
const PASSO = 1 / 60      // passo fisso: il gonfiore non deve dipendere dal frame rate
const MAX_PASSI = 4       // dopo un blocco lungo si scarta il tempo arretrato invece di recuperarlo tutto
const FINESTRA = 1.5      // il cloth vive solo 1,5 s dall'impulso: fuori da lì la rete è ferma e non costa nulla
const SMORZ = 0.92        // smorzamento verlet: la rete è corda bagnata, non una molla
const GRAVITA = 0.5       // debole: dà un filo di cedimento al tessuto senza farlo colare in 1,5 s
const RICHIAMO = 0.03     // richiamo verso il riposo: a fine finestra la rete è già piatta, così il rientro non fa scatto
const RAGGIO = 0.4        // raggio d'influenza dell'impulso, in metri (tasca larga quanto un pallone)
const NODI_MIN = 2.5      // ...ma mai meno di 2,5 maglie: con la griglia dimezzata 0,4 m prendeva 4 nodi su 171,
                          // cioè una punta su un vertice invece di una tasca. Il picco resta `amp`: cambia la larghezza.
const ITER = 2            // due passate di vincoli bastano: le maglie sono piccole e lo smorzamento alto
const MAGLIA = 0.12       // lato della maglia in metri: fissa il repeat della texture, non la suddivisione
export function createGoal() {
  const g = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .05 })
  const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post, GOAL.post, GOAL.h + GOAL.post, 16), white); m.position.set(x, (GOAL.h + GOAL.post) / 2, 0); m.castShadow = true; g.add(m); return m }
  post(-GOAL.w / 2); post(GOAL.w / 2)
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post, GOAL.post, GOAL.w + GOAL.post * 2, 16), white)
  bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL.h + GOAL.post, 0); g.add(bar)
  const back = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(GOAL.post * .6, GOAL.post * .6, GOAL.depth, 10), white); m.rotation.x = Math.PI / 2; m.position.set(x, 0.05, -GOAL.depth / 2); g.add(m) }
  back(-GOAL.w / 2); back(GOAL.w / 2)
  const tex = netTexture()
  // DoubleSide: la rete deve vedersi anche da dietro la porta (replay esterni); depthWrite false per non ritagliare la palla dentro la gabbia
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: .7 })
  // Lo spessore del filo è nella texture alpha: a differenza di LineSegments non si assottiglia con la distanza
  const centro = new THREE.Vector3(0, GOAL.h / 2, -GOAL.depth / 2)
  const gravita = new THREE.Vector3(0, -GRAVITA, 0)
  const local = new THREE.Vector3(), tmp = new THREE.Vector3(), quat = new THREE.Quaternion()
  const panels = []
  let qual = 1, attivo = false, tempo = 0, acc = 0, ampMax = 0
  // Suddivisione piena: il fondo prende la palla quasi sempre ed è il più largo, quindi ha la griglia più fitta
  const definizioni = [
    { w: GOAL.w, h: GOAL.h, sw0: 26, sh0: 16, set: (m) => { m.position.set(0, GOAL.h / 2, -GOAL.depth) } },
    { w: GOAL.depth, h: GOAL.h, sw0: 12, sh0: 16, set: (m) => { m.rotation.y = Math.PI / 2; m.position.set(-GOAL.w / 2, GOAL.h / 2, -GOAL.depth / 2) } },
    { w: GOAL.depth, h: GOAL.h, sw0: 12, sh0: 16, set: (m) => { m.rotation.y = -Math.PI / 2; m.position.set(GOAL.w / 2, GOAL.h / 2, -GOAL.depth / 2) } },
    { w: GOAL.w, h: GOAL.depth, sw0: 26, sh0: 12, set: (m) => { m.rotation.x = Math.PI / 2; m.position.set(0, GOAL.h, -GOAL.depth / 2) } }
  ]
  // (Ri)costruisce geometria e stato del cloth di un pannello: l'unico punto in cui si alloca
  const costruisci = (p) => {
    const sw = Math.max(2, Math.round(p.sw0 * qual)), sh = Math.max(2, Math.round(p.sh0 * qual))
    const geo = new THREE.PlaneGeometry(p.w, p.h, sw, sh)
    if (p.mesh.geometry) p.mesh.geometry.dispose()
    p.mesh.geometry = geo
    p.sw = sw; p.sh = sh; p.dx = p.w / sw; p.dy = p.h / sh
    p.raggio = Math.max(RAGGIO, NODI_MIN * Math.max(p.dx, p.dy))
    p.pos = geo.attributes.position.array            // lavoro direttamente sull'attributo: niente copie a ogni frame
    p.rest = p.pos.slice(); p.prev = p.pos.slice()
    p.fissi = new Uint8Array(geo.attributes.position.count)
    // i quattro bordi del pannello poggiano su palo, traversa, terreno o sul pannello adiacente: sono ancoraggi
    for (let iy = 0; iy <= sh; iy++) for (let ix = 0; ix <= sw; ix++) if (ix === 0 || iy === 0 || ix === sw || iy === sh) p.fissi[iy * (sw + 1) + ix] = 1
  }
  for (const d of definizioni) {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mat.clone())
    m.material.map = tex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(d.w / MAGLIA, d.h / MAGLIA)
    d.set(m); m.frustumCulled = false // la geometria si deforma: la sfera di contenimento calcolata a riposo non vale più
    g.add(m)
    const p = { ...d, mesh: m }
    // verso di gonfiaggio: la normale locale +z puntata via dal centro della gabbia, così ogni pannello si gonfia verso fuori
    tmp.set(0, 0, 1).applyQuaternion(m.quaternion)
    p.segno = tmp.dot(local.copy(m.position).sub(centro)) > 0 ? 1 : -1
    // gravità in coordinate locali: sul tetto il "giù" del mondo è un'altra direzione del piano
    tmp.copy(gravita).applyQuaternion(quat.copy(m.quaternion).invert())
    p.gx = tmp.x; p.gy = tmp.y; p.gz = tmp.z
    costruisci(p); panels.push(p)
  }
  // Peso dell'impulso sul nodo i: coseno alzato, così i nodi centrali prendono quasi tutta l'ampiezza
  const peso = (p, i, q) => {
    const k = i * 3, dx = p.rest[k] - q.x, dy = p.rest[k + 1] - q.y, dz = p.rest[k + 2] - q.z
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    return d >= p.raggio ? 0 : 0.5 * (1 + Math.cos(Math.PI * d / p.raggio))
  }
  // Un vincolo di distanza: il nodo fisso non si muove, l'altro si prende tutta la correzione
  const vincolo = (p, a, b, len) => {
    const pos = p.pos, ka = a * 3, kb = b * 3
    const dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d < 1e-9) return
    const fa = p.fissi[a], fb = p.fissi[b]
    if (fa && fb) return
    const c = (d - len) / d, wa = fa ? 0 : (fb ? 1 : 0.5), wb = fb ? 0 : (fa ? 1 : 0.5)
    pos[ka] += dx * c * wa; pos[ka + 1] += dy * c * wa; pos[ka + 2] += dz * c * wa
    pos[kb] -= dx * c * wb; pos[kb + 1] -= dy * c * wb; pos[kb + 2] -= dz * c * wb
  }
  // Un passo verlet a dt fisso: integrazione, vincoli, misura dell'ampiezza
  const passo = (p) => {
    const pos = p.pos, prev = p.prev, rest = p.rest, fissi = p.fissi, n = fissi.length
    const ax = p.gx * PASSO * PASSO, ay = p.gy * PASSO * PASSO, az = p.gz * PASSO * PASSO
    for (let i = 0; i < n; i++) {
      if (fissi[i]) continue
      const k = i * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2]
      pos[k] = x + (x - prev[k]) * SMORZ + ax + (rest[k] - x) * RICHIAMO
      pos[k + 1] = y + (y - prev[k + 1]) * SMORZ + ay + (rest[k + 1] - y) * RICHIAMO
      pos[k + 2] = z + (z - prev[k + 2]) * SMORZ + az + (rest[k + 2] - z) * RICHIAMO
      prev[k] = x; prev[k + 1] = y; prev[k + 2] = z
    }
    const riga = p.sw + 1
    for (let it = 0; it < ITER; it++) {
      for (let iy = 0; iy <= p.sh; iy++) for (let ix = 0; ix <= p.sw; ix++) {
        const i = iy * riga + ix
        if (ix < p.sw) vincolo(p, i, i + 1, p.dx)
        if (iy < p.sh) vincolo(p, i, i + riga, p.dy)
      }
    }
    for (let i = 0; i < n; i++) {
      const k = i * 3, dx = pos[k] - rest[k], dy = pos[k + 1] - rest[k + 1], dz = pos[k + 2] - rest[k + 2]
      const d = dx * dx + dy * dy + dz * dz
      if (d > ampMax) ampMax = d                     // quadrato: la radice si fa una volta sola in ampiezzaMax()
    }
  }
  // Rientro immediato: usato anche a fine finestra, perciò non tocca la misura dell'ampiezza
  const fermo = () => {
    for (const p of panels) { p.pos.set(p.rest); p.prev.set(p.rest); p.mesh.geometry.attributes.position.needsUpdate = true }
    attivo = false; tempo = 0; acc = 0
  }
  const impulso = (punto, velocita = 15) => {
    g.updateMatrixWorld(true)
    // ampiezza chiesta: 15 m/s ≈ 23 cm, 30 m/s ≈ 41 cm
    const amp = 0.05 + 0.012 * Math.max(0, velocita)
    let wmax = 0
    // prima passata solo per normalizzare: il nodo più vicino all'impatto deve prendere esattamente `amp`,
    // altrimenti l'ampiezza dipenderebbe da dove cade il punto dentro la maglia
    for (const p of panels) {
      local.copy(punto); p.mesh.worldToLocal(local)
      for (let i = 0; i < p.fissi.length; i++) { if (p.fissi[i]) continue; const w = peso(p, i, local); if (w > wmax) wmax = w }
    }
    if (wmax <= 0) return
    ampMax = 0
    for (const p of panels) {
      local.copy(punto); p.mesh.worldToLocal(local)
      const pos = p.pos, prev = p.prev, rest = p.rest
      for (let i = 0; i < p.fissi.length; i++) {
        if (p.fissi[i]) continue
        const w = peso(p, i, local); if (w <= 0) continue
        const off = p.segno * amp * (w / wmax), k = i * 3
        pos[k + 2] += off; prev[k + 2] += off        // sposto anche prev: la spinta è una deformazione, la velocità nasce dal rientro
        const dx = pos[k] - rest[k], dy = pos[k + 1] - rest[k + 1], dz = pos[k + 2] - rest[k + 2]
        const d = dx * dx + dy * dy + dz * dz
        if (d > ampMax) ampMax = d
      }
      p.mesh.geometry.attributes.position.needsUpdate = true
    }
    attivo = true; tempo = 0; acc = 0
  }
  return {
    group: g,
    update(dt) {
      if (!attivo) return                            // fuori dalla finestra non si calcola niente
      tempo += dt
      if (tempo >= FINESTRA) { fermo(); return }
      acc += dt
      let n = 0
      while (acc >= PASSO && n < MAX_PASSI) { for (const p of panels) passo(p); acc -= PASSO; n++ }
      if (acc >= PASSO) acc = 0                      // frame lunghissimo: si scarta l'arretrato invece di rincorrerlo
      if (n) for (const p of panels) p.mesh.geometry.attributes.position.needsUpdate = true
    },
    // Impulso della palla: `punto` in coordinate mondo, `velocita` il modulo dell'urto in m/s
    impulso,
    // Alias storico: `forza` è il vecchio 0..1 (min(1, v/8) al contatto con la rete), lo riporto a m/s
    punch(punto, forza = 0.9) { impulso(punto, Math.min(30, Math.max(2, forza * 15))) },
    // Suddivisione piena a 1, dimezzata a 0.5: la chiama perf.js quando scende sotto i 45 fps
    setQualita(n) {
      const q = n >= 1 ? 1 : 0.5
      if (q === qual) return
      qual = q
      for (const p of panels) costruisci(p)
      fermo()
    },
    // Spostamento massimo toccato dai nodi dall'ultimo impulso, in metri
    ampiezzaMax() { return Math.sqrt(ampMax) },
    // Diagnostica (QA): dove cade l'impulso nelle coordinate locali di ogni pannello e quanti nodi mobili
    // ci sono dentro il raggio d'influenza. Se qui esce zero ovunque, l'impulso non può gonfiare niente.
    diagnostica(punto) {
      g.updateMatrixWorld(true)
      return panels.map((p, i) => {
        local.copy(punto); p.mesh.worldToLocal(local)
        let dentro = 0, wmax = 0
        for (let k = 0; k < p.fissi.length; k++) {
          if (p.fissi[k]) continue
          const w = peso(p, k, local); if (w > 0) dentro++
          if (w > wmax) wmax = w
        }
        let spostamento = 0
        for (let k = 0; k < p.fissi.length; k++) {
          const j = k * 3
          const d = Math.hypot(p.pos[j] - p.rest[j], p.pos[j + 1] - p.rest[j + 1], p.pos[j + 2] - p.rest[j + 2])
          if (d > spostamento) spostamento = d
        }
        return { pannello: i, locale: [+local.x.toFixed(3), +local.y.toFixed(3), +local.z.toFixed(3)], nodiNelRaggio: dentro, mobili: p.fissi.length - p.fissi.reduce((a, b) => a + b, 0), peso: +wmax.toFixed(3), spostamentoOra: +spostamento.toFixed(4) }
      })
    },
    get attivo() { return attivo },
    riposo() { fermo(); ampMax = 0 }
  }
}
