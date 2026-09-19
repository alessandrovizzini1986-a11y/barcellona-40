// QA della sezione Viaggio: timeline nei giorni giusti, QR nitido e a schermo pieno su bianco,
// checklist persistente, niente lounge all'andata, 380px senza overflow.
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

async function apri(person, path, ctxIn = null) {
  const ctx = ctxIn || await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  if (!ctxIn) {
    await p.goto(base + '/')
    await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') }, person)
  }
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(450)
  return { p, ctx, errs }
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

// 1. Timeline solo nei giorni giusti
{
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-16T03:00#/oggi')
  const t = await p.locator('.viaggio-oggi').first()
  ok('16/10 03:00 · timeline andata in cima a Oggi', await t.count() === 1)
  const testo = await p.locator('.viaggio-oggi').first().innerText().catch(() => '')
  ok('16/10 · contiene sveglia, P2 e FR2097', /03:30/.test(testo) && /P2/.test(testo) && /FR2097/.test(testo), testo.split('\n').slice(0, 3).join(' / '))
  ok('16/10 03:00 · nessun passo ancora iniziato', await p.locator('.viaggio-step.is-now').count() === 0)
  const primo = await p.evaluate(() => { const s = document.querySelector('.view'); return s.firstElementChild?.className || '' })
  ok('16/10 · la timeline è il primo blocco della vista', primo.includes('viaggio-oggi'), primo)
  ok('16/10 · nessun riferimento a lounge all\'andata', !/lounge|canudas/i.test(testo))
  ok('16/10 · niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  ok('16/10 · nessun errore JS', errs.length === 0, errs.join(' | '))
  await p.screenshot({ path: '/tmp/viaggio-oggi-ven.png', fullPage: false })
  await ctx.close()
}
{
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-18T19:00#/oggi')
  const testo = await p.locator('.viaggio-oggi').first().innerText().catch(() => '')
  ok('18/10 19:00 · timeline ritorno in cima', (await p.locator('.viaggio-oggi').count()) === 1)
  ok('18/10 · avviso giallo su Canudas', /Canudas chiude alle 23:00/.test(testo))
  ok('18/10 · contiene doccia, FR5220 e ritiro auto', /Doccia/.test(testo) && /FR5220/.test(testo) && /Ritiro auto/.test(testo))
  ok('18/10 · niente overflow a 380px', await overflow(p) === 0)
  ok('18/10 · nessun errore JS', errs.length === 0, errs.join(' | '))
  await p.screenshot({ path: '/tmp/viaggio-oggi-dom.png' })
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-17T10:00#/oggi')
  ok('17/10 · nessuna timeline di viaggio il sabato', (await p.locator('.viaggio-oggi').count()) === 0)
  await ctx.close()
}
{
  const { p, ctx } = await apri('giulio', '/?now=2026-10-16T03:00#/oggi')
  ok('16/10 · Giulio non vede la timeline di Alessandro', (await p.locator('.viaggio-oggi').count()) === 0)
  await ctx.close()
}

// 2. Programma: i passi entrano nella timeline del giorno, in ordine
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/ven')
  // l'orario sta in .card__time sulle card senza immagine e in .card__foto-time su quelle con l'immagine
  const orari = await p.locator('.timeline .card__time, .timeline .card__foto-time').allInnerTexts()
  // il testo dell'orario può portarsi dietro la tilde dello "stimato" e l'etichetta del giorno dopo
  const puliti = orari.map((t) => (t.match(/\d{2}:\d{2}/) || [''])[0])
  const ordinati = [...puliti].sort()
  ok('programma ven · passi di viaggio in timeline', puliti.includes('03:30') && puliti.includes('06:20'), puliti.join(' '))
  ok('programma ven · ordine cronologico', JSON.stringify(puliti) === JSON.stringify(ordinati), puliti.join(' '))
  ok('programma ven · atterraggio non duplicato', puliti.filter((t) => t === '08:05').length === 1)
  ok('programma ven · niente overflow', await overflow(p) === 0)
  ok('programma ven · nessun errore JS', errs.length === 0, errs.join(' | '))
  await p.screenshot({ path: '/tmp/viaggio-programma-ven.png', fullPage: true })
  // il passo attivo si accende sul passo in corso, non prima
  const m = await apri('ale', '/?now=2026-10-16T04:30#/oggi', ctx)
  ok('16/10 04:30 · il passo attivo è la navetta delle 04:20', (await m.p.locator('.viaggio-step.is-now time').innerText().catch(() => '')) === '04:20')
  ok('16/10 04:30 · i passi già fatti restano spenti', await m.p.locator('.viaggio-step.is-past').count() === 2)
  const d = await apri('ale', '/#/programma/dom', ctx)
  const oDom = (await d.p.locator('.timeline .card__time, .timeline .card__foto-time').allInnerTexts()).map((t) => (t.match(/\d{2}:\d{2}/) || [''])[0])
  ok('programma dom · fine Bunkers non duplicata (19:00 assente)', !oDom.includes('19:00'), oDom.join(' '))
  ok('programma dom · contiene 23:05 e 01:10', oDom.includes('23:05') && oDom.includes('01:10'), oDom.join(' '))
  await d.p.screenshot({ path: '/tmp/viaggio-programma-dom.png', fullPage: true })
  await ctx.close()
}

// 3. QR: dimensione, nitidezza, schermo pieno bianco
{
  const { p, ctx, errs } = await apri('ale', '/#/info/viaggio')
  await p.waitForTimeout(400)
  const img = p.locator('.qr-img')
  ok('info · card parcheggio col QR', await img.count() === 1)
  const box = await img.boundingBox()
  ok('QR nella card ≥ 200px di lato', box.width >= 200 && box.height >= 200, `${Math.round(box.width)}×${Math.round(box.height)}`)
  const nat = await img.evaluate((e) => [e.naturalWidth, e.naturalHeight, getComputedStyle(e).imageRendering])
  ok('QR sorgente 1024×1024 e image-rendering pixelated', nat[0] === 1024 && nat[1] === 1024 && nat[2] === 'pixelated', nat.join(' '))
  ok('didascalia sotto il QR', (await p.locator('.qr-cap').innerText()) === 'P2 · codice 2932537 · Alessandro Vizzini')
  // due tap: il primo apre l'accordion (già aperto via #/info/viaggio), il secondo il QR
  await img.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await p.locator('.qr-box').click()
  await p.waitForTimeout(350)
  const full = p.locator('.qr-full')
  ok('QR a schermo pieno dopo il tap', await full.count() === 1)
  const sfondo = await full.evaluate((e) => getComputedStyle(e).backgroundColor)
  ok('sfondo bianco a schermo pieno', sfondo === 'rgb(255, 255, 255)', sfondo)
  const fb = await full.locator('img').boundingBox()
  ok('QR grande quanto lo schermo permette', fb.width >= 340, `${Math.round(fb.width)}px su 380`)
  const scala = await full.locator('img').evaluate((e) => e.getBoundingClientRect().width / e.naturalWidth)
  ok('nessun ingrandimento oltre la sorgente (niente sfocatura)', scala <= 1, `scala ${scala.toFixed(2)}`)
  ok('didascalia sempre visibile a schermo pieno', /2932537/.test(await full.innerText()))
  await p.screenshot({ path: '/tmp/viaggio-qr-full.png' })
  await p.locator('.qr-full').click()
  await p.waitForTimeout(300)
  ok('si chiude toccando', await p.locator('.qr-full').count() === 0)
  ok('info · niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  ok('info · nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 4. Checklist persistente e riservata ad Alessandro
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p1 = await ctx.newPage()
  await p1.goto(base + '/')
  await p1.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('ale')); localStorage.setItem('b40:v1:onboarded', 'true') })
  await p1.goto(base + '/#/info/viaggio', { waitUntil: 'networkidle' })
  await p1.waitForTimeout(400)
  const cb = p1.locator('input[data-viaggio-check="b3"]')
  ok('checklist visibile ad Alessandro', await cb.count() === 1)
  await cb.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await cb.check()
  await p1.waitForTimeout(250)
  const chiave = await p1.evaluate(() => localStorage.getItem('b40:v1:checklist:viaggio'))
  ok('scritta nella chiave b40:v1:checklist:viaggio', chiave === '["b3"]', String(chiave))
  await p1.close()
  const p2 = await ctx.newPage() // stessa origine: come riaprire il browser
  await p2.goto(base + '/#/info/viaggio', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(400)
  ok('la spunta sopravvive alla riapertura', await p2.locator('input[data-viaggio-check="b3"]').isChecked())
  await ctx.close()
}
for (const person of ['monne', 'giulio', 'manuel']) {
  const { p, ctx } = await apri(person, '/#/info/viaggio')
  const dom = await p.evaluate(() => document.body.innerHTML)
  ok(`checklist assente dal DOM (${person})`, !dom.includes('data-viaggio-check'))
  ok(`QR del parcheggio non mostrato a ${person}`, !dom.includes('qr-parcheggio-p2'))
  await ctx.close()
}

// 5. Nessuna lounge all'andata, in tutto il sito
{
  const { p, ctx } = await apri('ale', '/#/info/viaggio')
  const testo = (await p.locator('body').innerText()).toLowerCase()
  const iLounge = testo.indexOf('canudas')
  ok('la lounge compare solo legata al ritorno', iLounge >= 0 && /solo al ritorno|domenica/.test(testo.slice(Math.max(0, iLounge - 200), iLounge + 200)))
  ok('nessuna lounge di Bologna', !/lounge.{0,40}bologna|bologna.{0,40}lounge/.test(testo))
  await ctx.close()
}

await b.close()
console.log(`\n${out.filter((r) => r[0] === '✓').length}/${out.length} controlli passati`)
