// Misura dell'equilibrio (blocco 3): con la distribuzione dei tiri di Ale e il tell di 350 ms,
//   1) chi indovina la direzione (zona esatta, tuffo 250 ms dopo il calcio) quante ne para   → obiettivo 45-55 %
//   2) Ale quante ne segna contro chi si tuffa a caso                                          → obiettivo 55-60 %
//   3) quante volte si vince uno Shootout, giocato per intero, con un tiratore "umano medio"   → obiettivo 40-50 %
// Non modifica niente: legge i numeri e li stampa. Con --gate esce 1 se gli obiettivi non sono rispettati.
//   node scripts/qa/rigori-equilibrio.mjs [url] [--gate] [--partite=N]
import { chromium } from 'playwright-core'
const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4173/rigori/?noflow=1&q=bassa'
const gate = args.includes('--gate'), PARTITE = +(args.find((a) => a.startsWith('--partite='))?.split('=')[1] || 12)
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 } })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.evaluate(() => window.__rigori.kitReady)
await p.evaluate(() => { const R = window.__rigori; R.game.holdShot = true; R.setShooter('monne'); R.ctx.role('keeper') })
const zonaDi = (aim) => (aim.y > 1.82 * 0.47 ? 0 : 3) + (aim.x < -0.733 ? 0 : aim.x > 0.733 ? 2 : 1)
// Un tiro di Ale (mira dalla sua distribuzione vera, precisione 0,6 come in partita) e un tuffo dell'utente
async function tiroDiAle(zonaTuffo, ritardoMs, seed) {
  const aim = await p.evaluate(() => window.__rigori.cpuAim({ strength: 1 }))
  const z = zonaDi(aim)
  const zt = typeof zonaTuffo === 'function' ? zonaTuffo(z) : zonaTuffo
  await p.evaluate(({ aim, seed }) => { const R = window.__rigori; R.game.shot.reset(); R.game.keeper.reset(); R.events.length = 0; R.setPrecision(0.6); R.fire(aim, false, 0, seed); R.setPrecision(1) }, { aim, seed })
  if (ritardoMs) await p.waitForTimeout(ritardoMs)
  await p.evaluate((zt) => window.__rigori.playerDive(zt), zt)
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'settled'), null, { timeout: 30000 })
  return p.evaluate((z) => { const r = window.__rigori.record(); return { o: r.outcome, z, ct: +r.contactTime.toFixed(2) } }, z)
}
const N = 60
// 1) zona esatta, 250 ms dopo il calcio (un riflesso umano sul tell di 350 ms: si è già scelto prima del calcio)
let rs = []; for (let i = 0; i < N; i++) rs.push(await tiroDiAle((z) => z, 250, 20000 + i))
const perZona = {}; for (const r of rs) { perZona[r.z] = perZona[r.z] || { tiri: 0, parate: 0 }; perZona[r.z].tiri++; if (r.o === 'save') perZona[r.z].parate++ }
const paraIndovinando = 100 * rs.filter((r) => r.o === 'save').length / N
console.log(`1) indovinando la direzione: parate ${paraIndovinando.toFixed(0)} % (${rs.filter((r) => r.o === 'save').length}/${N}) · per zona ${JSON.stringify(perZona)}`)
console.log(`   distribuzione dei tiri di Ale: alti ${rs.filter((r) => r.z < 3).length} · laterali bassi ${rs.filter((r) => r.z === 3 || r.z === 5).length} · centro basso ${rs.filter((r) => r.z === 4).length}`)
// 2) tuffo a caso (una persona che tira a indovinare fra le sei zone)
rs = []; for (let i = 0; i < N; i++) rs.push(await tiroDiAle((seed => (seed * 7 + 3) % 6)(i), 0, 21000 + i))
const aleSegnaCieco = 100 * rs.filter((r) => r.o === 'goal').length / N
console.log(`2) contro un tuffo a caso: Ale segna ${aleSegnaCieco.toFixed(0)} % (${rs.filter((r) => r.o === 'goal').length}/${N}), fuori/legno ${rs.filter((r) => r.o !== 'goal' && r.o !== 'save').length}, parate ${rs.filter((r) => r.o === 'save').length}`)
// 3) Shootout interi. Tiratore "umano medio": mira a caso fra le sei zone, potenza 0,6-1,0, precisione 1 (dispersione vera),
//    portiere CPU normale. Da portiere: sceglie la colonna del tell (60 % vera, 40 % finta), riga a caso, tuffo dopo 250 ms.
await p.evaluate(() => { const R = window.__rigori; R.game.holdShot = false })
const stato = () => p.evaluate(() => { const R = window.__rigori, m = R.mode(); return { role: R.role(), shot: R.shotState(), locked: R.esitoLocked, fin: !m || m.finished, me: m?.me, ale: m?.ale } })
const attendi = async (f, ms, che) => { const t0 = Date.now(); for (;;) { const s = await stato(); if (f(s)) return s; if (Date.now() - t0 > ms) throw new Error('attesa: ' + che); await p.waitForTimeout(100) } }
let vinte = 0, esiti = []
for (let g = 0; g < PARTITE; g++) {
  await p.evaluate(() => { const R = window.__rigori; R.game.shot.reset(); R.game.keeper.reset(); R.events.length = 0; R.settings.skipReplay = true; R.applySettings(); R.ctx.forceKeeperZone(null); R.startMode('shootout') })
  for (let n = 0; n < 40; n++) {
    const s = await attendi((x) => x.fin || (!x.locked && x.shot === 'idle' && x.role !== 'idle') || x.shot === 'windup' || x.shot === 'flying', 60000, 'turno')
    if (s.fin) break
    if (s.role === 'shooter' && s.shot === 'idle') {
      const z = (Math.random() * 6) | 0
      const aim = { x: [-1.47, 0, 1.47][z % 3] + (Math.random() - .5) * 0.5, y: z < 3 ? 1.25 + Math.random() * 0.3 : 0.35 + Math.random() * 0.4, power: 0.6 + Math.random() * 0.4, curve: (Math.random() - .5) * 0.4 }
      await p.evaluate((aim) => window.__rigori.fire(aim, false, 0), aim)
    } else if (s.role === 'keeper') {
      // legge il tell: 60 % delle volte è il lato vero. Si tuffa 250 ms dopo il calcio, riga a caso.
      await attendi((x) => x.shot === 'windup' || x.shot === 'flying' || x.fin, 40000, 'tiro di Ale')
      const tell = await p.evaluate(() => [...window.__rigori.events].reverse().find((e) => e.type === 'tell'))
      const col = tell ? (tell.side < 0 ? 0 : 2) : 1
      const zt = (Math.random() < 0.5 ? 0 : 3) + col
      await p.waitForTimeout(250)
      await p.evaluate((zt) => window.__rigori.playerDive(zt), zt)
    }
    await attendi((x) => x.fin || x.locked, 60000, 'esito')
    await attendi((x) => x.fin || (!x.locked && x.shot === 'idle'), 90000, 'fine sequenza')
  }
  const fine = await p.evaluate(() => [...window.__rigori.events].reverse().find((e) => e.type === 'modeEnd')?.summary)
  if (fine?.winner === 'me') vinte++
  esiti.push(`${fine?.me}-${fine?.ale}${fine?.suddenDeath ? ' sd' : ''}`)
  await p.evaluate(() => { window.__rigori.ctx.role('idle') })
}
const vincePct = 100 * vinte / PARTITE
console.log(`3) Shootout vinti: ${vincePct.toFixed(0)} % (${vinte}/${PARTITE}) · ${esiti.join(', ')}`)
console.log(`\n| Misura | Valore | Obiettivo |\n|---|---|---|\n| Chi indovina la direzione para | ${paraIndovinando.toFixed(0)} % | 45–55 % |\n| Ale segna (tuffo a caso) | ${aleSegnaCieco.toFixed(0)} % | 55–60 % |\n| Shootout vinto | ${vincePct.toFixed(0)} % | 40–50 % |`)
await b.close()
if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) }
if (gate) { const ko = []; if (paraIndovinando < 45 || paraIndovinando > 55) ko.push('parate indovinando fuori 45-55'); if (aleSegnaCieco < 55 || aleSegnaCieco > 60) ko.push('Ale segna fuori 55-60'); if (vincePct < 40 || vincePct > 50) ko.push('vittorie fuori 40-50'); if (ko.length) { console.error('FUORI OBIETTIVO: ' + ko.join('; ')); process.exit(1) } }
console.log('OK equilibrio')
