// Calibra lo spostamento della radice del portiere per ogni direzione di tuffo, MISURANDO.
// Per ogni direzione si spara un ventaglio di tiri verso il centro di quel settore e si cerca lo spostamento
// fisso (x, y) che porta il corpo del portiere davvero sulla palla. È una costante per direzione, non un
// inseguimento: lo stesso numero vale per tutti i tiri di quella direzione.
//   node scripts/qa/rigori-calibra.mjs        (poi: npm run reach, per rimisurare le pose)
import { writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { buildShotRecord } from '../../src/rigori/game/shot.js'
import { createKeeper, zoneCenter } from '../../src/rigori/game/keeper.js'
import { posaReach, distanzaSegmento, SEGMENTI, DIVE_DUR, FRAZIONE_MINIMA, RAGGIO_CAPSULA } from '../../src/rigori/game/copertura.js'
import { TUFFI } from '../../src/rigori/data/tuffi.js'

const stub = () => ({ group: new THREE.Group(), model: new THREE.Object3D(), mixer: { update() {} }, big: { mani: {}, ossa: {}, piedi: {} }, play() {}, scrub() {}, stopAll() {}, setLean() {}, update() {}, get currentAction() { return null } })
const keeper = createKeeper(stub(), { difficulty: 'normale' })
const NOMI = ['alto sx', 'alto centro', 'alto dx', 'basso sx', 'basso centro', 'basso dx']
const TUFFO = (z) => z % 3 !== 1   // solo i laterali possono staccarsi da terra

// Distanza minima fra i voli e le capsule, con la posa spostata di (dx, dy)
const scarto = (zona, voli, dx, dy) => {
  let somma = 0
  for (const { volo, tDive } of voli) {
    let min = Infinity
    const tMin = tDive + FRAZIONE_MINIMA * DIVE_DUR
    for (let i = 0; i < volo.punti.length; i++) {
      const t = i * volo.dt
      if (t < tMin) continue
      const u = THREE.MathUtils.clamp((t - tDive) / DIVE_DUR, 0, 1)
      const posa = posaReach(zona, u)
      for (const k of Object.keys(posa)) posa[k].x += dx * u, posa[k].y += dy * u
      for (const [a, b] of SEGMENTI) { const d = distanzaSegmento(volo.punti[i], posa[a], posa[b]); if (d < min) min = d }
    }
    somma += Math.min(min, 1.5)
  }
  return somma / voli.length
}

const nuovo = {}
console.log('| Direzione | alzata | distanza media prima | dopo |')
console.log('|---|---|---|---|')
for (let z = 0; z < 6; z++) {
  const c = zoneCenter(z)
  const voli = []
  for (let i = 0; i < 12; i++) {
    keeper.force(z); keeper.reset()
    const rec = buildShotRecord({ aim: { x: c.x + ((i % 5) - 2) * 0.14, y: c.y + ((i % 4) - 1.5) * 0.14, power: 0.45 + (i % 6) * 0.09, curve: 0 }, precision: 0, keeper, seed: 5000 + i * 7 })
    if (rec.volo) voli.push({ volo: rec.volo, tDive: rec.keeper.reactionDelay })
  }
  // Si calibra SOLO l'alzata: il rientro laterale è analitico (lo calcola keeper.js dalla larghezza della
  // porta) e resta simmetrico per costruzione.
  const prima = scarto(z, voli, 0, 0)
  let best = { d: prima, dy: 0 }
  for (let dy = 0; dy <= (TUFFO(z) ? 0.50001 : 0.0001); dy += 0.025) {
    const d = scarto(z, voli, 0, dy)
    if (d < best.d - 1e-6) best = { d, dy }
  }
  const y = +Math.min(0.5, TUFFI[z].y + best.dy).toFixed(3)
  nuovo[z] = { y, prima, dopo: best.d }
  console.log(`| ${NOMI[z]} | ${y} m | ${prima.toFixed(3)} m | ${best.d.toFixed(3)} m |`)
}
// sinistra e destra sono la stessa posa specchiata: l'alzata deve essere identica
for (const [a, b] of [[0, 2], [3, 5]]) { const y = Math.max(nuovo[a].y, nuovo[b].y); nuovo[a].y = y; nuovo[b].y = y }
const testo = `// GENERATO da scripts/qa/rigori-calibra.mjs — non scrivere questi numeri a mano.
// Spostamento fisso della radice del portiere per ogni direzione di tuffo, in metri:
//   y  di quanto la radice si stacca da terra (solo tuffi; parte e finisce coi piedi a terra, culmine a 4/5).
// Lo spostamento laterale NON sta qui: lo calcola keeper.js dalla larghezza della porta, così resta simmetrico.
// Non dipendono dal tiro: sono una proprietà della direzione, identica a ogni rigore. Raggio capsula ${RAGGIO_CAPSULA} m.
export const TUFFI = {
${[0, 1, 2, 3, 4, 5].map((z) => `  ${z}: { y: ${nuovo[z].y} }${z < 5 ? ',' : ''}   // ${NOMI[z]}`).join('\n')}
}
`
writeFileSync('src/rigori/data/tuffi.js', testo)
console.log('\nscritto src/rigori/data/tuffi.js — ora rilancia: npm run reach')
