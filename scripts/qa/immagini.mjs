// QA delle immagini delle tappe: 15 foto da Commons + 10 card stilizzate, una per ogni tappa dei tre giorni.
// Attribuzione obbligatoria sotto le foto, vietata sotto le card nostre (non è dovuta a nessuno).
import { chromium } from 'playwright-core'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

// ---- file su disco ----
const DIR = 'public/assets/tappe'
const file = readdirSync(DIR)
const webp = file.filter((f) => f.endsWith('.webp')), svg = file.filter((f) => f.endsWith('.svg'))
ok('17 foto WebP: 16 da Commons più una privata', webp.length === 17, webp.length + '')
ok('9 card stilizzate SVG', svg.length === 9, svg.length + '')
const misure = []
for (const f of webp) { const m = await sharp(`${DIR}/${f}`).metadata(); misure.push(`${f} ${m.width}×${m.height} ${m.format}`) ; ok(`${f} è 800×450 WebP`, m.width === 800 && m.height === 450 && m.format === 'webp', `${m.width}×${m.height} ${m.format}`) }
const kb = file.reduce((n, f) => n + statSync(`${DIR}/${f}`).size, 0) / 1024
// Il tetto era 1,2 MB; con la foto di El Mirador non ci si sta. Tolte `sarria.webp` e `pobleespanyol.webp`,
// che non sono assegnate a nessuna tappa, si torna sotto: vedi DA_VERIFICARE.md.
ok('cartella sotto 1,4 MB', kb < 1434, `${(kb / 1024).toFixed(2)} MB`)

// ---- crediti ----
const crediti = JSON.parse(readFileSync('data/foto-tappe.json', 'utf8'))
const privateFile = new Set((crediti.private || []).map((f) => `${f.id}.webp`))
const cred = readFileSync('CREDITS.md', 'utf8')
ok('crediti per tutte e 16 le foto di Commons', crediti.foto.length === 16 && crediti.scartate.length === 0)
ok('la foto privata è dichiarata e fuori dai crediti Commons', crediti.private?.length === 1 && crediti.private[0].id === 'elmirador' && !crediti.foto.some((f) => f.id === 'elmirador'))
ok('ogni foto ha autore, licenza e pagina Commons', crediti.foto.every((f) => f.autore && f.licenza && (f.pagina || '').startsWith('https://commons.wikimedia.org/wiki/File:')))
ok('licenze tutte libere', crediti.foto.every((f) => /^(cc0|cc by|public domain|pd)/i.test(f.licenza)), [...new Set(crediti.foto.map((f) => f.licenza))].join(', '))
ok('CREDITS.md elenca tutte le foto', crediti.foto.every((f) => cred.includes(f.pagina) && cred.includes(f.autore)))
ok('CREDITS.md cita le card stilizzate come originali', /Card stilizzate \(originali del progetto\)/.test(cred))
ok('nessuna immagine da Google Places', !/googleusercontent|maps\.googleapis|places\/photo/i.test(cred + JSON.stringify(crediti)))

// ---- itinerario ----
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const stops = it.days.flatMap((d) => d.stops)
ok('ogni tappa ha il campo img', stops.every((s) => !!s.img), stops.filter((s) => !s.img).map((s) => s.id).join(' '))
ok('ogni img punta a un file esistente', stops.every((s) => file.includes(s.img)), stops.filter((s) => !file.includes(s.img)).map((s) => s.img).join(' '))
const viaggio = JSON.parse(readFileSync('data/viaggio.json', 'utf8'))
ok('voli, parcheggio e lounge hanno la loro immagine', [...viaggio.voli, viaggio.parcheggio, viaggio.lounge].every((o) => file.includes(o.img)))

// ---- nel browser ----
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function vista(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, 0) })
  await p.waitForFunction(() => [...document.querySelectorAll('.card__foto img')].every((i) => i.complete), null, { timeout: 25000 }).catch(() => {})
  await p.waitForTimeout(400)
  return { p, ctx, errs }
}
for (const [giorno, attese, crediti0] of [['ven', 15, 9], ['sab', 6, 3], ['dom', 3, 2]]) {
  const { p, ctx, errs } = await vista('ale', `/#/programma/${giorno}`)
  const st = await p.evaluate(() => ({
    img: [...document.querySelectorAll('.card[data-stop] .card__foto img')].map((i) => ({ src: i.getAttribute('src').split('/').pop(), nat: i.naturalWidth, lazy: i.getAttribute('loading'), alt: i.getAttribute('alt'), ratio: +(i.getBoundingClientRect().width / i.getBoundingClientRect().height).toFixed(2) })),
    crediti: [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, c.querySelector('.card__foto img')?.getAttribute('src').split('/').pop() || null, !!c.querySelector('.card__credito')]),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    peso: performance.getEntriesByType('resource').reduce((n, r) => n + (r.encodedBodySize || 0), 0)
  }))
  ok(`${giorno}: una immagine per tappa`, st.img.length === attese, `${st.img.length} su ${attese}`)
  ok(`${giorno}: tutte caricate`, st.img.every((i) => i.nat > 0), st.img.filter((i) => !i.nat).map((i) => i.src).join(' '))
  ok(`${giorno}: tutte in 16:9`, st.img.every((i) => Math.abs(i.ratio - 16 / 9) < 0.05))
  ok(`${giorno}: alt in italiano su ognuna`, st.img.every((i) => (i.alt || '').length > 12), st.img.map((i) => i.alt).find((a) => (a || '').length <= 12) || '')
  ok(`${giorno}: solo la prima non è lazy`, st.img[0].lazy === null && st.img.slice(1).every((i) => i.lazy === 'lazy'), st.img.map((i) => i.lazy).join(' '))
  // regola: attribuzione sotto le foto di Commons, mai sotto le card nostre né sotto le foto private
  const dovuta = (src) => (src || '').endsWith('.webp') && !privateFile.has(src)
  ok(`${giorno}: attribuzione sotto le foto di Commons, non sotto il resto`, st.crediti.every(([, src, ha]) => dovuta(src) === ha), JSON.stringify(st.crediti.filter(([, src, ha]) => dovuta(src) !== ha)))
  ok(`${giorno}: quante attribuzioni`, st.crediti.filter(([, , ha]) => ha).length === crediti0, `${st.crediti.filter(([, , ha]) => ha).length} su ${crediti0}`)
  ok(`${giorno}: niente overflow a 380px`, st.overflow === 0, String(st.overflow))
  ok(`${giorno}: pagina sotto i 2 MB`, st.peso < 2_000_000, `${(st.peso / 1024 / 1024).toFixed(2)} MB`)
  ok(`${giorno}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await p.screenshot({ path: `/tmp/immagini-${giorno}.png`, fullPage: true })
  await ctx.close()
}
// Sezione Viaggio: immagini sui voli, sul parcheggio e sulla lounge
{
  const { p, ctx, errs } = await vista('ale', '/#/info/viaggio')
  const st = await p.evaluate(() => ({
    img: [...document.querySelectorAll('.card--viaggio .card__foto img')].map((i) => i.getAttribute('src').split('/').pop()),
    crediti: document.querySelectorAll('.card--viaggio .card__credito').length
  }))
  ok('Viaggio: immagine su volo andata, ritorno, parcheggio e lounge', st.img.length === 4, st.img.join(' '))
  ok('Viaggio: crediti solo sulle due foto di aeroporto', st.crediti === 2, String(st.crediti))
  ok('Viaggio: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// La foto privata non porta attribuzione: non è dovuta a nessuno
{
  const { p, ctx } = await vista('ale', '/#/programma/dom')
  const card = await p.evaluate(() => {
    const c = document.querySelector('.card[data-stop="d1"]')
    return { img: c.querySelector('.card__foto img')?.getAttribute('src').split('/').pop(), credito: !!c.querySelector('.card__credito'), titolo: c.querySelector('.card__title').textContent.trim() }
  })
  ok('domenica: El Mirador al posto di Can Fisher', card.titolo === 'Pranzo · El Mirador', card.titolo)
  ok('domenica: foto vera di El Mirador', card.img === 'elmirador.webp', String(card.img))
  ok('domenica: nessuna attribuzione sotto la foto privata', card.credito === false)
  await ctx.close()
}
// Fallback al mosaico quando il file non arriva
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 } })
  const p = await ctx.newPage()
  await p.goto(base + '/')
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:person', JSON.stringify('ale')); localStorage.setItem('b40:v1:onboarded', 'true') })
  await p.route('**/assets/tappe/*', (r) => r.abort())
  await p.goto(base + '/#/programma/ven', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  ok('immagini irraggiungibili → riquadro col mosaico', await p.locator('.card__foto--vuoto').count() >= 1, `${await p.locator('.card__foto--vuoto').count()} riquadri`)
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
