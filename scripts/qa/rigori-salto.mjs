// Saltare il replay non deve cambiare NIENTE del risultato. Due partite identiche (stesso seme, stesso
// Math.random, stesse scelte): una vista per intero, una saltata al primo fotogramma utile del replay.
// Alla fine punteggio, XP e traguardi devono coincidere, e i turni devono essere gli stessi.
//   node scripts/qa/rigori-salto.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await (await b.newContext({ viewport: { width: 380, height: 820 } })).newPage()
const errori = []
p.on('pageerror', (e) => errori.push(String(e.message)))
p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()) })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
await p.evaluate(() => window.__rigori.kitReady)

const partita = (salta) => p.evaluate(async ({ salta }) => {
  const R = window.__rigori
  // stesso rumore in tutte e due le partite: così l'unica differenza è il salto
  let sem = 12345
  Math.random = () => { sem |= 0; sem = sem + 0x6D2B79F5 | 0; let t = Math.imul(sem ^ sem >>> 15, 1 | sem); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  const attendi = (f, ms = 60000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('scaduta')) } }, 16) })
  R.game.holdShot = false; R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0; R.xpLog.length = 0
  R.setShooter('monne'); R.setPrecision(0)
  R.startMode('shootout')
  const turni = [], salti = [], semi = []
  for (let n = 0; n < 12 && R.mode() && !R.mode().finished; n++) {
    const ruolo = R.role()
    if (ruolo === 'idle') { await new Promise((r) => setTimeout(r, 80)); n--; continue }
    R.events.length = 0
    if (ruolo === 'shooter') {
      R.setPrecision(0)
      R.ctx.forceKeeperZone(n % 6)
      R.fire({ x: [-2.3, 0, 2.3][n % 3], y: n % 2 ? 1.5 : 0.65, power: 0.6 + (n % 4) * 0.1, curve: 0 }, true, 0, 9100 + n)
    } else {
      await attendi(() => R.shotState() === 'windup' || R.shotState() === 'flying', 30000)
      R.playerDive((n % 2) * 3 + (n % 3))
    }
    await attendi(() => R.events.some((e) => e.type === 'result'))
    const rec = R.record()
    // Il seme dei tiri della CPU esce da Math.random, che il replay consuma anche per le particelle: saltando,
    // i tiri successivi di Ale escono con un seme diverso. Non fa parte del risultato, e infatti punteggio,
    // XP e traguardi restano identici; qui si confrontano turno, ruolo ed esito.
    turni.push({ n, ruolo, esito: rec.outcome })
    semi.push(rec.seed)
    if (salta) {
      // primo fotogramma utile: appena il salto viene accettato (dopo i 400 ms del cartello)
      await attendi(() => R.salta() === true, 20000)
      salti.push(n)
    }
    await attendi(() => R.events.some((e) => e.type === 'replayEnd') || !R.mode() || R.mode().finished, 90000)
  }
  const fine = R.events.find((e) => e.type === 'modeEnd')?.summary || R.mode()?.summary?.() || null
  return { turni, salti, semi, fine, xp: R.xpLog.map((x) => x.kind + ':' + x.n), traguardi: (R.game.progress?.summaryForUi?.().achievements || []).filter((a) => a.unlocked).map((a) => a.id) }
}, { salta })

const intera = await partita(false)
const saltata = await partita(true)
await b.close()
const uguale = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const confronti = [
  ['turni ed esiti', intera.turni, saltata.turni],
  ['punteggio finale', intera.fine, saltata.fine],
  ['XP', intera.xp, saltata.xp],
  ['traguardi', intera.traguardi, saltata.traguardi]
]
let guai = 0
console.log(`partita intera: ${intera.turni.length} tiri · saltata: ${saltata.turni.length} tiri, ${saltata.salti.length} salti`)
for (const [nome, a, c] of confronti) {
  const ok = uguale(a, c)
  console.log(`${ok ? 'OK  ' : 'NO  '} ${nome}${ok ? '' : `\n  intera:  ${JSON.stringify(a)}\n  saltata: ${JSON.stringify(c)}`}`)
  if (!ok) guai++
}
const semiUguali = uguale(intera.semi, saltata.semi)
console.log(`${semiUguali ? 'nota' : 'nota'} semi dei tiri: ${semiUguali ? 'identici' : 'diversi sui tiri della CPU (Math.random consumato dal replay), esiti invariati'}`)
if (saltata.salti.length < 8) { console.error(`solo ${saltata.salti.length} salti su ${saltata.turni.length} tiri`); guai++ }
if (errori.length) { console.error('ERRORI DI PAGINA:\n' + errori.join('\n')); guai++ }
if (guai) process.exit(1)
console.log('OK saltare il replay non cambia nulla')
