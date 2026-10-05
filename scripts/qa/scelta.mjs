// QA della pagina "Scelta di Monne" (public/scelta-2ddyu6.html): file a sé con la sua anteprima WhatsApp.
// Meta og: assoluti e immagine presente; non linkata da nessuna parte; pulsanti con evento giusto e wa.me col
// numero cifra per cifra; voto salvato e ritrovato al ricaricamento; leggibile a 380 px; funziona con GoatCounter bloccato.
//   node scripts/qa/scelta.mjs [url base]
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const PAGINA = 'scelta-2ddyu6.html', NUMERO = '393474227732'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
// 1. sorgenti: meta og assoluti, immagine presente senza hash, pagina non linkata
const html = readFileSync('public/' + PAGINA, 'utf8')
const og = Object.fromEntries([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]+)"/g)].map((m) => [m[1], m[2]]))
ok('og:title, og:description, og:image, og:url, twitter:card presenti', ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'].every((k) => og[k]))
ok('og:image e og:url sono URL assoluti su github.io, og:url punta a questo file', og['og:image'] === 'https://alessandrovizzini1986-a11y.github.io/barcellona-40/assets/og-scelta.png' && og['og:url'] === 'https://alessandrovizzini1986-a11y.github.io/barcellona-40/' + PAGINA)
ok('og-scelta.png sta in public/assets senza hash, 1200×630', existsSync('public/assets/og-scelta.png') && og['og:image:width'] === '1200' && og['og:image:height'] === '630')
ok('noindex, nofollow, noarchive', /noindex, nofollow, noarchive/.test(og.robots || ''))
ok('la pagina non importa il bundle del sito', !/type="module"|\/src\/|assets\/main-/.test(html))
const cerca = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'node_modules' || e.name === '.git' ? [] : cerca(`${dir}/${e.name}`)) : [`${dir}/${e.name}`])
const linkata = [...cerca('src'), ...cerca('dist').filter((f) => /\.(js|html|css)$/.test(f) && !f.endsWith('/' + PAGINA)), 'index.html', 'public/canzone.html'].filter((f) => existsSync(f) && readFileSync(f, 'utf8').includes('scelta-2ddyu6'))
ok('non linkata da nessuna parte (sorgenti, bundle, index, canzone)', linkata.length === 0, linkata.join(' '))
// 2. nel browser: eventi, link WhatsApp, voto che resta, misure a 380 px, GoatCounter bloccato
async function apri({ blocca = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = [], conte = [], aperti = []
  p.on('pageerror', (e) => errs.push(e.message))
  // wa.me non è raggiungibile dalla sandbox: si risponde a mano e si legge l'URL della scheda aperta a caricamento finito
  await ctx.route('**/wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
  ctx.on('page', async (q) => { await q.waitForLoadState().catch(() => {}); aperti.push(q.url()); q.close().catch(() => {}) })
  await p.route('**/gc.zgo.at/**', (r) => blocca ? r.abort() : r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.goatcounter={count:function(d){(window.__conte=window.__conte||[]).push(d)}}' }))
  await p.route('**/barcellona40.goatcounter.com/**', (r) => r.fulfill({ status: 200, body: '' }))
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('qa:keep')) localStorage.clear() } catch {} })
  await p.goto(base + '/' + PAGINA, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
  return { p, ctx, errs, aperti, conte: () => p.evaluate(() => (window.__conte || []).map((d) => d.path)) }
}
{
  const { p, ctx, errs, aperti, conte } = await apri()
  ok('all\'apertura parte l\'evento scelta-aperta', (await conte()).includes('scelta-aperta'), (await conte()).join(','))
  const misure = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, bottoni: [...document.querySelectorAll('.btn')].map((e) => Math.round(e.getBoundingClientRect().height)), h1: getComputedStyle(document.querySelector('h1')).fontSize, titolo: document.querySelector('h1').innerText.replace(/\s+/g, ' '), sub: document.querySelector('.sub').innerText }))
  ok('a 380 px: nessun overflow, due pulsanti alti almeno 56 px', misure.overflow <= 0 && misure.bottoni.length === 2 && misure.bottoni.every((h) => h >= 56), JSON.stringify(misure.bottoni))
  ok('titolo e sottotitolo richiesti', misure.titolo === 'Venerdì alle 17:30, prima del Rooftop: dove andiamo?' && misure.sub === 'Due opzioni, tutte e due al coperto. Scegli tu.', misure.titolo)
  const card = await p.evaluate(() => [...document.querySelectorAll('.card')].map((c) => c.innerText.replace(/\s+/g, ' ')))
  ok('card A e B con prezzo, voto, durata, distanza, pro, contro, ideale se', /Casa Batlló.*≈40 €.*4,7 su 220\.602.*75 min.*9 min a piedi.*Pro.*Contro.*Ideale se/i.test(card[0]) && /Palau Macaya.*Gratis.*4,5 su 1\.611.*30 min.*15 min a piedi.*Pro.*Contro.*Ideale se/i.test(card[1]))
  const hrefA = await p.locator('[data-scelta="A"]').getAttribute('href'), hrefB = await p.locator('[data-scelta="B"]').getAttribute('href')
  ok('link A: wa.me/393474227732 con "Scelgo A · Casa Batlló 🐉"', hrefA.startsWith('https://wa.me/' + NUMERO + '?text=') && decodeURIComponent(hrefA.split('text=')[1]) === 'Scelgo A · Casa Batlló 🐉', hrefA)
  ok('link B: wa.me/393474227732 con "Scelgo B · Palau Macaya 🏛"', hrefB.startsWith('https://wa.me/' + NUMERO + '?text=') && decodeURIComponent(hrefB.split('text=')[1]) === 'Scelgo B · Palau Macaya 🏛', hrefB)
  ok('il numero è esattamente 39 347 422 7732, senza + né spazi', (hrefA.match(/wa\.me\/(\d+)/) || [])[1] === '393474227732' && (hrefB.match(/wa\.me\/(\d+)/) || [])[1] === '393474227732')
  await p.locator('[data-scelta="A"]').click(); await p.waitForTimeout(600)
  ok('tocco su A: evento voto-batllo', (await conte()).includes('voto-batllo'), (await conte()).join(','))
  ok('tocco su A: si apre WhatsApp (wa.me, scheda nuova)', aperti.some((u) => u.startsWith('https://wa.me/' + NUMERO)), aperti.join(' '))
  ok('tocco su A: "Ricevuto: hai scelto A", salvato in b40:scelta', /Ricevuto: hai scelto A · Casa Batlló\. Puoi cambiare idea toccando l'altro\./.test(await p.locator('#ricevuto').innerText()) && (await p.evaluate(() => localStorage.getItem('b40:scelta'))) === 'A')
  await p.locator('[data-scelta="B"]').click(); await p.waitForTimeout(500)
  ok('tocco su B dopo A: evento voto-macaya e il voto cambia', (await conte()).includes('voto-macaya') && (await p.evaluate(() => localStorage.getItem('b40:scelta'))) === 'B' && /hai scelto B/.test(await p.locator('#ricevuto').innerText()))
  // (l'init script pulisce lo storage a ogni caricamento: qa:keep in sessionStorage gli dice di lasciare stare)
  await p.evaluate(() => sessionStorage.setItem('qa:keep', '1')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  ok('riaprendo la pagina il voto si ritrova ("hai scelto B", pulsante B evidenziato)', /hai scelto B/.test(await p.locator('#ricevuto').innerText()) && (await p.locator('.btn.scelto[data-scelta="B"]').count()) === 1)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx, errs, aperti } = await apri({ blocca: true })
  await p.locator('[data-scelta="B"]').click(); await p.waitForTimeout(600)
  ok('con GoatCounter bloccato: WhatsApp si apre lo stesso e la pagina conferma', aperti.some((u) => u.startsWith('https://wa.me/' + NUMERO)) && /hai scelto B/.test(await p.locator('#ricevuto').innerText()) && errs.length === 0, errs.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK scelta')
