// QA della pausa di sistema del gioco: scheda nascosta (schermo spento, cambio app) → loop fermo e audio
// sospeso; al ritorno tutto riparte, con una sola catena di frame.
//   node scripts/qa/rigori-pausa.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => {
  try { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:person', JSON.stringify('monne')) } catch {}
  // contatore dei frame richiesti: serve a vedere che dopo la ripresa la catena è una sola
  window.__raf = 0; const raf = window.requestAnimationFrame; window.requestAnimationFrame = (fn) => { window.__raf++; return raf(fn) }
})
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
await p.waitForFunction(() => window.__rigori.flow() === 'chiTira', null, { timeout: 60000 }); await p.waitForTimeout(800)
const frames = () => p.evaluate(() => window.__rigori.frames)
const raf = () => p.evaluate(() => window.__raf)
const stato = () => p.evaluate(() => ({ pausa: window.__rigori.inPausa, audio: window.__rigori.audio.context?.state || 'assente' }))
const nascondi = (hidden) => p.evaluate((hidden) => { Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true }); Object.defineProperty(document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) }, hidden)
const f0 = await frames(); const r0 = await raf(); await p.waitForTimeout(1000); const f1 = await frames(); const r1 = await raf()
ok('al menu il loop gira', f1 > f0, `${f1 - f0} frame in 1 s`)
ok('audio sbloccato dal tocco (contesto running)', (await stato()).audio === 'running', (await stato()).audio)
await nascondi(true); await p.waitForTimeout(300)
const f2 = await frames(); await p.waitForTimeout(1000); const f3 = await frames()
ok('scheda nascosta: il loop si ferma', f3 === f2, `${f3 - f2} frame in 1 s`)
ok('scheda nascosta: inPausa e audio sospeso', (await stato()).pausa === true && (await stato()).audio === 'suspended', JSON.stringify(await stato()))
await nascondi(false); await p.waitForTimeout(300)
const f4 = await frames(); const r4 = await raf(); await p.waitForTimeout(1000); const f5 = await frames(); const r5 = await raf()
ok('al ritorno il loop riparte', f5 > f4, `${f5 - f4} frame in 1 s`)
ok('al ritorno inPausa è falso e l\'audio è running', (await stato()).pausa === false && (await stato()).audio === 'running', JSON.stringify(await stato()))
ok('una sola catena di frame (richieste al secondo simili a prima)', (r5 - r4) < (r1 - r0) * 1.6 + 5, `${r1 - r0} → ${r5 - r4}`)
// due volte di fila nascosto/visibile: niente doppioni
await nascondi(true); await p.waitForTimeout(200); await nascondi(true); await p.waitForTimeout(200); await nascondi(false); await p.waitForTimeout(200); await nascondi(false); await p.waitForTimeout(300)
const r6 = await raf(); await p.waitForTimeout(1000); const r7 = await raf()
ok('eventi doppi: ancora una sola catena', (r7 - r6) < (r1 - r0) * 1.6 + 5, `${r1 - r0} → ${r7 - r6}`)
ok('nessun errore JS', errs.length === 0, errs.join(' | '))
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK pausa')
