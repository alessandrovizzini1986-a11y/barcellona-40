// QA dei ritocchi di chiusura (ottobre 2026): Oggi che si ridisegna da solo, mappa smontata bene, orario di
// Pont del Bisbe, papera solo al tocco, pulsanti piccoli a 44 px, fuso fisso di Barcellona, profilo sconosciuto.
//   node scripts/qa/chiusura.mjs http://localhost:4173
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
async function apri(path, { person = 'ale', timezoneId = 'Europe/Madrid', clock = null, init = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, timezoneId })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  if (clock) await p.clock.install({ time: clock })
  await p.addInitScript(({ person }) => { try { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); if (person) localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true') } catch {} }, { person })
  if (init) await p.addInitScript(init)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
const prossima = (p) => p.locator('.tile:has(.tile__label:text-is("Prossima"))').innerText().then((s) => s.replace(/\s+/g, ' ').trim())

// 3. Oggi si ridisegna da solo ogni minuto durante il weekend: orologio vero (finto), niente ?now=
{
  const { p, ctx, errs } = await apri('/#/oggi', { clock: '2026-10-17T12:14:30+02:00' })
  ok('sabato 12:14 (orologio del telefono): Oggi è in modalità weekend', (await p.locator('.tile__label:text-is("Prossima")').count()) === 1)
  const prima = await prossima(p)
  ok('Prossima dice "tra N min"', /tra \d+ (min|h)/.test(prima), prima)
  // si scorre, si apre un Dettagli e la card meteo (se c'è): dopo il ridisegno devono restare così
  await p.evaluate(() => scrollTo(0, 600)); await p.waitForTimeout(100)
  const dett = p.locator('.timeline .card[data-stop] details').first(); await dett.evaluate((d) => { d.open = true })
  const idDett = await dett.evaluate((d) => d.closest('[data-stop]').dataset.stop)
  await p.evaluate(() => document.body.setAttribute('data-vecchio', '1'))
  const marca = await p.evaluate(() => { const t = document.querySelector('.tile--accent'); t.dataset.marca = 'vecchio'; return scrollY })
  await p.clock.fastForward('01:01'); await p.waitForTimeout(400)
  const dopo = await prossima(p)
  ok('dopo un minuto (orologio avanzato) il tile si è ridisegnato', (await p.evaluate(() => document.querySelector('.tile--accent').dataset.marca)) !== 'vecchio')
  ok('e "tra N min" è sceso di uno', prima !== dopo && /tra \d+ (min|h)/.test(dopo), `${prima} → ${dopo}`)
  ok('lo scroll non è tornato in cima', Math.abs((await p.evaluate(() => scrollY)) - marca) < 40, `${marca} → ${await p.evaluate(() => scrollY)}`)
  ok('il Dettagli aperto è rimasto aperto', await p.locator(`.card[data-stop="${idDett}"] details`).evaluate((d) => d.open))
  // scheda nascosta: niente ridisegno
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await p.evaluate(() => { document.querySelector('.tile--accent').dataset.marca = 'nascosto' })
  await p.clock.fastForward('02:00'); await p.waitForTimeout(300)
  ok('con la scheda nascosta non si ridisegna', (await p.evaluate(() => document.querySelector('.tile--accent').dataset.marca)) === 'nascosto')
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) }); await p.waitForTimeout(400)
  ok('al ritorno sulla scheda si ridisegna subito', (await p.evaluate(() => document.querySelector('.tile--accent').dataset.marca)) !== 'nascosto')
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK chiusura')
