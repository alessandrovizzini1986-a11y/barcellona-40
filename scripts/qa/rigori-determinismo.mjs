// Test di accettazione del tiro deterministico (una sola timeline per palla e portiere).
// 1) stesso seme → stessa posa dal vivo, nel replay 1 e nel replay 2
// 2) 20 tiri a seme fisso: il portiere parte sempre prima dell'impatto e il tuffo si vede
// 3) il replay non chiama né Math.random né la decisione del portiere
// 4) dopo tre replay di fila il mixer riparte da zero ogni volta
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 } })
const p = await ctx.newPage(); const errors = [], check = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) errors.push(msg) }
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.addInitScript(() => { window.__rnd = 0; const r = Math.random; Math.random = function () { window.__rnd++; return r.call(Math) } })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.evaluate(() => window.__rigori.kitReady); await p.waitForTimeout(600)
await p.evaluate(() => {
  window.__rigori.game.holdShot = true
  window.__rigori.setPrecision(0)
  const k = window.__rigori.keeper(); window.__dec = 0; const d = k.decide.bind(k); k.decide = (...a) => { window.__dec++; return d(...a) }
})
const shoot = async (aim, seed) => {
  await p.evaluate(() => { window.__rigori.game.keeper.reset(); window.__rigori.game.shot.reset(); window.__rigori.events.length = 0; window.__rigori.trace(true) })
  await p.evaluate(([aim, seed]) => window.__rigori.fire(aim, true, 0, seed), [aim, seed])
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'settled'), null, { timeout: 60000 })
  return p.evaluate(() => ({ rec: (() => { const r = window.__rigori.record(); return { seed: r.seed, flightTime: r.flightTime, contactTime: r.contactTime, duration: r.duration, outcome: r.outcome, zone: r.keeper?.zone ?? null, react: r.keeper?.reactionDelay ?? null, clip: r.keeper?.clip ?? null } })(), trace: window.__rigori.traced() }))
}
const probe = (times) => p.evaluate((ts) => ts.map((t) => { window.__rigori.renderAt(t); return { t, ...window.__rigori.pose() } }), times)

// ---- 2) venti tiri a seme fisso: il portiere parte sempre in tempo e il tuffo si vede ----
const AIMS = [[-2.6, 1.9], [2.6, 1.9], [-2.6, 0.5], [2.6, 0.5], [0, 1.9], [0, 0.5], [-1.4, 1.2], [1.4, 1.2], [-3.2, 1.0], [3.2, 1.0]]
let lateOk = 0, visibleOk = 0, moveOk = 0, moveTot = 0
for (let i = 0; i < 20; i++) {
  const [x, y] = AIMS[i % AIMS.length]
  const { rec, trace } = await shoot({ x, y, power: 0.6 + (i % 5) * 0.12, curve: 0 }, 1000 + i)
  if (rec.react != null && rec.react < rec.flightTime) lateOk++
  const clipT = trace.map((f) => f.clipTime).filter((v) => v >= 0)
  if (clipT.length && Math.max(...clipT) - Math.min(...clipT) > 0.3) visibleOk++
  if (rec.zone != null && rec.zone % 3 !== 1) { moveTot++; if (Math.max(...trace.map((f) => Math.abs(f.keeperX))) > 0.8) moveOk++ }
  if (i === 0) console.log('  esempio:', JSON.stringify(rec))
}
check(lateOk === 20, `il tuffo parte prima dell'impatto in 20/20 tiri (${lateOk})`)
check(visibleOk === 20, `la clip del tuffo avanza in 20/20 tiri (${visibleOk})`)
check(moveOk === moveTot, `il portiere si sposta lateralmente in tutte le zone non centrali (${moveOk}/${moveTot})`)

// ---- 1, 3, 4) determinismo fra live, replay 1 e replay 2 ----
const { rec, trace: live } = await shoot({ x: -2.5, y: 1.85, power: 0.85, curve: 0.2 }, 777)
console.log('  tiro di riferimento:', JSON.stringify(rec))
const T = []; for (let t = 0.05; t <= rec.duration; t += 0.05) T.push(+t.toFixed(3))
const passA = await probe(T)
const before = await p.evaluate(() => ({ rnd: window.__rnd, dec: window.__dec }))
const firstFrames = []
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => window.__rigori.trace(true))
  await p.evaluate(() => window.__rigori.replay({ speed: 0.6 }))
  await p.waitForFunction(() => !window.__rigori.game.juice.replaying, null, { timeout: 60000 })
  const tr = await p.evaluate(() => window.__rigori.traced())
  firstFrames.push(tr[0])
  if (i === 0) globalThis.replay1 = tr
  if (i === 1) globalThis.replay2 = tr
}
const after = await p.evaluate(() => ({ rnd: window.__rnd, dec: window.__dec }))
const passB = await probe(T)
await p.evaluate(() => window.__rigori.replay({ speed: 0.6 })); await p.waitForFunction(() => !window.__rigori.game.juice.replaying, null, { timeout: 60000 })
const passC = await probe(T)
check(JSON.stringify(passA) === JSON.stringify(passB), 'stessa posa a ogni t prima e dopo tre replay')
check(JSON.stringify(passB) === JSON.stringify(passC), 'stessa posa a ogni t dopo un quarto replay')
check(after.rnd === before.rnd, `il replay non chiama Math.random (${before.rnd} → ${after.rnd})`)
check(after.dec === before.dec, `il replay non chiama la decisione del portiere (${before.dec} → ${after.dec})`)
// il mixer riparte: il primo frame di ogni replay è all'inizio della clip, non alla fine
const startTimes = firstFrames.map((f) => f.clipTime)
check(startTimes.every((v) => Math.abs(v - startTimes[0]) < 1e-3), 'ogni replay riparte dalla stessa posa iniziale: ' + JSON.stringify(startTimes))
check(startTimes[0] < 0.75, 'il primo frame del replay è all\'inizio della clip, non alla fine: ' + startTimes[0])
// La posa vista dal vivo, ricalcolata agli STESSI istanti, deve venire identica.
// La palla è governata dal record per tutta la durata; il portiere fino all'impatto, dopo di che passa
// all'animazione di reazione (esultanza/delusione), che non fa parte del tiro.
const liveTimes = live.map((f) => f.t)
const recomputed = await probe(liveTimes)
let ballDiff = 0, keeperDiff = 0
for (let i = 0; i < live.length; i++) {
  const a = live[i], q = recomputed[i]
  if (JSON.stringify(a.ball) !== JSON.stringify(q.ball) || a.ballRot !== q.ballRot) ballDiff++
  if (a.t <= rec.contactTime && (a.keeperX !== q.keeperX || a.clipTime !== q.clipTime)) keeperDiff++
}
check(ballDiff === 0, `la palla dal vivo e ricalcolata è identica in tutti i ${live.length} frame (${ballDiff} differenze)`)
check(keeperDiff === 0, `il portiere dal vivo e ricalcolato è identico fino all'impatto (${keeperDiff} differenze)`)
// replay 1 e replay 2: stessi istanti, stessa posa
const r1 = globalThis.replay1, r2 = globalThis.replay2
const r2at = await probe(r1.map((f) => f.t))
let rDiff = 0
for (let i = 0; i < r1.length; i++) if (JSON.stringify(r1[i]) !== JSON.stringify({ ...r2at[i], t: r1[i].t })) rDiff++
check(rDiff === 0, `il replay ricalcolato agli stessi istanti dà la stessa posa (${rDiff} differenze su ${r1.length})`)
check(r1.length > 10 && r2.length > 10, `entrambi i replay hanno disegnato (${r1.length} e ${r2.length} frame)`)
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK determinismo')
