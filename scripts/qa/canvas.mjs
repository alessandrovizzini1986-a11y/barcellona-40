// QA del canvas papera: attributi, poster, reduced motion, gradiente, link di condivisione, pagina ponte
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }
async function open(person, path, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, ...opts })
  const p = await ctx.newPage(); const errs = [], reqs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (r) => reqs.push(r.url()))
  await p.goto(base + '/'); await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  return { p, ctx, errs, reqs }
}
{
  const { p, ctx, errs, reqs } = await open('ale', '/#/info')
  const v = p.locator('[data-song-canvas]')
  ok('video canvas presente', (await v.count()) === 1)
  for (const a of ['autoplay', 'muted', 'loop', 'playsinline']) ok(`attributo ${a}`, (await v.getAttribute(a)) !== null)
  ok('muted anche come proprietà', await v.evaluate((e) => e.muted === true))
  ok('poster = CANVAS_POSTER', (await v.getAttribute('poster')).endsWith('/media/disonesti-canvas-poster.jpg'))
  ok('sorgente = CANVAS_MP4', (await v.locator('source').getAttribute('src')).endsWith('/media/disonesti-canvas.mp4'))
  ok('aria-hidden e fuori dal tab order', (await v.getAttribute('aria-hidden')) === 'true' && (await v.getAttribute('tabindex')) === '-1')
  const cs = await v.evaluate((e) => { const s = getComputedStyle(e); return { fit: s.objectFit, pos: s.objectPosition, z: s.zIndex } })
  ok('object-fit cover', cs.fit === 'cover', cs.fit)
  ok('object-position center 60%', /50% 60%|center 60%/.test(cs.pos), cs.pos)
  ok('canvas dietro al contenuto', await p.evaluate(() => { const v = document.querySelector('[data-song-canvas]'), t = document.querySelector('.song__title'); return +getComputedStyle(v).zIndex < +getComputedStyle(t.closest('.song > *')).zIndex }))
  const g = await p.locator('.song__shade').evaluate((e) => getComputedStyle(e).backgroundImage)
  ok('gradiente .25 in alto → .88 in basso', g.includes('rgba(14, 17, 22, 0.25)') && g.includes('rgba(14, 17, 22, 0.88)'), g.slice(0, 90))
  // Il muso della papera sta nel 45% alto del video: deve restare sopra il titolo
  ok('titolo e pulsanti in basso, muso della papera libero in alto', await p.evaluate(() => { const s = document.querySelector('.song').getBoundingClientRect(), v = document.querySelector('.song__canvas').getBoundingClientRect(), t = document.querySelector('.song__head').getBoundingClientRect(); return (t.top - s.top) >= 0.45 * v.height && Math.abs(v.top - s.top) <= 3 /* bordo 2px */ }))
  ok('su telefono il video tiene il 3:4, non copre tutta la card', await p.evaluate(() => { const s = document.querySelector('.song').getBoundingClientRect(), v = document.querySelector('.song__canvas').getBoundingClientRect(); return Math.abs(v.width / v.height - 540 / 720) < 0.02 && v.height < s.height }))
  ok('il canvas viene richiesto (autoplay)', reqs.some((u) => u.endsWith('disonesti-canvas.mp4')))
  ok('il video grande resta a preload none', !reqs.some((u) => u.endsWith('vizzo_barcellona_hit.mp4')))
  const href = await p.locator('.song a[aria-label*="Manda l\'inno"]').getAttribute('href')
  ok('condivisione punta a canzone.html', decodeURIComponent(href).includes('/canzone.html'))
  ok('nessun overflow', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } }); const p = await ctx.newPage()
  await p.goto(base + '/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('ale')) })
  await p.goto(base + '/#/info', { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  ok('desktop: il video copre tutta la card', await p.evaluate(() => { const s = document.querySelector('.song').getBoundingClientRect(), v = document.querySelector('.song__canvas').getBoundingClientRect(); return Math.abs(v.height - s.height) <= 5 /* bordo 2px per lato */ }))
  await ctx.close()
}
{
  const { p, ctx, reqs } = await open('ale', '/#/info', { reducedMotion: 'reduce' })
  ok('reduced motion: nessun <video> canvas', (await p.locator('[data-song-canvas]').count()) === 0)
  const still = p.locator('.song__canvas--still')
  ok('reduced motion: poster statico', (await still.count()) === 1 && (await still.evaluate((e) => getComputedStyle(e).backgroundImage)).includes('disonesti-canvas-poster.jpg'))
  ok('reduced motion: il canvas mp4 non viene scaricato', !reqs.some((u) => u.endsWith('disonesti-canvas.mp4')))
  await ctx.close()
}
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 } }); const p = await ctx.newPage()
  await p.goto(base + '/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('monne')) })
  await p.goto(base + '/canzone.html'); await p.waitForTimeout(900)
  ok('canzone.html porta alla card della canzone', (await p.evaluate(() => location.hash)) === '#/info/canzone' && (await p.locator('.song').count()) === 1, await p.url())
  await ctx.close()
}
{
  const { p, ctx } = await open('giulio', '/?now=2026-10-17T10:00#/oggi')
  ok('canvas anche nella card di Oggi', (await p.locator('.song [data-song-canvas], .song .song__canvas--still').count()) === 1)
  await ctx.close()
}
await b.close()
for (const [s, n, x] of out) console.log(s, n, x ? `(${x})` : '')
console.log(`\n${out.filter((r) => r[0] === '✓').length}/${out.length} test ok`)
