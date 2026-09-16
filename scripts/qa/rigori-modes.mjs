// QA modalità dal flusso reale: Boss sbloccato con XP seminati, Skill (bersagli, 30 s), Sfida Ale (tre parate), Boss (sconfitta rapida).
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:rigori:xp', '900') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
await p.waitForFunction(() => window.__rigori.flow() === 'chiTira'); await p.click('.rg-card[data-value="monne"]')
await p.waitForFunction(() => window.__rigori.flow() === 'modalita')
const bossOn = await p.evaluate(() => !document.querySelector('.rg-mode[data-value="boss"]').disabled); console.log('Boss sbloccato al livello 5:', bossOn); if (!bossOn) errors.push('Boss bloccato con 900 XP')
await p.screenshot({ path: 'docs/rigori/screenshots/f13-modalita-boss.png' })
const state = () => p.evaluate(() => ({ flow: window.__rigori.flow(), role: window.__rigori.role(), busy: window.__rigori.shotState(), hud: document.querySelector('.rg-modehud')?.textContent }))
const fire = (aim) => p.evaluate((aim) => { window.__rigori.setPrecision(0); window.__rigori.fire(aim, true, 0.5) }, aim)
async function playUntilResult(name, chooseAim, budget = 300000) {
  const t0 = Date.now(); let seen = new Set(), shots = 0
  while (Date.now() - t0 < budget) {
    const st = await state(); if (st.flow === 'risultato') break
    if (st.hud && !seen.has(st.hud)) { seen.add(st.hud); console.log(`[${name}] hud → ${st.hud}`) }
    if (st.role === 'shooter' && st.busy === 'idle') { await fire(await chooseAim()); shots++ }
    await p.waitForTimeout(1200)
  }
  await p.waitForFunction(() => window.__rigori.flow() === 'risultato', null, { timeout: 60000 }); await p.waitForTimeout(400)
  await p.screenshot({ path: `docs/rigori/screenshots/f13-${name}-risultato.png` })
  console.log(`[${name}] risultato → ${await p.evaluate(() => document.querySelector('.rg-panel')?.innerText.replace(/\n+/g, ' | ').slice(0, 220))} (${shots} tiri)`)
  await p.click('[data-value="menu"]'); await p.waitForFunction(() => window.__rigori.flow() === 'chiTira'); await p.click('.rg-card[data-value="monne"]'); await p.waitForFunction(() => window.__rigori.flow() === 'modalita')
}
// Skill: mira al bersaglio corrente
await p.click('.rg-mode[data-value="skill"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(800)
await playUntilResult('skill', () => p.evaluate(() => { const t = window.__rigori.mode()?.target; return { x: t ? t.x : 0, y: t ? t.y : 1, power: 0.9, curve: 0 } }))
// Sfida Ale: Ale forzato in basso al centro, tiro lì → tre parate
await p.click('.rg-mode[data-value="sfidaAle"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.evaluate(() => window.__rigori.ctx.forceKeeperZone(4)); await p.waitForTimeout(800)
await playUntilResult('sfidaAle', async () => ({ x: 0, y: 0.6, power: 0.7, curve: 0 }))
// Boss: tiri fuori, Ale segna → sconfitta al terzo turno
await p.click('.rg-mode[data-value="boss"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(800)
await playUntilResult('boss', async () => ({ x: 5, y: 1.2, power: 1, curve: 0 }))
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK modalità')
