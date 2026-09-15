// Harness QA del gioco: Chromium con WebGL software, viewport 380x800, errori console, screenshot.
// Uso: node scripts/qa/rigori-shot.mjs <url> <out.png> [--wait=ms] [--eval=<js>] [--tap=x,y] [--swipe=x1,y1,x2,y2,ms]
import { chromium } from 'playwright-core'
const [url, out, ...rest] = process.argv.slice(2)
const opts = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const [vw, vh] = (opts.vp || '380x800').split('x').map(Number)
const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errors = [], logs = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error') errors.push('console: ' + t); else if (m.type() === 'warning' && /three|webgl/i.test(t)) logs.push(t) })
await p.goto(url, { waitUntil: 'load' })
try { await p.waitForFunction(() => window.__rigori && window.__rigori.ready, null, { timeout: 30000 }) } catch { errors.push('timeout: window.__rigori.ready non è arrivato') }
await p.waitForTimeout(+(opts.wait || 800))
if (opts.tap) { const [x, y] = opts.tap.split(',').map(Number); await p.touchscreen.tap(x, y); await p.waitForTimeout(400) }
if (opts.swipe) { const [x1, y1, x2, y2, ms] = opts.swipe.split(',').map(Number); const steps = 12; await p.mouse.move(x1, y1); await p.mouse.down(); for (let i = 1; i <= steps; i++) { await p.mouse.move(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps); await p.waitForTimeout((ms || 240) / steps) } await p.mouse.up(); await p.waitForTimeout(+(opts.after || 2500)) }
if (opts.eval) { try { console.log('eval →', JSON.stringify(await p.evaluate(opts.eval))) } catch (e) { errors.push('eval: ' + e.message) } }
// --until=<espressione>: aspetta (max 20 s) che diventi vera, poi scatta. Serve a campionare sul tempo di gioco, non sui ms reali.
if (opts.until) { try { await p.waitForFunction(opts.until, null, { timeout: 20000, polling: 30 }) } catch { errors.push('until: condizione mai vera: ' + opts.until) } }
const info = await p.evaluate(() => (window.__rigori ? window.__rigori.info?.() : null)).catch(() => null)
if (info) console.log('info →', JSON.stringify(info))
await p.screenshot({ path: out })
console.log(`screenshot → ${out}`)
if (logs.length) console.log('avvisi:', logs.slice(0, 3).join(' | '))
await b.close()
if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) }
console.log('nessun errore')
