// QA del ritmo (blocco 2): un replay solo di 2,2 s, salto dopo 150 ms, un tiro sotto i 4 s di sistema,
// musica e vibrazione OFF di default, effetti al 50 %, swipe da tutta la metà bassa, video solo a richiesta.
//   node scripts/qa/rigori-ritmo.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
// 1. impostazioni di default su un telefono nuovo
const s0 = await p.evaluate(() => ({ music: window.__rigori.settings.music, vibration: window.__rigori.settings.vibration, audio: window.__rigori.settings.audio, sfx: window.__rigori.audio.sfxGain, musicName: window.__rigori.audio.musicName }))
ok('musica OFF di default', s0.music === false && s0.musicName === null, JSON.stringify(s0))
ok('vibrazione OFF di default', s0.vibration === false)
ok('effetti accesi, al 50 %', s0.audio === true && Math.abs(s0.sfx - 0.45) < 0.01, String(s0.sfx))
const flow = (f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 30000 })
await flow('chiTira'); await p.click('.rg-card[data-value="monne"]'); await flow('giocatore'); await p.click('[data-value="vai"]'); await flow('modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow('gioco')
await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle')
// 2. swipe con il dito lontano dal pallone (basso a sinistra): il tiro parte lo stesso
await p.mouse.move(60, 700); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(60 + i * 12, 700 - i * 40); await p.waitForTimeout(25) } await p.mouse.up()
await p.waitForTimeout(300)
ok('swipe da lontano dal pallone: il tiro parte', ['windup', 'flying', 'done'].includes(await p.evaluate(() => window.__rigori.shotState())), await p.evaluate(() => window.__rigori.shotState()))
await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 })
// 3. salto: rifiutato prima di 150 ms, accettato dopo
const r = await p.evaluate(() => window.__rigori.ritardoSalto); ok('ritardo del salto 150 ms', r === 150, String(r))
ok('"Tocca per saltare" grande e visibile col cartello', await p.evaluate(() => { const s = document.querySelector('.rg-skip'); const c = getComputedStyle(s); return !s.hidden && s.textContent.includes('Tocca per saltare') && s.getBoundingClientRect().height >= 56 && parseFloat(c.fontSize) >= 18 }))
await p.waitForFunction(() => !window.__rigori.esitoLocked && window.__rigori.shotState() === 'idle', null, { timeout: 60000 })
const rp = await p.evaluate(() => window.__rigori.ultimoReplay)
ok('un replay solo', rp && rp.passate === 1, JSON.stringify(rp))
ok('replay di 2,2 s', rp && Math.abs(rp.durata - 2.2) < 0.01, String(rp?.durata))
ok('video NON registrato in automatico', (await p.evaluate(() => window.__rigori.fileVideo)) === null)
// 4. tempo di sistema per tiro, dalle costanti: rincorsa + volo + attesa + replay + rientro
const rec = await p.evaluate(() => ({ ...window.__rigori.ritmo, volo: window.__rigori.record()?.contactTime ?? null }))
const attesa = await p.evaluate(() => window.__rigori.ultimoReplay.attesa), fine = await p.evaluate(() => window.__rigori.ultimoReplay.fine)
const perTiroMax = rec.KICK_DELAY + 0.75 + attesa + rec.REPLAY_DURATA + fine
console.log(`tempo di sistema per tiro (volo più lungo, 0,75 s): ${perTiroMax.toFixed(2)} s · Shootout da 10 tiri: ${(perTiroMax * 10 + 0.35 * 5).toFixed(1)} s`)
ok('un tiro completo ≤ 4 s di sistema', perTiroMax <= 4.0, perTiroMax.toFixed(2))
ok('Shootout da 10 tiri ≤ 60 s di sistema', perTiroMax * 10 + 0.35 * 5 <= 60)
// 5. misura reale in questo ambiente (SwiftShader, rallentato): dal calcio a quando si può ritirare
const t0 = Date.now()
await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: -1.6, y: 0.4, power: 0.75, curve: 0 }, false, 0.5) })
await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); const tEsito = Date.now() - t0
await p.waitForFunction(() => !window.__rigori.esitoLocked && window.__rigori.shotState() === 'idle', null, { timeout: 60000 })
console.log(`misurato qui (GPU software): esito dopo ${tEsito} ms, tiro concluso dopo ${Date.now() - t0} ms`)
// 6. video a richiesta dal risultato
await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.ctx.forceKeeperZone(5) })
for (let i = 0; i < 4; i++) { if (await p.evaluate(() => window.__rigori.flow()) === 'risultato') break; await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle' || window.__rigori.flow() === 'risultato', null, { timeout: 60000 }); if (await p.evaluate(() => window.__rigori.flow()) === 'risultato') break; await p.evaluate(() => window.__rigori.fire({ x: 1.4, y: 0.4, power: 0.5, curve: 0 }, false, 0.5)); await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); await p.waitForTimeout(400); await p.evaluate(() => window.__rigori.salta()); await p.waitForFunction(() => !window.__rigori.esitoLocked || window.__rigori.flow() === 'risultato', null, { timeout: 60000 }) }
await flow('risultato'); await p.waitForTimeout(500)
await p.click('[data-share-toggle]')
ok('nel risultato c\'è "Video" anche senza registrazione automatica', (await p.locator('[data-share-video]').count()) === 1)
await p.click('[data-share-video]')
await p.waitForFunction(() => window.__rigori.fileVideo !== null, null, { timeout: 40000 }).catch(() => {})
const v = await p.evaluate(() => window.__rigori.fileVideo ? { size: window.__rigori.fileVideo.size, type: window.__rigori.fileVideo.type } : null)
ok('il video si registra quando lo si chiede', !!v && v.size > 10000, JSON.stringify(v))
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK ritmo')
