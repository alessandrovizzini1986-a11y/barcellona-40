// QA pass-and-play a 4 (Ale, Monne, Giulio, Manuel): scelta nomi, passaggio del telefono, rotazione, fine e condivisione WhatsApp.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
await p.waitForFunction(() => window.__rigori.flow() === 'chiTira'); await p.click('.rg-card[data-value="monne"]'); await p.waitForFunction(() => window.__rigori.flow() === 'giocatore'); await p.click('[data-value="vai"]')
await p.waitForFunction(() => window.__rigori.flow() === 'modalita'); await p.click('.rg-mode[data-value="passAndPlay"]')
await p.waitForSelector('[data-name="Manuel"]'); await p.click('[data-name="Giulio"]'); await p.click('[data-name="Manuel"]')
console.log('nomi scelti:', await p.evaluate(() => [...document.querySelectorAll('.rg-name--on')].map((e) => e.textContent)))
await p.screenshot({ path: 'docs/rigori/screenshots/f13-passplay-nomi.png' })
await p.click('[data-go]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(800)
const t0 = Date.now(); let seen = new Set(), rounds = 0
while (Date.now() - t0 < 560000) {
  const st = await p.evaluate(() => ({ flow: window.__rigori.flow(), role: window.__rigori.role(), busy: window.__rigori.shotState(), hud: document.querySelector('.rg-modehud')?.textContent, pick: !!document.querySelector('.rg-zone'), hand: !!document.querySelector('[data-ok]'), hoTxt: document.querySelector('.rg-handoff')?.textContent }))
  if (st.flow === 'risultato') break
  if (st.hud && !seen.has(st.hud)) { seen.add(st.hud); console.log('hud →', st.hud) }
  if (st.pick) { await p.click('.rg-zone'); await p.waitForTimeout(300); continue }
  if (st.hand) { await p.click('[data-ok]'); await p.waitForTimeout(300); continue }
  if (st.role === 'shooter' && st.busy === 'idle') { await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 2.6 * (Math.random() < .5 ? -1 : 1), y: 1.6, power: 0.9, curve: 0 }, true, 0.5) }); rounds++ }
  await p.waitForTimeout(1200)
}
await p.waitForFunction(() => window.__rigori.flow() === 'risultato', null, { timeout: 60000 }); await p.waitForTimeout(400)
await p.screenshot({ path: 'docs/rigori/screenshots/f13-passplay-risultato.png' })
const res = await p.evaluate(() => ({ txt: document.querySelector('.rg-panel')?.innerText.replace(/\n+/g, ' | ').slice(0, 400), wa: document.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href') }))
console.log('risultato →', res.txt); console.log('whatsapp →', res.wa ? decodeURIComponent(res.wa.replace('https://wa.me/?text=', '')).replace(/\n/g, ' / ') : 'MANCA')
if (!res.wa) errors.push('link WhatsApp assente')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log(`OK pass-and-play (${rounds} tiri)`)
