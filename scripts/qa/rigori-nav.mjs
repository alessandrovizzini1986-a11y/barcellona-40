// QA navigazione e testi (blocco 1): "Torna al programma" in ogni schermata di scelta, ≡ sopra gli overlay del
// pass-and-play, ✕ della Pausa a 44 px, HUD mai sotto il ≡, refusi spariti, Boss al livello 2.
//   node scripts/qa/rigori-nav.mjs [url]
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync } from 'node:fs'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
const apri = async (xp = 0, onboarded = true) => {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await p.addInitScript(({ xp, onb }) => { try { if (onb) localStorage.setItem('b40:v1:rigori:onboarded', 'true'); if (xp) localStorage.setItem('b40:v1:rigori:xp', String(xp)) } catch {} }, { xp, onb: onboarded })
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
  return { p, ctx }
}
const flow = (p, f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 30000 })
const sito = (p) => p.evaluate(() => { const a = [...document.querySelectorAll('.rg-overlay a.rg-sito, .rg-overlay .rg-sito')].pop(); return a ? { href: a.getAttribute('href'), target: a.getAttribute('target'), h: a.getBoundingClientRect().height } : null })
const okSito = async (p, dove) => { const s = await sito(p); ok(`"Torna al programma" in ${dove}`, !!s && /#\/oggi$/.test(s.href) && s.target === null && s.h >= 44, JSON.stringify(s)) }

// 1. testi: refusi e gergo spariti dal bundle pubblicato
{
  const dir = 'dist/assets'; const js = readdirSync(dir).filter((f) => /^rigori-.*\.js$/.test(f)).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
  for (const brutto of ['pararo', 'tell dimezzato', 'Tell quasi assenti', 'zona verde', 'lato debole a destra', 'incrocio, traversa', 'livello 5']) ok(`nel bundle non c'è "${brutto}"`, !js.includes(brutto))
  ok('nel bundle c\'è "si sbilancia"', js.includes('si sbilancia'))
}
// 2. onboarding: "zona colorata"
{
  const { p, ctx } = await apri(0, false)
  await flow(p, 'onboarding')
  ok('onboarding dice "zona colorata"', (await p.locator('.rg-onb__text').innerText()).includes('zona colorata'))
  await ctx.close()
}
// 3. ogni schermata di scelta ha il link al sito; Boss sbloccato con 100 XP
{
  const { p, ctx } = await apri(100)
  await flow(p, 'chiTira'); await okSito(p, 'CHI TIRA?')
  await p.click('.rg-card[data-value="manuel"]'); await flow(p, 'giocatore'); await okSito(p, 'card giocatore')
  await p.click('[data-value="vai"]'); await flow(p, 'modalita'); await okSito(p, 'Modalità')
  ok('Boss sbloccato con 100 XP (livello 2)', await p.evaluate(() => !document.querySelector('.rg-mode[data-value="boss"]').disabled))
  ok('Modalità: Skill senza "traversa", Boss "livello 2"', await p.evaluate(() => !document.querySelector('.rg-mode[data-value="skill"] span').textContent.includes('traversa') && document.querySelector('.rg-mode[data-value="boss"] span').textContent.includes('livello 2')))
  await p.click('[data-value="__opzioni"]'); await p.waitForSelector('[data-ok]'); await okSito(p, 'Opzioni'); await p.click('[data-ok]'); await flow(p, 'modalita')
  await p.click('[data-value="__sblocchi"]'); await p.waitForSelector('[data-value="ok"]'); await okSito(p, 'Sblocchi'); await p.click('[data-value="ok"]'); await flow(p, 'modalita')
  await p.click('.rg-mode[data-value="passAndPlay"]'); await p.waitForSelector('[data-go]'); await okSito(p, 'Chi gioca?')
  // 4. pass-and-play: il ≡ resta sopra l'overlay della scelta della zona, e la Pausa si apre
  await p.click('[data-go]'); await flow(p, 'gioco'); await p.waitForSelector('.rg-zone', { timeout: 20000 })
  const sotto = await p.evaluate(() => { const b = document.querySelector('.rg-menubtn'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === b || b.contains(e) ? 'menu' : (e?.className || e?.tagName) })
  ok('pass-and-play, "para tu": sotto il dito sul ≡ c\'è il ≡', sotto === 'menu', String(sotto))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]', { timeout: 5000 })
  const chiudi = await p.evaluate(() => { const c = document.querySelector('.rg-close').getBoundingClientRect(); return { w: c.width, h: c.height } })
  ok('✕ della Pausa a 44 px', chiudi.w >= 44 && chiudi.h >= 44, JSON.stringify(chiudi))
  ok('Pausa: "Torna al programma" c\'è', await p.evaluate(() => !![...document.querySelectorAll('.rg-overlay a')].find((a) => /#\/oggi$/.test(a.getAttribute('href')))))
  await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  ok('Esci dal pass-and-play riporta a CHI TIRA?', true)
  await ctx.close()
}
// 5. HUD a destra del ≡, mai coperto, anche con il testo lungo dello Shootout
{
  const { p, ctx } = await apri()
  await flow(p, 'chiTira'); await p.click('.rg-card[data-value="monne"]'); await flow(p, 'giocatore'); await p.click('[data-value="vai"]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="shootout"]'); await flow(p, 'gioco')
  await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle')
  await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 5, y: 1.2, power: 1, curve: 0 }, false, 0.5) })
  await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 })
  const r = await p.evaluate(() => { const h = document.querySelector('.rg-modehud').getBoundingClientRect(), m = document.querySelector('.rg-menubtn').getBoundingClientRect(); return { hudLeft: Math.round(h.left), menuRight: Math.round(m.right), testo: document.querySelector('.rg-modehud').textContent, scroll: document.querySelector('.rg-modehud').scrollWidth <= document.querySelector('.rg-modehud').clientWidth + 1 } })
  ok('HUD a destra del ≡ col testo lungo', r.hudLeft >= r.menuRight, JSON.stringify(r))
  await ctx.close()
}
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK navigazione')
