// QA audio: gate "Tocca per iniziare" sblocca l'AudioContext, poi un tiro in Sfida Ale con effetti e ducking.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = [], infos = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); if (m.type() === 'info') infos.push(m.text()) })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.waitForTimeout(400)
await p.screenshot({ path: 'docs/rigori/screenshots/f10-tocca.png' })
await p.click('.rg-loading__tap', { force: true }); await p.waitForTimeout(800)
const a = await p.evaluate(() => ({ unlocked: window.__rigori.audio.unlocked, state: window.__rigori.audio.context?.state }))
console.log('sblocco audio:', JSON.stringify(a)); if (!a.unlocked) errors.push('audio non sbloccato al primo tap')
await p.click('[data-skip]'); await p.waitForFunction(() => window.__rigori.flow() === 'chiTira'); await p.click('.rg-card[data-value="monne"]'); await p.waitForFunction(() => window.__rigori.flow() === 'giocatore'); await p.click('[data-value="vai"]')
await p.waitForFunction(() => window.__rigori.flow() === 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(1500)
await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 3.0, y: 1.9, power: 1.0, curve: 0 }, true, 0.5) })
await p.waitForFunction(() => window.__rigori.lastResult() != null, null, { timeout: 90000 })
const ducked = await p.evaluate(() => window.__rigori.audio.ducked)
console.log('esito:', await p.evaluate(() => window.__rigori.lastResult()), '· ducking attivo durante esito:', ducked)
await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd'), null, { timeout: 90000 })
console.log('ducking dopo replay:', await p.evaluate(() => window.__rigori.audio.ducked))
console.log('musica:', infos.filter((t) => /musica/.test(t)).join(' | ') || 'nessun avviso')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK audio')
