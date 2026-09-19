// QA del venerdì nuovo: passeggiata a livello strada, foto da Commons con attribuzione, sezioni Info rimosse.
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

async function apri(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(450)
  return { p, ctx, errs }
}
// scorre la pagina per far partire le lazy, poi aspetta che siano decodificate davvero
async function fotoPronte(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, 0) })
  await p.waitForFunction(() => [...document.querySelectorAll('.card__foto img')].every((i) => i.complete), null, { timeout: 20000 })
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

// 1. La sequenza del venerdì
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/ven')
  await fotoPronte(p)
  const tappe = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, c.querySelector('.card__title').textContent.trim()]))
  const ids = tappe.map((t) => t[0])
  const attesi = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14']
  ok('quattordici tappe, dalla mattina alla cena', ids.length === attesi.length, ids.join(' '))
  ok('ordine f1→f14', JSON.stringify(ids) === JSON.stringify(attesi), ids.join(' '))
  const titoli = tappe.map((t) => t[1]).join(' | ')
  for (const atteso of ['Parc de la Ciutadella', 'Santa Maria del Mar', 'Carrer de Montcada', 'Pont del Bisbe', 'Sant Felip Neri', 'Duck Store', 'Santa Caterina', 'Bar Joan'])
    ok(`in programma: ${atteso}`, titoli.includes(atteso))
  const testo = (await p.locator('body').innerText()).toLowerCase()
  ok('nessun Chao Pescao', !testo.includes('chao'))
  ok('niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))

  // 2. Immagini: qui solo il minimo, il resto lo controlla scripts/qa/immagini.mjs
  const img = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, c.querySelector('.card__foto img')?.getAttribute('src').split('/').pop() || null]))
  ok('ogni tappa del venerdì ha la sua immagine', img.every(([, src]) => !!src), img.filter(([, s2]) => !s2).map(([id]) => id).join(' '))
  ok('Duck Store e Bar Joan hanno la card stilizzata', img.find(([id]) => id === 'f7')?.[1] === 'duckstore.svg' && img.find(([id]) => id === 'f9')?.[1] === 'barjoan.svg')
  ok('orario sopra la foto', (await p.locator('.card[data-stop="f3"] .card__foto-time').innerText()) === '10:15')
  const peso = await p.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.encodedBodySize || 0), 0))
  ok('pagina sotto i 2 MB', peso < 2_000_000, `${(peso / 1024 / 1024).toFixed(2)} MB`)
  await p.screenshot({ path: '/tmp/venerdi-programma.png', fullPage: true })
  await ctx.close()
}

// 4. Sezioni Info
{
  const { p, ctx, errs } = await apri('ale', '/#/info')
  const ids = await p.evaluate(() => [...document.querySelectorAll('.acc > details')].map((d) => d.id))
  ok('restano sette sezioni, nell'+"'"+'ordine giusto', JSON.stringify(ids) === JSON.stringify(['sec-viaggio', 'sec-foto', 'sec-canzone', 'sec-extra', 'sec-apt', 'sec-profilo', 'sec-verifiche']), ids.join(' '))
  for (const [via, id] of [['Documenti', 'doc'], ['eSIM', 'esim'], ['Regole anti-mal di testa', 'rules'], ['Numeri utili', 'num']])
    ok(`sezione rimossa: ${via}`, await p.locator(`#sec-${id}`).count() === 0)
  ok('Info senza errori JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 5. Checklist pre-partenza sparita
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-01T10:00#/oggi')
  ok('nessuna checklist pre-partenza', await p.locator('input[data-prep]').count() === 0)
  ok('il countdown resta', await p.locator('.countdown').count() === 1)
  await ctx.close()
}

// 6. Mappa: marker e percorso del venerdì aggiornati
{
  const { p, ctx, errs } = await apri('ale', '/#/mappa')
  await p.waitForTimeout(1500)
  const numeri = await p.evaluate(() => [...document.querySelectorAll('.marker span')].map((s) => +s.textContent))
  ok('marker del venerdì numerati 1…11', JSON.stringify(numeri.slice(0, 11)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), numeri.join(' '))
  // la mappa disegna i vettori su canvas (preferCanvas), non in SVG: il canvas nell'overlay esiste solo
  // quando c'è almeno una polilinea, quindi è lui la prova che il percorso è stato disegnato
  ok('percorso disegnato (canvas dei vettori)', await p.locator('.leaflet-overlay-pane canvas').count() >= 1)
  ok('Mappa senza errori JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
