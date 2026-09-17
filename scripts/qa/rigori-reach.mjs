// Misura, dal modello, dove arrivano davvero i guanti del portiere lungo il tuffo di ognuna delle 6 direzioni.
// Genera src/rigori/data/reach.js, che è la SOLA sorgente della zona coperta: la geometria non si scrive a mano.
//   node scripts/qa/rigori-reach.mjs [url]
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await (await b.newContext({ viewport: { width: 380, height: 820 } })).newPage()
const errori = []
p.on('pageerror', (e) => errori.push(String(e.message)))
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
await p.evaluate(() => window.__rigori.kitReady)
const N = 12
const dati = await p.evaluate(async (N) => {
  const R = window.__rigori, k = R.keeper(), THREE = R.game.THREE
  const char = Object.values(R.chars).find((c) => c.group === k.group)
  const big = char.big
  const w = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)] }
  const out = []
  for (let zona = 0; zona < 6; zona++) {
    const dec = { ...k.playerDecision(zona, 0), reactionDelay: 0 }
    const campioni = []
    for (let i = 0; i <= N; i++) {
      const u = i / N
      k.renderAt(dec, u * R.DIVE_DUR, 1, false)
      char.update(0); k.group.updateMatrixWorld(true)
      campioni.push({ u: +u.toFixed(4), L: w(big.mani.Left), R: w(big.mani.Right), sL: w(big.ossa.LeftArm), sR: w(big.ossa.RightArm),
        aL: w(big.ossa.LeftUpLeg), aR: w(big.ossa.RightUpLeg), fL: w(big.piedi.Left), fR: w(big.piedi.Right),
        piedi: +Math.min(w(big.piedi.Left)[1], w(big.piedi.Right)[1]).toFixed(4) })
    }
    out.push({ zona, clip: dec.clip, mirror: dec.mirror, campioni })
  }
  k.reset()
  return { zone: out, DIVE_DUR: R.DIVE_DUR }
}, N)
await b.close()
if (errori.length) { console.error('ERRORI DI PAGINA:\n' + errori.join('\n')); process.exit(1) }
const riga = (v) => `[${v.map((n) => n.toFixed(3)).join(', ')}]`
const corpo = dati.zone.map((z) => `  // ${['alto sx', 'alto centro', 'alto dx', 'basso sx', 'basso centro', 'basso dx'][z.zona]} — clip ${z.clip}, specchiata ${z.mirror}
  ${z.zona}: [
${z.campioni.map((c) => `    { u: ${c.u}, L: ${riga(c.L)}, R: ${riga(c.R)}, sL: ${riga(c.sL)}, sR: ${riga(c.sR)}, aL: ${riga(c.aL)}, aR: ${riga(c.aR)}, fL: ${riga(c.fL)}, fR: ${riga(c.fR)}, piedi: ${c.piedi.toFixed(3)} }`).join(',\n')}
  ]`).join(',\n')
const testata = `// GENERATO da scripts/qa/rigori-reach.mjs — non scrivere questi numeri a mano.
// Dove arrivano DAVVERO i guanti del portiere, misurati sul modello lungo il tuffo di ogni direzione.
// u va da 0 (via) a 1 (tuffo concluso, cioè DIVE_DUR secondi dopo). Per ogni campione: posizione mondo dei due
// guanti (L, R), delle spalle (sL, sR), delle anche (aL, aR), dei piedi (fL, fR) e altezza del piede più basso.
// Il portiere para col guanto ma anche col corpo: i segmenti sono guanto→spalla, spalla→anca e anca→piede.
// La zona coperta da una direzione è la capsula guanto→spalla di raggio RAGGIO_CAPSULA: è l'unica geometria
// che decide se un tiro è parato. Nessuna zona astratta, nessun bonus.
export const RAGGIO_CAPSULA = 0.25
export const REACH = {
${corpo}
}
// Riassunto misurato (serve a capire cosa il portiere NON può raggiungere):
${dati.zone.map((z) => {
  const ys = z.campioni.flatMap((c) => [c.L[1], c.R[1]]), xs = z.campioni.flatMap((c) => [c.L[0], c.R[0]])
  return `//   zona ${z.zona}: |x| fino a ${Math.max(...xs.map(Math.abs)).toFixed(2)} m, y fino a ${Math.max(...ys).toFixed(2)} m`
}).join('\n')}
`
writeFileSync('src/rigori/data/reach.js', testata)
console.log('scritto src/rigori/data/reach.js')
for (const z of dati.zone) {
  const ys = z.campioni.flatMap((c) => [c.L[1], c.R[1]]), xs = z.campioni.flatMap((c) => [c.L[0], c.R[0]])
  const piedi = z.campioni.map((c) => c.piedi)
  console.log(`zona ${z.zona} ${z.clip.padEnd(6)} |x| max ${Math.max(...xs.map(Math.abs)).toFixed(2)}  y max ${Math.max(...ys).toFixed(2)}  piedi ${Math.min(...piedi).toFixed(2)}–${Math.max(...piedi).toFixed(2)}`)
}
