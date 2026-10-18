// QA della pagina "Grazie" (public/grazie/index.html, statica) e dei suoi aggangi nel sito: Open Graph con URL
// assoluti su /grazie/ e sulla home, cinque foto in galleria con lightbox a swipe, nomi veri, nessun overflow a
// 380 px, peso sotto 1,5 MB, la card "Il viaggio è finito → Grazie" in Oggi dopo il viaggio, la voce in Info.
// Richiede la build servita dal preview (vite preview serve dist/, dove public/ è copiato com'è).
//   node scripts/qa/grazie.mjs [http://localhost:4173]
import { chromium } from 'playwright-core'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const errori = []
const ok = (n, c, x = '') => { if (!c) errori.push(n); console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }
const DOMINIO = 'https://alessandrovizzini1986-a11y.github.io/barcellona-40/'

// ---- 1. i file ----
const FOTO = ['01_dom_santa-caterina_ale-giulio', '02_dom_mariposa-negra_brindisi-in-tre', '03_ven_braseria-sarria_ale-monne', '04_ven_santa-caterina_ale-monne', '05_ven_bar-joan_ale-monne']
ok('cinque foto in -full e -thumb WebP, più la striscia dei quattro per il hero', [...FOTO, '00_quattro_monne-giulio-manuel-ale'].every((f) => existsSync(`public/img/grazie/${f}-full.webp`) && existsSync(`public/img/grazie/${f}-thumb.webp`)))
ok('og-grazie.jpg (i quattro, composta il 18/10) sotto i 300 KB', existsSync('public/img/og-grazie.jpg') && statSync('public/img/og-grazie.jpg').size < 300 * 1024)
const html = readFileSync('public/grazie/index.html', 'utf8')
const meta = (p) => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1]
ok('OG: titolo, descrizione, immagine assoluta https con ?v=1, 1200×630, url assoluto, twitter card', meta('og:title') === 'Grazie, ragazzi — Barcelona 40' && meta('og:description') === 'Tre giorni, quattro amici, zero rimpianti. Le foto e due righe da Alessandro.' && meta('og:image') === `${DOMINIO}img/og-grazie.jpg?v=2` && meta('og:image:width') === '1200' && meta('og:image:height') === '630' && meta('og:url') === `${DOMINIO}grazie/` && /<meta name="twitter:card" content="summary_large_image"/.test(html) && meta('og:type') === 'website')
ok('hero: la striscia dei quattro, con Monne', /<header class="hero">\s*<img src="\.\.\/img\/grazie\/00_quattro_monne-giulio-manuel-ale-full\.webp"/.test(html) && /alt="I quattro del weekend[^"]*Monne/.test(html))
ok('nomi veri, nessun segnaposto', ['Alessandro', 'Giulio', 'Manuel', 'Monne'].every((n) => html.includes(n)) && !/placeholder|nome amico|TODO/i.test(html))
ok('il testo di Alessandro c\'è, parola per parola', html.includes("Quaranta anni si fanno una volta sola e io li ho fatti con voi, sotto un'allerta arancione") && html.includes('La prossima tappa la decidete voi. Io porto la torta.') && html.includes('— Alessandro'))
// Chi è chi (conferma di Alessandro del 18/10): maglia "Vizzini" = Manuel (suo cugino, Vizzini anche lui); capelli grigi e occhiali = Giulio
ok('tre card: Monne (Braseria), Giulio (Mariposa Negra, a sinistra), Manuel (Santa Caterina, maglia Vizzini)', /data-amico="monne"[\s\S]*03_ven_braseria-sarria[\s\S]*data-amico="giulio"[\s\S]*02_dom_mariposa-negra[\s\S]*data-amico="manuel"[\s\S]*01_dom_santa-caterina/.test(html))
ok('nomi nelle foto: Manuel con la maglia Vizzini, Giulio con la bottiglia a sinistra', /Manuel con la maglia bianca con la scritta Vizzini/.test(html) && /Giulio, a sinistra, alza la bottiglia/.test(html) && !/Giulio con la maglia/.test(html))
ok('WhatsApp: wa.me con il testo e l\'URL di /grazie/', html.includes('https://wa.me/?text=Grazie%20ragazzi%20%F0%9F%99%8F%20https%3A%2F%2Falessandrovizzini1986-a11y.github.io%2Fbarcellona-40%2Fgrazie%2F'))
ok('credito "foto: Alessandro" sotto ogni foto', (html.match(/foto: Alessandro/g) || []).length >= 5)
ok('GoatCounter conta /grazie', /data-goatcounter-settings='\{"path": "\/grazie"/.test(html))
ok('nessuna libreria esterna per il lightbox', !/<script[^>]+src="https?:\/\/(?!gc\.zgo\.at)/.test(html) && !/cdn\./.test(html))
// "placeholder" come attributo HTML (input della palestra, campo del token) è legittimo: si cercano i segnaposto di testo
const segnaposto = (f) => { try { const t = readFileSync(f, 'utf8'); return /nome amico|\bTODO\b/i.test(t) || /\bplaceholder\b(?!=|\{|"|-)/i.test(t.replace(/^\s*\/\/.*$/gm, '')) } catch { return false } }
ok('niente segnaposto nel sito (src e public)', ![...readdirSync('src', { recursive: true }).map((f) => 'src/' + f), ...readdirSync('public', { recursive: true }).map((f) => 'public/' + f)].filter((f) => /\.(js|html|css)$/.test(String(f))).some(segnaposto))
// la home: og:image nuova, descrizione nuova
const home = readFileSync('index.html', 'utf8')
ok('home: og:image = og-grazie.jpg?v=1 (jpeg) e la descrizione nuova', home.includes('content="%SITE_URL%img/og-grazie.jpg?v=2"') && home.includes('content="image/jpeg"') && home.includes("Il weekend dei 40 di Alessandro. Grazie a chi c'era."))
// changelog
const changelog = JSON.parse(readFileSync('data/changelog.json', 'utf8')).entries
ok('changelog: la voce sulla pagina Grazie', changelog.some((e) => /ringraziamenti con le foto/.test(e.voci.join(' ')) && /\/grazie/.test(e.voci.join(' '))))

// ---- 2. dal server: i meta si leggono con una GET semplice, senza JS, con status 200 ----
for (const [path, attese] of [['/grazie/', ['og:title', 'og:image', 'og:url', 'og:description']], ['/', ['og:image', 'og:description']]]) {
  const r = await fetch(base + path, { headers: { 'User-Agent': 'WhatsApp/2.23.20.0' } })
  const t = await r.text()
  const tag = (p) => (t.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1] || ''
  ok(`${path}: 200, HTML con i meta OG, URL assoluti https`, r.status === 200 && attese.every((p) => tag(p)) && /^https:\/\//.test(tag('og:image')) && (path === '/' || /^https:\/\//.test(tag('og:url'))), attese.map((p) => `${p}=${tag(p)}`).join(' '))
}
ok('/grazie/: la og:image risponde 200 ed è un JPEG', (await fetch(base + '/img/og-grazie.jpg').then((r) => r.ok && /image\/jpeg/.test(r.headers.get('content-type') || ''))))

// ---- 3. nel browser ----
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function apri(path, { person = 'ale', mobile = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: mobile, hasTouch: mobile })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript((x) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true'); localStorage.setItem('b40:v1:done', JSON.stringify(['f1', 'f2', 's4'])); localStorage.setItem('b40:v1:missions', JSON.stringify(['m9', 'm14'])) } catch {} }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
{
  const { p, ctx, errs } = await apri('/grazie/')
  ok('pagina: titolo in giallo sopra la foto', (await p.locator('.hero h1').innerText()) === 'Grazie, ragazzi.' && (await p.locator('.hero h1').evaluate((e) => getComputedStyle(e).color)) === 'rgb(242, 183, 5)')
  ok('pagina: cinque foto in galleria, due colonne', (await p.locator('#galleria [data-foto]').count()) === 5 && (await p.locator('#galleria').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)) === 2)
  ok('pagina: tre card con i nomi e i colori dei profili', (await p.locator('.amico__nome').allInnerTexts()).join(',') === 'Monne,Giulio,Manuel' && (await p.locator('[data-amico="giulio"]').evaluate((e) => getComputedStyle(e).borderLeftColor)) === 'rgb(61, 90, 128)')
  ok('pagina: i numeri del telefono (3 tappe, 2 missioni, 120 XP)', !(await p.locator('#numeri-sezione').evaluate((e) => e.hidden)) && (await p.locator('.tessera b').allInnerTexts()).join(',') === '3,2,120', (await p.locator('.tessera b').allInnerTexts()).join(','))
  ok('pagina: niente overflow a 380px', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0)
  // peso: hero full + 5 thumb + font + html, senza i -full della galleria (si caricano solo nel lightbox)
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, 0) })
  await p.waitForTimeout(800)
  const peso = await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => !/gc\.zgo\.at|goatcounter/.test(r.name)).reduce((n, r) => n + (r.encodedBodySize || r.transferSize || 0), 0))
  ok('pagina: primo caricamento sotto 1,5 MB', peso > 0 && peso < 1.5 * 1024 * 1024, `${(peso / 1024).toFixed(0)} KB`)
  ok('pagina: le -full della galleria non si scaricano prima del lightbox (solo quella del hero)', await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /-full\.webp/.test(r.name)).length) === 1)
  // lightbox
  await p.locator('#galleria [data-foto="0"]').tap(); await p.waitForTimeout(500)
  const lb = p.locator('#lightbox')
  ok('lightbox: si apre sulla prima foto, con la didascalia giorno + luogo', (await lb.evaluate((e) => e.dataset.aperta)) === 'true' && (await p.locator('#lightbox-img').getAttribute('src')).endsWith('04_ven_santa-caterina_ale-monne-full.webp') && /Venerdì 16/.test(await p.locator('#lightbox-did').innerText()) && /Mercat de Santa Caterina/.test(await p.locator('#lightbox-did').innerText()))
  ok('lightbox: a schermo pieno', await lb.evaluate((e) => { const r = e.getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight }))
  await p.locator('#lightbox-img').waitFor(); await p.waitForTimeout(300)
  await p.touchscreen.tap(300, 400)
  // swipe a sinistra → foto successiva
  await p.evaluate(() => { const lb = document.getElementById('lightbox'); const t = (type, x) => lb.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: lb, clientX: x, clientY: 400 })], changedTouches: [new Touch({ identifier: 1, target: lb, clientX: x, clientY: 400 })] })); t('touchstart', 300); t('touchend', 120) })
  await p.waitForTimeout(400)
  ok('lightbox: swipe a sinistra → seconda foto (Bar Joan)', (await p.locator('#lightbox-img').getAttribute('src')).endsWith('05_ven_bar-joan_ale-monne-full.webp') && /2 di 5/.test(await p.locator('#lightbox-did').innerText()), await p.locator('#lightbox-did').innerText())
  await p.evaluate(() => { const lb = document.getElementById('lightbox'); const t = (type, x) => lb.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: lb, clientX: x, clientY: 400 })], changedTouches: [new Touch({ identifier: 1, target: lb, clientX: x, clientY: 400 })] })); t('touchstart', 100); t('touchend', 300) })
  await p.waitForTimeout(400)
  ok('lightbox: swipe a destra → torna alla prima', (await p.locator('#lightbox-img').getAttribute('src')).endsWith('04_ven_santa-caterina_ale-monne-full.webp'))
  await p.locator('[data-succ]').tap(); await p.locator('[data-succ]').tap(); await p.locator('[data-succ]').tap(); await p.locator('[data-succ]').tap(); await p.waitForTimeout(300)
  ok('lightbox: le frecce girano tutte e cinque le foto', /5 di 5/.test(await p.locator('#lightbox-did').innerText()) && /Mariposa Negra/.test(await p.locator('#lightbox-did').innerText()))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  ok('lightbox: Esc chiude', (await lb.evaluate((e) => e.hidden)) === true)
  ok('pagina: il link "Torna al sito" porta alla home', (await p.locator('.torna').getAttribute('href')) === '../')
  ok('pagina: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// senza dati sul telefono: niente tessere, niente zeri
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto(base + '/grazie/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('telefono nuovo: la sezione dei numeri resta nascosta', await p.locator('#numeri-sezione').evaluate((e) => e.hidden))
  await ctx.close()
}
// Oggi dopo il viaggio: la card "Il viaggio è finito → Grazie" in cima
{
  const { p, ctx, errs } = await apri('/?now=2026-10-19T10:00#/oggi')
  const card = p.locator('[data-grazie]')
  ok('Oggi 19/10: la card "Il viaggio è finito" è il primo blocco e porta a /grazie/', (await card.count()) === 1 && /Il viaggio è finito/.test(await card.innerText()) && /Grazie/.test(await card.innerText()) && (await card.getAttribute('href')).endsWith('/grazie/') && await p.evaluate(() => document.querySelector('.view')?.firstElementChild?.hasAttribute('data-grazie')))
  ok('Oggi 19/10: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri('/?now=2026-10-17T12:00#/oggi')
  ok('Oggi durante il viaggio: nessuna card Grazie', (await p.locator('[data-grazie]').count()) === 0)
  await ctx.close()
}
// Info: la voce "Grazie"
{
  const { p, ctx } = await apri('/#/info/grazie')
  ok('Info: sezione Grazie aperta, col link alla pagina', (await p.locator('#sec-grazie').evaluate((e) => e.open)) && (await p.locator('#sec-grazie [data-grazie]').getAttribute('href')).endsWith('/grazie/'))
  ok('Info: nessuna tab nuova nella tab bar', (await p.locator('#tabbar a').count()) <= 5 && !/grazie/i.test(await p.locator('#tabbar').innerText()))
  await ctx.close()
}
// Blocco 1: la canzone non c'è più, da nessuna parte
{
  const { p, ctx } = await apri('/?now=2026-10-17T12:00#/info')
  const testo = await p.evaluate(() => document.body.innerText + ' ' + document.body.innerHTML)
  ok('nessuna traccia della canzone nel sito (Info, header, Oggi)', !/canzone|Disonesti|coro|\.mp3|vizzo_barcellona/i.test(testo) && (await p.locator('.header__music').count()) === 0)
  await p.goto(base + '/#/coro', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  ok('#/coro non esiste più: si torna a Oggi', !/coro/.test(await p.evaluate(() => location.hash)) || (await p.locator('.coro').count()) === 0)
  await ctx.close()
}
await b.close()
if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) }
console.log('OK grazie')
