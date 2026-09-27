// I sette momenti del gioco in screenshot a 380 px: menu, CHI TIRA?, tiro in volo, portiere in tuffo (replay),
// GOL, PARATA, risultato. Per il confronto prima/dopo e per guardare il gioco con occhio severo.
//   node scripts/qa/rigori-momenti.mjs <cartella> [url]
import { chromium } from 'playwright-core'
const [dir, urlArg] = process.argv.slice(2)
const url = urlArg || 'http://localhost:4173/rigori/?q=alta'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true') } catch {} })
const shot = async (n) => { await p.screenshot({ path: `${dir}/${n}.png` }); console.log('screenshot →', n) }
const flow = (f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 30000 })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 90000 }); await p.click('.rg-loading__tap', { force: true })
await flow('chiTira'); await p.waitForTimeout(600); await shot('m2-chi-tira')
await p.click('.rg-card[data-value="monne"]'); await flow('giocatore'); await p.click('[data-value="vai"]'); await flow('modalita'); await p.waitForTimeout(400); await shot('m1-menu-modalita')
await p.click('.rg-mode[data-value="sfidaAle"]'); await flow('gioco')
await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle'); await p.waitForTimeout(600)
// GOL all'angolo alto, portiere dall'altra parte: in volo, poi il cartello, poi il replay a metà tuffo
await p.evaluate(() => { const R = window.__rigori; R.setPrecision(0); R.ctx.forceKeeperZone(3); R.fire({ x: 1.6, y: 1.3, power: 0.8, curve: 0 }, false, 0.5, 4242) })
await p.waitForFunction(() => window.__rigori.shotState() === 'flying' && window.__rigori.game.shot.time > 0.2); await shot('m3-tiro-in-volo')
await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); await p.waitForTimeout(250); await shot('m5-gol')
await p.waitForFunction(() => window.__rigori.game.juice.replaying, null, { timeout: 15000 }); await p.waitForTimeout(900); await shot('m4-portiere-in-tuffo')
await p.waitForFunction(() => !window.__rigori.esitoLocked && window.__rigori.shotState() === 'idle', null, { timeout: 60000 })
// PARATA: piazzato basso a destra, portiere lì
await p.evaluate(() => { const R = window.__rigori; R.ctx.forceKeeperZone(5); R.fire({ x: 1.35, y: 0.45, power: 0.55, curve: 0 }, false, 0.5, 100) })
await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); await p.waitForTimeout(250)
console.log('esito della parata:', await p.evaluate(() => window.__rigori.record().outcome)); await shot('m6-parata')
await p.waitForFunction(() => !window.__rigori.esitoLocked && window.__rigori.shotState() === 'idle', null, { timeout: 60000 })
// fine: altre due parate, poi il risultato
for (let i = 0; i < 2; i++) { await p.evaluate((s) => { const R = window.__rigori; R.ctx.forceKeeperZone(5); R.fire({ x: 1.35, y: 0.45, power: 0.55, curve: 0 }, false, 0.5, s) }, 101 + i); await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); await p.waitForTimeout(400); await p.evaluate(() => window.__rigori.salta()); await p.waitForFunction(() => window.__rigori.flow() === 'risultato' || (!window.__rigori.esitoLocked && window.__rigori.shotState() === 'idle'), null, { timeout: 60000 }) }
await flow('risultato'); await p.waitForTimeout(600); await shot('m7-risultato')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK momenti')
