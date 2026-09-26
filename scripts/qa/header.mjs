// QA dell'header: il pallone dei rigori accanto a camera e musica, e la regola di impaginazione.
// A 380 px i tre tondi più il titolo non stanno su una riga: vanno tutti e tre sulla riga del
// profilo, a sinistra del chip. Il titolo non deve né stringersi né andare a capo.
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const shot = process.env.SHOT_DIR
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }

async function open(person, path, width = 380) {
  const ctx = await b.newContext({ viewport: { width, height: 800 }, isMobile: width < 600, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); if (x) localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(400)
  return { p, ctx, errs }
}
const box = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }, sel)

// Il titolo di riferimento: com'è senza nessun pulsante accanto (stessa pagina, azioni nascoste)
const { p: p0, ctx: c0 } = await open('ale', '/#/oggi')
await p0.addStyleTag({ content: '.header__actions{ display:none !important }' })
const titoloSolo = await box(p0, '.header__title')
const fsSolo = await p0.evaluate(() => getComputedStyle(document.querySelector('.header__title')).fontSize)
await c0.close()

// Ogni fase porta il suo segno in pagina: così il test sa di essere davvero in quella fase
const FASI = [['prima', '?now=2026-10-01T10:00', '.hero__label:has-text("Si parte")'], ['durante', '?now=2026-10-17T11:00', '.bento'], ['dopo', '?now=2026-10-20T10:00', 'h2:has-text("Missione compiuta")']]
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  for (const [fase, q, segno] of FASI) {
    const { p, ctx, errs } = await open(person, `/${q}#/oggi`)
    const tag = `${person} · ${fase}`
    ok(`siamo davvero nella fase ${fase} (${tag})`, (await p.locator(segno).count()) >= 1)
    const a = p.locator('.header__rigori')
    ok(`pallone presente (${tag})`, (await a.count()) === 1)
    ok(`va al gioco nella stessa scheda (${tag})`, (await a.getAttribute('href')) === 'rigori/' && (await a.getAttribute('target')) === null)
    ok(`aria-label (${tag})`, (await a.getAttribute('aria-label')) === 'Gioca ai rigori')
    const [r, c, m, chip, t] = await Promise.all(['.header__rigori', '.header__camera', '.header__music', '.person-chip', '.header__title'].map((s) => box(p, s)))
    ok(`ordine rigori · camera · musica · profilo (${tag})`, r.r <= c.l && c.r <= m.l && m.r <= chip.l, JSON.stringify([r.l, c.l, m.l, chip.l]))
    ok(`tutti sulla stessa riga del profilo (${tag})`, [r, c, m].every((x) => Math.abs(x.t - chip.t) < 1 && Math.abs(x.b - chip.b) < 1))
    ok(`i tondi sotto il titolo, non accanto (${tag})`, r.t >= t.b)
    ok(`il titolo non si stringe (${tag})`, Math.abs(t.w - titoloSolo.w) < 0.5 && (await p.evaluate(() => getComputedStyle(document.querySelector('.header__title')).fontSize)) === fsSolo, `${t.w} vs ${titoloSolo.w}`)
    ok(`il titolo non va a capo (${tag})`, t.h < 50, String(t.h))
    ok(`niente scorrimento laterale (${tag})`, (await p.evaluate(() => document.documentElement.scrollWidth)) <= 380)
    ok(`nessun errore JS (${tag})`, errs.length === 0, errs.join(' | '))
    if (shot && person === 'ale' && fase === 'durante') await p.screenshot({ path: `${shot}/header-380.png`, clip: { x: 0, y: 0, width: 380, height: 190 } })
    await ctx.close()
  }
}

// Stessi tre tondi, stessa misura, stesso bordo: cambia solo il colore
{
  const { p, ctx } = await open('ale', '/#/oggi')
  const stili = await p.evaluate(() => ['.header__rigori', '.header__camera', '.header__music'].map((s) => {
    const c = getComputedStyle(document.querySelector(s))
    return { w: c.width, h: c.height, bg: c.backgroundColor, bordo: c.border, raggio: c.borderRadius, colore: c.color, svg: getComputedStyle(document.querySelector(s + ' svg')).width }
  }))
  const [r, c, m] = stili
  ok('stesso diametro', r.w === c.w && r.w === m.w && r.h === c.h && r.w === '44px')
  ok('stesso sfondo e bordo', r.bg === c.bg && r.bg === m.bg && r.bordo === c.bordo && r.raggio === c.raggio)
  ok('stessa misura dell\'icona', r.svg === c.svg && r.svg === m.svg)
  ok('colore acqua #2CA6A4', r.colore === 'rgb(44, 166, 164)', r.colore)
  ok('tre colori diversi', new Set([r.colore, c.colore, m.colore]).size === 3)
  ok('icona a tratto, senza riempimento', await p.evaluate(() => { const s = document.querySelector('.header__rigori svg'); return s.getAttribute('fill') === 'none' && s.getAttribute('stroke') === 'currentColor' }))
  // tutte le viste con l'header lo mostrano
  for (const v of ['programma', 'mappa', 'missioni', 'info']) {
    await p.evaluate((x) => { location.hash = '#/' + x }, v)
    await p.waitForTimeout(700)
    ok(`pallone anche in ${v}`, (await p.locator('.header__rigori').count()) === 1)
    if (v === 'missioni') ok('la card dei rigori in Missioni resta', (await p.locator('.rigori-card [data-rigori]').count()) === 1)
  }
  await ctx.close()
}

// Evento GoatCounter: rigori-apri, lo stesso di Missioni e Info
{
  const { p, ctx } = await open('giulio', '/?stats=prova#/programma')
  await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault() }, true))
  await p.locator('.header__rigori').evaluate((e) => e.click())
  await p.waitForTimeout(200)
  const conte = await p.evaluate(() => window.__b40stats.conte.filter((c) => c.event).map((c) => c.path))
  ok('il pallone conta rigori-apri', conte.includes('giulio/rigori-apri'), conte.join(','))
  ok('una volta sola per tocco', conte.filter((c) => c === 'giulio/rigori-apri').length === 1)
  await ctx.close()
}

// Il clic porta davvero al gioco
{
  const { p, ctx } = await open('manuel', '/#/oggi')
  await p.locator('.header__rigori').click()
  await p.waitForURL(/\/rigori\/$/, { timeout: 10000 }).catch(() => {})
  ok('il clic apre il gioco nella stessa scheda', /\/rigori\/$/.test(p.url()), p.url())
  await ctx.close()
}

// Prima di scegliere il profilo: i tre tondi ci sono, niente chip
{
  const { p, ctx } = await open(null, '/#/oggi')
  ok('onboarding: pallone presente', (await p.locator('.header__rigori').count()) === 1 || (await p.locator('.header').count()) === 0)
  ok('onboarding: niente scorrimento laterale', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 380)
  await ctx.close()
}

// Schermi diversi: a 320 px ci sta ancora; su desktop i pulsanti tornano accanto al titolo
{
  const { p, ctx } = await open('ale', '/#/oggi', 320)
  const [chip, t, r] = await Promise.all(['.person-chip', '.header__title', '.header__rigori'].map((s) => box(p, s)))
  ok('320 px: una riga sola per i quattro', Math.abs(r.t - chip.t) < 1)
  ok('320 px: niente scorrimento laterale', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 320)
  ok('320 px: il titolo non va a capo', t.h < 50)
  await ctx.close()
}
{
  const { p, ctx } = await open('ale', '/#/oggi', 1024)
  const [t, r] = await Promise.all(['.header__title', '.header__rigori'].map((s) => box(p, s)))
  ok('desktop: i pulsanti stanno accanto al titolo', r.t < t.b)
  await ctx.close()
}

await b.close()
const bad = out.filter((r) => r[0] === '✗')
for (const r of bad) console.log(r[0], r[1], r[2] ? `(${r[2]})` : '')
console.log(`${out.length - bad.length}/${out.length} test ok`)
