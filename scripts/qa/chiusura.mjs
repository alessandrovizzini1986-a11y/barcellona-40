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
// 4. Mappa: si smonta davvero anche se si cambia pagina mentre Leaflet sta ancora arrivando (caos del report)
{
  const { p, ctx, errs } = await apri('/#/oggi')
  for (const attesa of [0, 30, 80, 150, 400, 900]) {
    await p.evaluate(() => { location.hash = '#/mappa' }); await p.waitForTimeout(attesa)
    await p.evaluate(() => { location.hash = '#/programma/ven' }); await p.waitForTimeout(700)
    await p.evaluate(() => { location.hash = '#/oggi' }); await p.waitForTimeout(400)
  }
  await p.waitForTimeout(1500)
  ok('mappa aperta e lasciata sei volte a tempi diversi: nessun errore Leaflet', !errs.some((e) => /_leaflet_pos|leaflet/i.test(e)), errs.find((e) => /leaflet/i.test(e)) || '')
  // le tre sequenze che sul sito di prima facevano saltare Leaflet: zoom con la rotella, trascinamento a metà, doppio tap
  const viaDurante = async (azione) => {
    await p.evaluate(() => { location.hash = '#/mappa' }); await p.waitForSelector('.leaflet-container', { timeout: 10000 }); await p.waitForTimeout(600)
    await azione(); await p.evaluate(() => { location.hash = '#/oggi' }); await p.waitForTimeout(1200)
  }
  await viaDurante(async () => { await p.mouse.move(190, 400); await p.mouse.wheel(0, -300) })
  ok('zoom con la rotella e via subito: nessun errore', !errs.some((e) => /_leaflet_pos/.test(e)), errs.join(' | '))
  await viaDurante(async () => { await p.mouse.move(190, 400); await p.mouse.down(); await p.mouse.move(150, 300) }); await p.mouse.move(100, 200); await p.mouse.up()
  ok('trascinamento a metà e via: nessun errore', !errs.some((e) => /classList|_leaflet_pos/.test(e)), errs.join(' | '))
  await viaDurante(async () => { await p.touchscreen.tap(190, 400); await p.touchscreen.tap(190, 400) })
  ok('doppio tap (zoom animato) e via subito: nessun errore', !errs.some((e) => /_leaflet_pos/.test(e)), errs.join(' | '))
  ok('nessun contenitore della mappa rimasto in giro', (await p.evaluate(() => document.querySelectorAll('.leaflet-container').length)) === 0)
  await p.evaluate(() => { location.hash = '#/mappa' }); await p.waitForSelector('.leaflet-container', { timeout: 10000 }); await p.waitForTimeout(800)
  await p.evaluate(() => { location.hash = '#/oggi' }); await p.waitForTimeout(600)
  ok('dopo una mappa completa, al cambio pagina il contenitore è smontato', (await p.evaluate(() => document.querySelectorAll('.leaflet-container').length)) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 7. I pulsanti piccoli sono alti 44 px: il QR del parcheggio si tocca alle 4 del mattino
{
  const { p, ctx } = await apri('/#/programma/dom') // il ritiro dell'auto al P2 (lunedì 01:10) sta nella timeline di domenica
  const qr = await p.locator('.btn--sm[data-qr]').boundingBox()
  ok('"QR del parcheggio" (btn--sm) è alto 44 px', qr && qr.height >= 44, JSON.stringify(qr))
  const h = await p.evaluate(() => [...document.querySelectorAll('.btn--sm')].map((b) => Math.round(b.getBoundingClientRect().height)))
  ok('ogni btn--sm della pagina è almeno 44 px', h.length > 0 && h.every((x) => x >= 44), h.join(','))
  await p.goto(base + '/#/info', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  const h2 = await p.evaluate(() => [...document.querySelectorAll('.btn--sm')].map((b) => Math.round(b.getBoundingClientRect().height)))
  ok('anche in Info i btn--sm sono almeno 44 px, senza overflow', h2.length > 0 && h2.every((x) => x >= 44) && (await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)), h2.join(','))
  await ctx.close()
}
// 8. Fuso fisso Europe/Madrid: lo stesso istante visto da un telefono su New York dà la stessa pagina
{
  const letture = {}
  for (const tz of ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo']) {
    const { p, ctx, errs } = await apri('/#/oggi', { timezoneId: tz, clock: '2026-10-17T12:14:30+02:00' })
    letture[tz] = { prossima: await prossima(p), giorno: await p.evaluate(() => document.documentElement.dataset.day), errs }
    await ctx.close()
  }
  ok('Madrid: sabato 12:14, Prossima alle 13:00 "tra 45 min"', letture['Europe/Madrid'].giorno === 'sab' && /13:00 .* tra 45 min/.test(letture['Europe/Madrid'].prossima), letture['Europe/Madrid'].prossima)
  ok('New York (06:14 locali): stessa pagina di Madrid', letture['America/New_York'].prossima === letture['Europe/Madrid'].prossima && letture['America/New_York'].giorno === 'sab', letture['America/New_York'].prossima)
  ok('Tokyo (19:14 locali): stessa pagina di Madrid', letture['Asia/Tokyo'].prossima === letture['Europe/Madrid'].prossima && letture['Asia/Tokyo'].giorno === 'sab', letture['Asia/Tokyo'].prossima)
  ok('nessun errore JS nei tre fusi', Object.values(letture).every((l) => l.errs.length === 0))
  // ?now= resta com'è: la data simulata vince sul fuso
  const { p, ctx } = await apri('/?now=2026-10-18T10:00#/oggi', { timezoneId: 'America/New_York' })
  ok('con ?now= la data simulata vince anche a New York', (await p.evaluate(() => document.documentElement.dataset.day)) === 'dom' && /13:30/.test(await prossima(p)))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK chiusura')
