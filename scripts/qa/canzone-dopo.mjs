// QA dell'interruttore della canzone e del noindex. Dal 19 ottobre 2026 la canzone non esiste più: zero
// "canzone", "Disonesti", "coro", ".mp3", ".mp4" nel DOM di ogni vista e nelle richieste di rete; #/coro e
// canzone.html rimandano via. Il 17 ottobre c'è ancora tutto. Ogni pagina pubblicata ha il meta robots.
//   node scripts/qa/canzone-dopo.mjs http://localhost:4173
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const PAROLE = /canzone|disonesti|coro\b|\.mp3|\.mp4/i
async function apri(person, path, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = [], rete = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (r) => rete.push(r.url()))
  await p.addInitScript(({ person, extra }) => { try { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '0'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, JSON.stringify(v)) } catch {} }, { person, extra })
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs, rete }
}
const domHa = (p) => p.evaluate((src) => { const re = new RegExp(src, 'i'); const html = document.documentElement.outerHTML; const m = html.match(new RegExp(src, 'gi')) || []; return { n: m.length, esempi: [...new Set(m)].slice(0, 6) } }, PAROLE.source)
// 1. dopo: tutte le viste, con la missione m15 già completata e le novità ancora da leggere
for (const person of ['ale', 'monne']) {
  for (const path of ['#/oggi', '#/programma/ven', '#/mappa', '#/missioni', '#/info', '#/info/novita']) {
    const { p, ctx, errs, rete } = await apri(person, `/?now=2026-10-19T00:01${path}`, { 'b40:v1:missions': ['m15'] })
    if (path === '#/info' || path === '#/info/novita') await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
    const dom = await domHa(p)
    ok(`dopo, ${person} ${path}: zero parole della canzone nel DOM`, dom.n === 0, dom.esempi.join(' · '))
    const media = rete.filter((u) => /\.(mp3|mp4)(\?|$)/i.test(u) || /canzone|disonesti/i.test(u))
    ok(`dopo, ${person} ${path}: nessun audio o video richiesto`, media.length === 0, media.join(' | '))
    ok(`dopo, ${person} ${path}: nessun errore JS`, errs.length === 0, errs.join(' | '))
    if (path === '#/oggi') ok(`dopo, ${person}: nessuna nota nell'header`, (await p.locator('.header__music').count()) === 0)
    if (path === '#/missioni') ok(`dopo, ${person}: la missione "Coro Ufficiale" non c'è e non conta`, (await p.locator('[data-mission="m15"]').count()) === 0)
    await ctx.close()
  }
}
// 1b. la schermata "Missione compiuta" (fase dopo, dal 19 alle 01:40) non la cita
{
  const { p, ctx, rete } = await apri('ale', '/?now=2026-10-20T10:00#/oggi', { 'b40:v1:missions': ['m15'] })
  const dom = await domHa(p)
  ok('"Missione compiuta": c\'è e non cita la canzone', (await p.locator('h2:has-text("Missione compiuta")').count()) === 1 && dom.n === 0, dom.esempi.join(' · '))
  ok('"Missione compiuta": nessun audio o video richiesto', !rete.some((u) => /\.(mp3|mp4)(\?|$)/i.test(u)))
  await ctx.close()
}
// 2. dopo: #/coro rimanda a #/oggi; canzone.html rimanda alla home
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-19T00:01#/coro')
  const hash = await p.evaluate(() => location.hash)
  ok('dopo: #/coro porta a #/oggi, senza modalità coro', hash.startsWith('#/oggi') && (await p.locator('.coro').count()) === 0, hash)
  await p.goto(base + '/canzone.html?now=2026-10-19T00:01', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('dopo: canzone.html porta alla home', !/canzone/.test(await p.evaluate(() => location.href.replace(/^.*\/\/[^/]+/, ''))) && (await p.evaluate(() => location.hash)) !== '#/info/canzone', await p.evaluate(() => location.href))
  await p.goto(base + '/canzone.html?now=2026-10-17T10:00', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('prima: canzone.html porta ancora alla card', (await p.evaluate(() => location.hash)) === '#/info/canzone', await p.evaluate(() => location.hash))
  await ctx.close()
}
// 3. il 17 ottobre c'è ancora tutto: card in Oggi, nota nell'header, sezione in Info, coro, missione, media richiesti
{
  const { p, ctx, rete, errs } = await apri('ale', '/?now=2026-10-17T10:00#/oggi')
  ok('17 ottobre: card della canzone in Oggi, nota nell\'header', (await p.locator('.song').count()) === 1 && (await p.locator('.header__music').count()) === 1)
  ok('17 ottobre: il sito richiede l\'MP3 (o il video canvas)', rete.some((u) => /\.(mp3|mp4)/.test(u)), rete.filter((u) => /media/.test(u)).slice(0, 3).join(' | '))
  await p.goto(base + '/?now=2026-10-17T10:00#/info/canzone', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('17 ottobre: sezione "La canzone" in Info', (await p.locator('#sec-canzone').count()) === 1)
  await p.goto(base + '/?now=2026-10-17T10:00#/coro', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('17 ottobre: la modalità coro si apre', (await p.locator('.coro').count()) === 1)
  await p.goto(base + '/?now=2026-10-17T10:00#/missioni', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('17 ottobre: la missione "Coro Ufficiale" c\'è', (await p.locator('[data-mission="m15"]').count()) === 1)
  ok('17 ottobre: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 4. noindex su ogni pagina pubblicata e robots.txt che chiude
{
  const pagine = execSync('find dist -name "*.html"').toString().trim().split('\n')
  const senza = pagine.filter((f) => !/<meta\s+name="robots"\s+content="noindex,\s*nofollow,\s*noarchive"/i.test(readFileSync(f, 'utf8')))
  ok(`noindex su tutte le ${pagine.length} pagine del bundle`, pagine.length > 20 && senza.length === 0, senza.join(', '))
  ok('robots.txt: Disallow /', /Disallow:\s*\/\s*$/m.test(readFileSync('dist/robots.txt', 'utf8')))
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK canzone dopo')
