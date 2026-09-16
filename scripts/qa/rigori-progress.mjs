// QA progressione: XP in b40:v1:rigori:*, chiavi del sito intatte, traguardi (traversa, incrocio), equipaggiamento.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:person', '"ale"'); localStorage.setItem('b40:v1:done', '["f1"]') } catch {} }) // chiavi del sito, da non toccare
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.evaluate(() => window.__rigori.kitReady); await p.waitForTimeout(500)
const shoot = async (aim, until = 'replayEnd') => {
  await p.evaluate((aim) => { window.__rigori.events.length = 0; window.__rigori.setPrecision(0); window.__rigori.fire(aim, true, 0.5) }, aim)
  await p.waitForFunction((u) => window.__rigori.events.some((e) => e.type === u), until, { timeout: 120000 })
}
await p.evaluate(() => { window.__rigori.ctx.forceKeeperZone(3); window.__rigori.startMode('sfidaAle') }) // Ale in basso a sinistra: i tiri in alto a destra entrano
await p.waitForTimeout(500)
await shoot({ x: 3.25, y: 2.1, power: 1.0, curve: 0 })     // incrocio
console.log('dopo incrocio:', await p.evaluate(() => ({ xp: window.__rigori.game.progress.xp(), ls: localStorage.getItem('b40:v1:rigori:xp'), last: window.__rigori.lastResult(), corner: window.__rigori.events.find((e) => e.type === 'result')?.corner })))
await shoot({ x: 0, y: 2.44, power: 1.15, curve: 0 }, 'settled') // traversa piena
console.log('dopo traversa:', await p.evaluate(() => ({ last: window.__rigori.lastResult(), ach: Object.keys(JSON.parse(localStorage.getItem('b40:v1:rigori:achievements') || '{}')) })))
const site = await p.evaluate(() => ({ person: localStorage.getItem('b40:v1:person'), done: localStorage.getItem('b40:v1:done'), keys: Object.keys(localStorage).filter((k) => k.startsWith('b40:v1:')).sort() }))
console.log('chiavi:', JSON.stringify(site))
if (site.person !== '"ale"' || site.done !== '["f1"]') errors.push('chiavi del sito modificate')
if (!site.keys.every((k) => !k.startsWith('b40:v1:rigori:') || true)) errors.push('?')
const eq = await p.evaluate(() => { const pr = window.__rigori.game.progress; return { lvl: pr.level(), canGold: pr.setEquip('pallone', 'ball:oro'), classic: pr.setEquip('pallone', 'ball:classico'), summary: pr.summaryForUi().unlocks.filter((u) => u.unlocked).map((u) => u.id) } })
console.log('equip:', JSON.stringify(eq)); if (eq.canGold) errors.push('pallone oro equipaggiabile al livello 1')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK progressione')
