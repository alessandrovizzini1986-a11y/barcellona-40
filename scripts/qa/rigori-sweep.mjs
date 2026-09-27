// Sweep dell'equilibrio in node (blocco 3): per una distribuzione dei tiri di Ale (centro / laterali bassi / alti)
// misura quante ne para chi indovina la zona, quante ne segna Ale contro un tuffo a caso e contro chi legge il
// tell (60 % lato vero), e stima le vittorie di uno Shootout con chi tira e segna il 63,6 % (gate).
//   node scripts/qa/rigori-sweep.mjs [centro,laterali,alti ...]
import * as THREE from 'three'
import { buildShotRecord, sealShotRecord } from '../../src/rigori/game/shot.js'
import { createKeeper } from '../../src/rigori/game/keeper.js'
import { makeRng } from '../../src/rigori/core/rng.js'
import { GOAL } from '../../src/rigori/scene/net.js'
const stubChar = () => ({ group: new THREE.Group(), model: new THREE.Object3D(), mixer: { update() {} }, big: { mani: {}, ossa: {}, piedi: {} }, play() {}, scrub() {}, stopAll() {}, setLean() {}, update() {}, get currentAction() { return null } })
const keeper = createKeeper(stubChar(), { difficulty: 'normale' }); keeper.setPlayable(true)
const zonaDi = (x, y) => (y > GOAL.h * 0.47 ? 0 : 3) + (x < -GOAL.w / 6 ? 0 : x > GOAL.w / 6 ? 2 : 1)
// stessa forma di cpuAim in base.js, con la distribuzione come parametro
function mira(rnd, [pc, pl]) {
  const cols = [-GOAL.w * 0.348, 0, GOAL.w * 0.348]
  const r = rnd(); let col, y
  if (r < pc) { col = 1; y = GOAL.h * (0.22 + rnd() * 0.33) }
  else if (r < pc + pl) { col = rnd() < 0.5 ? 0 : 2; y = GOAL.h * (0.225 + (rnd() - .5) * 0.143) }
  else { col = (rnd() * 3) | 0; y = GOAL.h * (0.758 + (rnd() - .5) * 0.143) }
  return { x: cols[col] + (rnd() - .5) * GOAL.w * 0.082, y, power: 0.65 + rnd() * 0.4, curve: (rnd() - .5) * 0.5 }
}
function tiro(aim, zonaTuffo, tDive, seed) {
  const rec = buildShotRecord({ aim, precision: 0.6, keeper, seed })
  rec.keeper = keeper.playerDecision(zonaTuffo, Math.min(tDive, rec.contactTime)); sealShotRecord(rec, keeper)
  return rec.outcome
}
const bin = (n, p, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * Math.pow(p, k) * Math.pow(1 - p, n - k) }
function vittorie(pm, pa) { let win = 0, tie = 0; for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) { const pr = bin(5, pm, a) * bin(5, pa, b); if (a > b) win += pr; else if (a === b) tie += pr } const w1 = pm * (1 - pa), l1 = (1 - pm) * pa; return win + tie * (w1 / (w1 + l1)) }
const mix = process.argv.slice(2).length ? process.argv.slice(2).map((s) => s.split(',').map(Number)) : [[40, 35, 25], [40, 25, 35], [35, 25, 40], [30, 25, 45], [45, 20, 35], [30, 30, 40], [25, 30, 45]]
const N = 600
const TD = +(process.env.TD || 0.25) // istante del tuffo dal calcio: 0 = deciso sul tell, prima del calcio
console.log(`tuffo a ${TD} s dal calcio`)
console.log('| centro / lat. bassi / alti | para indovinando | Ale segna (caso) | Ale segna (legge il tell) | Shootout vinto (stima) |\n|---|---|---|---|---|')
for (const [c, l, h] of mix) {
  const d = [c / 100, l / 100]; const rnd = makeRng(4242)
  let indov = 0, caso = 0, tell = 0
  for (let i = 0; i < N; i++) {
    const aim = mira(rnd, d), z = zonaDi(aim.x, aim.y)
    if (tiro(aim, z, TD, 500000 + i) === 'save') indov++
    if (tiro(aim, (i * 7 + 3) % 6, 0, 600000 + i) === 'goal') caso++
    // legge il tell: lato vero il 60 % delle volte, altrimenti l'altro lato; riga a caso; tuffo a 250 ms
    const lato = Math.sign(aim.x) || 1, side = rnd() < 0.6 ? lato : -lato
    const zt = (rnd() < 0.5 ? 0 : 3) + (side < 0 ? 0 : 2)
    if (tiro(aim, zt, TD, 700000 + i) === 'goal') tell++
  }
  const pa = tell / N
  console.log(`| ${c} / ${l} / ${h} | ${(100 * indov / N).toFixed(0)} % | ${(100 * caso / N).toFixed(0)} % | ${(100 * pa).toFixed(0)} % | ${(100 * vittorie(0.636, pa)).toFixed(0)} % |`)
}
