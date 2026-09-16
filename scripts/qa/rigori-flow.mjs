// QA del flusso completo: onboarding → CHI TIRA? → Modalità → Shootout → esito → risultato. Screenshot per ogni schermata.
// Uso: node scripts/qa/rigori-flow.mjs <url> <cartellaScreenshot>
import { chromium } from 'playwright-core'
const [url, dir] = process.argv.slice(2)
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
const shot = (n) => p.screenshot({ path: `${dir}/${n}.png` }).then(() => console.log('screenshot →', n))
const waitFlow = (f, t = 60000) => p.waitForFunction((f) => window.__rigori?.flow?.() === f, f, { timeout: t, polling: 50 })
const step = async (name, fn) => { try { await fn() } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`) } }
await p.goto(url, { waitUntil: 'load' })
await step('ready', () => p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }))
await step('tocca per iniziare', async () => { await p.waitForSelector('.rg-loading__tap', { timeout: 10000 }); await p.click('.rg-loading__tap', { force: true }) })
await step('onboarding', async () => { await waitFlow('onboarding'); await p.waitForTimeout(600); await shot('f9-01-onboarding'); await p.click('[data-skip]') })
await step('chiTira', async () => { await waitFlow('chiTira'); await p.waitForTimeout(400); await shot('f9-02-chi-tira'); await p.click('.rg-card[data-value="monne"]') })
await step('modalita', async () => { await waitFlow('modalita'); await p.waitForTimeout(300); await shot('f9-03-modalita') })
await step('opzioni', async () => { await p.click('[data-value="__opzioni"]'); await p.waitForTimeout(300); await shot('f9-04-opzioni'); await p.click('[data-ok]') ; await waitFlow('modalita') })
await step('sblocchi', async () => { await p.click('[data-value="__sblocchi"]'); await p.waitForTimeout(300); await shot('f9-05-sblocchi'); await p.click('[data-value="ok"]'); await waitFlow('modalita') })
await step('start shootout', async () => { await p.click('.rg-mode[data-value="shootout"]'); await waitFlow('gioco'); await p.waitForTimeout(800); await shot('f9-06-gioco') })
// gioca lo shootout via hook: quando tocca a me, tiro nell'angolo; quando para Ale, la CPU tira da sola
let guard = 0, esitoShot = false, t0 = Date.now()
await step('shootout', async () => {
  await p.evaluate(() => window.__rigori.setPrecision?.(0))
  while (Date.now() - t0 < 230000) {
    const st = await p.evaluate(() => ({ flow: window.__rigori.flow(), role: window.__rigori.role(), busy: window.__rigori.shotState?.() }))
    if (st.flow === 'risultato') break
    const hud = await p.evaluate(() => document.querySelector('.rg-modehud')?.textContent); if (hud !== globalThis._h) { globalThis._h = hud; console.log('hud →', hud, JSON.stringify(st)) }
    if (st.role === 'shooter' && st.busy === 'idle') {
      await p.evaluate(() => window.__rigori.fire({ x: 3.0, y: 1.9, power: 1.0, curve: 0 }, true, 0.5))
      if (!esitoShot) { await p.waitForSelector('.rg-esito', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(150); await shot('f9-07-esito'); esitoShot = true }
    }
    await p.waitForTimeout(1500)
  }
  await waitFlow('risultato', 60000); await p.waitForTimeout(400); await shot('f9-08-risultato')
  console.log('risultato →', await p.evaluate(() => document.querySelector('.rg-panel')?.innerText.replace(/\n+/g, ' | ').slice(0, 300)))
})
await step('menu', async () => { await p.click('[data-value="menu"]'); await waitFlow('chiTira'); console.log('torna a CHI TIRA ✓') })
await b.close()
if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) }
console.log('flusso OK, nessun errore')
