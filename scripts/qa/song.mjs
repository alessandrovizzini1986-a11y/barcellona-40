// QA dell'inno: riproduzione, esclusività audio/video, download, preload, reduced motion
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }

async function open(person, path, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, ...opts })
  const p = await ctx.newPage()
  const errs = [], reqs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('request', (r) => reqs.push(r.url()))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  return { p, ctx, errs, reqs }
}

// Presenza e posizione
{
  const { p, ctx, errs } = await open('ale', '/?now=2026-10-17T10:00#/oggi')
  const order = await p.evaluate(() => [...document.querySelector('.view').children].map((e) => e.className.split(' ')[0]))
  ok('Oggi: inno secondo blocco, sotto l\'album', order[0] === 'album' && order[1] === 'song', order.slice(0, 3).join(' → '))
  ok('titolo "Disonesti"', (await p.locator('.song__title').textContent()) === 'Disonesti')
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await open('ale', '/?now=2026-10-15T20:00#/oggi')
  const order = await p.evaluate(() => [...document.querySelector('.view').children].map((e) => e.className.split(' ')[0]))
  ok('prima del weekend: inno dopo album e countdown', order.indexOf('song') === 2, order.slice(0, 4).join(' → '))
  await ctx.close()
}
{
  const { p, ctx } = await open('monne', '/#/info')
  const ids = await p.evaluate(() => [...document.querySelectorAll('.acc details')].map((d) => d.id))
  ok('Info: "La canzone" subito dopo "Foto"', ids[0] === 'sec-foto' && ids[1] === 'sec-canzone', ids.slice(0, 3).join(','))
  ok('"La canzone" aperta di default', await p.evaluate(() => document.querySelector('#sec-canzone').open))
  await ctx.close()
}
// Onboarding senza inno
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 } })
  const p = await ctx.newPage()
  await p.goto(base + '/'); await p.evaluate(() => localStorage.clear())
  await p.goto(base + '/#/oggi', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  ok('onboarding senza player', (await p.locator('.song').count()) === 0 && (await p.locator('.person-card').count()) === 4)
  await ctx.close()
}
// Header
{
  const { p, ctx } = await open('giulio', '/#/oggi')
  for (const r of ['oggi', 'programma', 'mappa', 'missioni', 'info']) {
    await p.goto(`${base}/#/${r}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(350)
    ok(`icona musica in #/${r}`, (await p.locator('.header__music[href="#/info/canzone"]').count()) === 1)
  }
  await p.locator('.header__music').click(); await p.waitForTimeout(600)
  ok('icona musica porta alla sezione aperta', (await p.evaluate(() => location.hash)) === '#/info/canzone' && (await p.evaluate(() => document.querySelector('#sec-canzone')?.open)) === true)
  ok('tab bar ancora 5 voci', (await p.locator('#tabbar .tab').count()) === 5)
  await ctx.close()
}
// preload: il video non deve essere scaricato all'apertura
{
  const { p, ctx, reqs } = await open('ale', '/#/info')
  ok('video non richiesto all\'apertura (preload none)', !reqs.some((u) => u.endsWith('.mp4')), reqs.filter((u) => u.includes('media')).map((u) => u.split('/').pop()).join(','))
  ok('poster richiesto', reqs.some((u) => u.includes('song-poster.jpg')))
  ok('attributo preload sul video', (await p.locator('[data-song-video]').getAttribute('preload')) === 'none')
  ok('playsinline presente', (await p.locator('[data-song-video]').getAttribute('playsinline')) !== null)
  ok('audio preload metadata', (await p.locator('[data-song-audio]').getAttribute('preload')) === 'metadata')
  await ctx.close()
}
// Riproduzione e mutua esclusione.
// Nota: il Chromium di Playwright è la build senza codec proprietari e non decodifica MP3/H.264,
// quindi la riproduzione vera non è testabile qui. Si verifica la logica del componente con
// eventi sintetici e spia sulle chiamate a pause(), che è esattamente ciò che il codice ascolta.
{
  const { p, ctx } = await open('ale', '/#/info')
  const A = '[data-song-audio]', V = '[data-song-video]'
  await p.evaluate(() => {
    window.__pauses = []
    const orig = HTMLMediaElement.prototype.pause
    HTMLMediaElement.prototype.pause = function () { window.__pauses.push(this.tagName.toLowerCase()); return orig.call(this) }
  })
  // play dell'audio → il video viene messo in pausa e il disco gira
  await p.locator(A).dispatchEvent('play'); await p.waitForTimeout(300)
  ok('play audio: il disco gira', (await p.locator('.song__disc--spin').count()) === 1)
  ok('play audio: mette in pausa il video', (await p.evaluate(() => window.__pauses)).includes('video'))
  await p.locator(A).dispatchEvent('pause'); await p.waitForTimeout(250)
  ok('pausa audio: il disco si ferma', (await p.locator('.song__disc--spin').count()) === 0)
  await p.locator(A).dispatchEvent('play'); await p.waitForTimeout(200)
  await p.locator(A).dispatchEvent('ended'); await p.waitForTimeout(250)
  ok('fine audio: il disco si ferma', (await p.locator('.song__disc--spin').count()) === 0)
  // play del video → l'audio viene messo in pausa e il disco non gira
  await p.evaluate(() => { window.__pauses = [] })
  await p.locator(V).dispatchEvent('play'); await p.waitForTimeout(300)
  ok('play video: mette in pausa l\'audio', (await p.evaluate(() => window.__pauses)).includes('audio'))
  ok('play video: il disco non gira', (await p.locator('.song__disc--spin').count()) === 0)
  // toggle: aprendo il video l'audio si ferma e sparisce
  await p.evaluate(() => { window.__pauses = [] })
  await p.locator('[data-song-toggle]').click(); await p.waitForTimeout(400)
  ok('toggle: video visibile', await p.locator(V).isVisible())
  ok('toggle: audio messo in pausa', (await p.evaluate(() => window.__pauses)).includes('audio'))
  ok('toggle: audio nascosto', await p.locator(A).isHidden())
  ok('toggle: aria-expanded aggiornato', (await p.locator('[data-song-toggle]').getAttribute('aria-expanded')) === 'true')
  await p.locator('[data-song-toggle]').click(); await p.waitForTimeout(400)
  ok('toggle: richiudendo torna l\'audio', await p.locator(A).isVisible() && await p.locator(V).isHidden())
  await ctx.close()
}
// Download
{
  const { p, ctx } = await open('manuel', '/#/info')
  const links = await p.locator('.song__downloads a').evaluateAll((els) => els.map((e) => ({ dl: e.getAttribute('download'), href: e.getAttribute('href') })))
  ok('download MP3 con nome corretto', links[0].dl === 'Disonesti - Barcelona 40.mp3' && links[0].href.endsWith('.mp3'), JSON.stringify(links[0]))
  ok('download video con nome corretto', links[1].dl === 'Disonesti - Barcelona 40.mp4' && links[1].href.endsWith('.mp4'), JSON.stringify(links[1]))
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('.song__downloads a').first().click()])
  ok('il download parte con il nome giusto', dl.suggestedFilename() === 'Disonesti - Barcelona 40.mp3', dl.suggestedFilename())
  await ctx.close()
}
// Condivisione e testo
{
  const { p, ctx } = await open('ale', '/#/info')
  const href = await p.locator('.song a[aria-label*="Manda l\'inno"]').getAttribute('href')
  const txt = decodeURIComponent(href.split('?text=')[1])
  ok('link wa.me per l\'inno', href.startsWith('https://wa.me/?text=') && txt.includes('Alza il volume'))
  ok('a capo preservati', txt.split('\n').length >= 3, `${txt.split('\n').length} righe`)
  ok('testo: segnaposto dichiarato da verificare', (await p.locator('.song__lyrics .badge--da_verificare').count()) === 1)
  ok('testo chiuso di default', (await p.locator('.song__lyrics[open]').count()) === 0)
  await ctx.close()
}
// prefers-reduced-motion
{
  const { p, ctx } = await open('ale', '/#/info', { reducedMotion: 'reduce' })
  await p.locator('[data-song-audio]').dispatchEvent('play'); await p.waitForTimeout(500)
  const anim = await p.locator('.song__disc svg').evaluate((el) => getComputedStyle(el).animationName)
  ok('con reduced motion il disco non ruota', anim === 'none', anim)
  await ctx.close()
}
// Nessun overflow a 380px
for (const [person, path] of [['ale', '/?now=2026-10-17T10:00#/oggi'], ['ale', '/#/info'], ['monne', '/?now=2026-10-15T20:00#/oggi']]) {
  const { p, ctx } = await open(person, path)
  ok(`no overflow ${path} (${person})`, !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)))
  await p.locator('[data-song-toggle]').first().click(); await p.waitForTimeout(500)
  ok(`no overflow con video aperto ${path}`, !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)))
  await ctx.close()
}
// Missione m15
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  const { p, ctx } = await open(person, '/?now=2026-10-17T12:00#/missioni')
  ok(`m15 presente (${person})`, (await p.locator('input[data-mission="m15"]').count()) === 1)
  const before = parseInt((await p.locator('.ring__label').first().textContent()).trim(), 10) || 0
  const el = p.locator('input[data-mission="m15"]')
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await el.check(); await p.waitForTimeout(350)
  const after = parseInt((await p.locator('.ring__label').first().textContent()).trim(), 10) || 0
  ok(`m15 vale 50 XP (${person})`, after - before === 50, `${before} → ${after}`)
  await ctx.close()
}
await b.close()
for (const [s, n, x] of out) console.log(s, n, x ? `(${x})` : '')
console.log(`\n${out.filter((r) => r[0] === '✓').length}/${out.length} test ok`)
