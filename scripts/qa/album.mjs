// QA dell'album condiviso: visibilità per profilo, header, WhatsApp, missione m14, tab bar
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ALBUM = 'https://photos.app.goo.gl/mqfbvmyvrwXwRLPF6'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }


// Spunta una checkbox portandola al centro dello schermo: senza questo, un clic forzato
// può finire sulla tab bar fissa in fondo e navigare via.
async function tick(p, sel) {
  const el = p.locator(sel)
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await el.check()
  await p.waitForTimeout(350)
}

async function open(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  return { p, ctx, errs }
}

// Banner e icona header su tutti i profili, in Oggi e Info
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  for (const [label, path] of [['oggi', '/?now=2026-10-17T10:00#/oggi'], ['info', '/#/info']]) {
    const { p, ctx, errs } = await open(person, path)
    ok(`banner album in ${label} (${person})`, (await p.locator('.album').count()) >= 1)
    ok(`icona camera header in ${label} (${person})`, (await p.locator(`.header__camera[href="${ALBUM}"]`).count()) === 1)
    ok(`nessun errore JS in ${label} (${person})`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
}
// Icona camera in tutte le viste
{
  const { p, ctx } = await open('ale', '/#/oggi')
  for (const r of ['oggi', 'programma', 'mappa', 'missioni', 'info']) {
    await p.goto(`${base}/#/${r}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
    ok(`icona camera in #/${r}`, (await p.locator('.header__camera').count()) === 1)
  }
  await ctx.close()
}
// share-album: solo Alessandro, e proprio assente nel DOM per gli altri
for (const person of ['giulio', 'manuel', 'monne']) {
  const { p, ctx } = await open(person, '/#/info')
  // Cerca proprio il blocco e il suo testo: un link wa.me generico non basta come indizio,
  // perché la card della canzone ne ha uno legittimo, visibile a tutti.
  const inDom = await p.evaluate(() => document.body.innerHTML.includes('share-album') || document.body.innerHTML.includes("Manda l'album ai ragazzi"))
  ok(`share-album assente dal DOM (${person})`, (await p.locator('.share-album').count()) === 0 && !inDom)
  await ctx.close()
}
{
  const { p, ctx } = await open('ale', '/#/info')
  ok('share-album presente (ale)', (await p.locator('.share-album').count()) === 1)
  const href = await p.locator('.share-album__cta').getAttribute('href')
  ok('link wa.me', href.startsWith('https://wa.me/?text='))
  const text = decodeURIComponent(href.split('?text=')[1])
  ok('a capo preservati dopo encodeURIComponent', text.split('\n').length >= 12, `${text.split('\n').length} righe`)
  ok('album nel messaggio', text.includes(ALBUM))
  ok('URL del sito nel messaggio', /https:\/\/\S+/.test(text.split('orari e mappa:')[1] || ''))
  const only = await p.locator('.share-album a[aria-label*="solo il link"]').getAttribute('href')
  ok('link "solo il sito"', only.startsWith('https://wa.me/?text=') && decodeURIComponent(only).includes('preferiti'))
  ok('anteprima chiusa di default', (await p.locator('.share-album__preview[open]').count()) === 0)
  // Copia senza WhatsApp: usa solo gli appunti
  await p.locator('[data-share-copy]').click(); await p.waitForTimeout(400)
  ok('toast "Messaggio copiato"', (await p.locator('.toast').first().textContent()).includes('Messaggio copiato'))
  ok('appunti contengono il messaggio', (await p.evaluate(() => navigator.clipboard.readText())).includes(ALBUM))
  await ctx.close()
}
// Copia link album
{
  const { p, ctx } = await open('manuel', '/?now=2026-10-17T10:00#/oggi')
  await p.locator('[data-album-copy]').first().click(); await p.waitForTimeout(400)
  ok('toast "Link copiato"', (await p.locator('.toast').first().textContent()).includes('Link copiato, mandalo nel gruppo'))
  ok('appunti contengono il link', (await p.evaluate(() => navigator.clipboard.readText())) === ALBUM)
  await ctx.close()
}
// Missione m14 per tutti, 40 XP
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  const { p, ctx } = await open(person, '/?now=2026-10-17T12:00#/missioni')
  ok(`m14 presente (${person})`, (await p.locator('input[data-mission="m14"]').count()) === 1)
  const before = parseInt((await p.locator('.ring__label').first().textContent()).trim(), 10) || 0
  await tick(p, 'input[data-mission="m14"]')
  const after = parseInt((await p.locator('.ring__label').first().textContent()).trim(), 10) || 0
  ok(`m14 vale 40 XP (${person})`, after - before === 40, `${before} → ${after}`)
  await ctx.close()
}
// Tab bar sempre 5 voci
for (const [person, path] of [['ale', '/#/oggi'], ['monne', '/#/info'], ['giulio', '/#/mappa'], ['manuel', '/#/missioni']]) {
  const { p, ctx } = await open(person, path)
  ok(`tab bar 5 voci (${person} ${path})`, (await p.locator('#tabbar .tab').count()) === 5)
  await ctx.close()
}
// Oggi: banner primo blocco durante il weekend; prima del weekend sotto il countdown
{
  const { p, ctx } = await open('ale', '/?now=2026-10-17T10:00#/oggi')
  ok('durante il weekend: album primo blocco', await p.evaluate(() => document.querySelector('.view').firstElementChild.classList.contains('album')))
  await ctx.close()
}
{
  const { p, ctx } = await open('ale', '/?now=2026-10-15T20:00#/oggi')
  const order = await p.evaluate(() => [...document.querySelector('.view').children].map(e => e.className.split(' ')[0]))
  ok('prima del weekend: album dopo il countdown', order.indexOf('album') === 1, order.join(' → '))
  ok('checklist: voce "Manda l\'album" per ale', (await p.locator('.share-album').count()) === 1)
  await ctx.close()
}
{
  const { p, ctx } = await open('monne', '/?now=2026-10-15T20:00#/oggi')
  ok('checklist: share-album assente per monne', (await p.locator('.share-album').count()) === 0)
  await ctx.close()
}
{
  const { p, ctx } = await open('ale', '/?now=2026-10-18T21:00#/oggi')
  ok('dopo il weekend: "Guarda com\'è andata"', (await p.locator(`a[href="${ALBUM}"]:has-text("Guarda com")`).count()) === 1)
  await ctx.close()
}
// Info: "Foto" primo accordion, aperto
{
  const { p, ctx } = await open('ale', '/#/info')
  ok('Foto è il primo accordion', await p.evaluate(() => document.querySelector('.acc details').id === 'sec-foto'))
  ok('Foto aperto di default', await p.evaluate(() => document.querySelector('#sec-foto').open))
  await ctx.close()
}
// Nessun overflow dove c'è l'album
for (const [person, path] of [['ale', '/?now=2026-10-17T10:00#/oggi'], ['ale', '/#/info'], ['monne', '/#/info'], ['ale', '/?now=2026-10-15T20:00#/oggi']]) {
  const { p, ctx } = await open(person, path)
  ok(`no overflow ${path} (${person})`, !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)))
  await ctx.close()
}
await b.close()
for (const [s, n, x] of out) console.log(s, n, x ? `(${x})` : '')
console.log(`\n${out.filter(r => r[0] === '✓').length}/${out.length} test ok`)
