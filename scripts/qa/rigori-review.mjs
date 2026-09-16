// QA delle correzioni da revisione: respinta = parata contata, tuffo del portiere durante il volo, swipe specchiato
// dietro la porta, scadenza Skill a palla ferma, difficoltà di partita sul portiere riusato, ?q= non salvato.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = [], check = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) errors.push(msg) }
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.evaluate(() => window.__rigori.kitReady); await p.waitForTimeout(500)
const waitEv = (t, ms = 120000) => p.waitForFunction((t) => window.__rigori.events.some((e) => e.type === t), t, { timeout: ms })
// 1) respinta (potenza 0,9 nella zona del portiere) → 'result' save e contatore parate
await p.evaluate(() => { window.__rigori.startMode('sfidaAle'); window.__rigori.ctx.forceKeeperZone(4) }); await p.waitForTimeout(600)
await p.evaluate(() => { window.__rigori.events.length = 0; window.__rigori.setPrecision(0); window.__rigori.fire({ x: 0, y: 0.6, power: 0.95, curve: 0 }, true, 0.5) })
await waitEv('replayEnd')
const r1 = await p.evaluate(() => ({ save: window.__rigori.events.find((e) => e.type === 'save'), result: window.__rigori.events.find((e) => e.type === 'result'), saves: window.__rigori.mode()?.saves }))
check(r1.save && r1.save.catch === false, 'la parata è una respinta (catch=false)')
check(r1.result && r1.result.result === 'save', "la respinta emette 'result' save")
check(r1.saves === 1, 'Sfida Ale conta la parata: ' + r1.saves)
check(await p.evaluate(() => localStorage.getItem('b40:v1:rigori:settings')?.includes('"quality":"auto"')), '?q=bassa non viene salvato nelle impostazioni')
// 2) Skill: tempo scaduto a palla ferma → modeEnd senza tiri
await p.evaluate(() => { window.__rigori.ctx.role('idle'); window.__rigori.game.listeners.forEach((f) => f({ type: 'replayEnd' })) }); await p.waitForTimeout(300)
await p.evaluate(() => { window.__rigori.events.length = 0; window.__rigori.startMode('skill'); window.__rigori.mode().timeLeft = 1.2 })
await waitEv('modeEnd', 30000)
check(true, 'Skill finisce da sola allo scadere, a palla ferma')
check(await p.evaluate(() => window.__rigori.game.keeper === undefined || window.__rigori.keeper().state !== 'passive'), 'dopo Skill il portiere non resta passivo')
// 3) portiere giocabile: tuffo durante il volo della CPU + mappatura dello swipe (destra dello schermo = zona x<0)
await p.evaluate(() => { window.__rigori.events.length = 0; window.__rigori.startMode('shootout') }); await p.waitForTimeout(400)
// il mio turno da tiratore: tiro fuori, poi tocca ad Ale
await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 5, y: 1.2, power: 1, curve: 0 }, true, 0.5) })
await p.waitForFunction(() => window.__rigori.role() === 'keeper' && window.__rigori.shotState() === 'windup', null, { timeout: 120000 })
await p.waitForFunction(() => window.__rigori.shotState() === 'flying', null, { timeout: 60000 })
// swipe verso destra durante il volo → colonna 0 (x<0), riga bassa
await p.mouse.move(190, 600); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(190 + i * 15, 600 + i * 4); await p.waitForTimeout(20) } await p.mouse.up()
await p.waitForTimeout(200)
const dive = await p.evaluate(() => ({ zone: window.__rigori.keeper().playerDiveZone(), state: window.__rigori.keeper().state }))
check(dive.zone === 3, 'swipe a destra durante il volo → tuffo basso a x<0 (zona 3), ottenuto: ' + JSON.stringify(dive))
await waitEv('replayEnd')
// 4) difficoltà di partita: Boss dopo uno Shootout normale applica 'boss' anche al portiere riusato
await p.evaluate(() => { window.__rigori.ctx.role('idle') })
await p.waitForFunction(() => !window.__rigori.mode() || true); await p.evaluate(() => { window.__rigori.game.listeners.forEach((f) => f({ type: 'modeEnd', id: 'x', summary: {} })) })
await p.evaluate(() => { window.__rigori.startMode('boss') }); await p.waitForTimeout(300)
await p.evaluate(() => window.__rigori.ctx.role('keeper')); await p.waitForTimeout(300)
check(await p.evaluate(() => window.__rigori.keeper().difficulty === 'boss'), 'il portiere riusato in Boss ha difficoltà boss')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK revisione')
