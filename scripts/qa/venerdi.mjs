// QA del venerdì nuovo: passeggiata a livello strada, foto da Commons con attribuzione, sezioni Info rimosse.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
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
  await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') }, person)
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
  const attesi = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15']
  ok('quindici tappe, dalla mattina alla cena', ids.length === attesi.length, ids.join(' '))
  ok('ordine f1→f15', JSON.stringify(ids) === JSON.stringify(attesi), ids.join(' '))
  ok('El Born non c\'è col sereno', !ids.includes('f2b'))
  const titoli = tappe.map((t) => t[1]).join(' | ')
  for (const atteso of ['Parc de la Ciutadella', 'Santa Maria del Mar', 'Carrer de Montcada', 'Pont del Bisbe', 'Sant Felip Neri', 'Duck Store', 'Santa Caterina', 'Bar Joan', 'Jamón da Debón'])
    ok(`in programma: ${atteso}`, titoli.includes(atteso))
  const testo = (await p.locator('body').innerText()).toLowerCase()
  ok('nessun Chao Pescao', !testo.includes('chao'))
  ok('niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))

  // 2. Immagini: qui solo il minimo, il resto lo controlla scripts/qa/immagini.mjs
  const img = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, c.querySelector('.card__foto img')?.getAttribute('src').split('/').pop() || null]))
  ok('ogni tappa del venerdì ha la sua immagine', img.every(([, src]) => !!src), img.filter(([, s2]) => !s2).map(([id]) => id).join(' '))
  ok('Duck Store e Bar Joan hanno la card stilizzata', img.find(([id]) => id === 'f7')?.[1] === 'duckstore.svg' && img.find(([id]) => id === 'f9')?.[1] === 'barjoan.svg')
  ok('orario sopra la foto', (await p.locator('.card[data-stop="f3"] .card__foto-time').innerText()) === '10:30')
  const peso = await p.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.encodedBodySize || 0), 0))
  ok('pagina sotto i 2 MB', peso < 2_000_000, `${(peso / 1024 / 1024).toFixed(2)} MB`)
  await p.screenshot({ path: '/tmp/venerdi-programma.png', fullPage: true })
  await ctx.close()
}

// 3b. Durate, jamón dopo pranzo, conto della giornata e modalità pioggia
{
  // stessi numeri calcolati qui, in modo indipendente dal sito: se le due somme non coincidono, è un errore
  const ven = JSON.parse(readFileSync('data/itinerary.json', 'utf8')).days[0].stops
  const fmt = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`)
  const conto = (pioggia) => {
    const list = ven.filter((s) => !s.soloPioggia || pioggia)
    const i0 = list.findIndex((s) => s.durataMin != null)
    let i1 = i0; while (i1 + 1 < list.length && list[i1 + 1].durataMin != null) i1++
    const catena = list.slice(i0, i1 + 1), dopo = list[i1 + 1]
    const dur = (s) => (pioggia && s.durataPioggiaMin != null ? s.durataPioggiaMin : s.durataMin)
    const passo = (s) => (pioggia && s.distPioggia ? s.distPioggia.min : s.minFromPrev) || 0
    const soste = catena.reduce((n, s) => n + dur(s), 0)
    const cammino = catena.slice(1).reduce((n, s) => n + passo(s), 0) + passo(dopo)
    return { soste, cammino, totale: soste + cammino }
  }

  const { p, ctx, errs } = await apri('ale', '/#/programma/ven')
  const durate = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.chips')?.innerText || '').replace(/\n/g, ' ')]))
  const conDurata = ['f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10']
  ok('ogni tappa della mattina ha il chip della durata', conDurata.every((id) => /\d+ (min|h)/.test((durate.find(([x]) => x === id) || [])[1] || '')), JSON.stringify(durate.filter(([id]) => conDurata.includes(id)).map(([id, t]) => id + ':' + t).slice(0, 3)))
  ok('Bar Joan: sosta di 1 h 15 min', /1 h 15 min/.test((durate.find(([x]) => x === 'f9') || [])[1] || ''))
  const ordine = durate.map(([id]) => id)
  ok('il jamón viene dopo il pranzo', ordine.indexOf('f10') === ordine.indexOf('f9') + 1)
  ok('il mercato delle 12:20 non parla più di jamón', !(await p.locator('.card[data-stop="f8"]').innerText()).toLowerCase().includes('jamón'))
  ok('Bar Joan: avviso "non si prenota"', /Non si prenota/.test(await p.locator('.card[data-stop="f9"] .avviso').innerText()))
  const c0 = conto(false)
  const testoAvviso = await p.locator('.avviso--forte').innerText()
  ok('il conto della giornata coincide col calcolo sui dati', testoAvviso.includes(fmt(c0.soste)) && testoAvviso.includes(fmt(c0.cammino)) && testoAvviso.includes(fmt(c0.totale)), `atteso ${fmt(c0.soste)} + ${fmt(c0.cammino)} = ${fmt(c0.totale)} · trovato: ${testoAvviso}`)

  // Pioggia ON
  await p.locator('#piove').check()
  await p.waitForTimeout(600)
  const conP = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()]))
  ok('pioggia ON · El Born compare dopo la Ciutadella', conP[2][0] === 'f2b', conP.slice(0, 4).map(([id]) => id).join(' '))
  ok('pioggia ON · la Ciutadella scende a 15 min', /15 min/.test(await p.locator('.card[data-stop="f2"] .chips').innerText()))
  ok('pioggia ON · orari ricalcolati a cascata', JSON.stringify(conP.slice(2, 7).map(([, t]) => t)) === JSON.stringify(['09:53', '10:36', '10:55', '11:26', '11:38']), conP.slice(2, 7).map(([, t]) => t).join(' '))
  const c1 = conto(true)
  const testoP = await p.locator('.avviso--forte').innerText()
  ok('pioggia ON · anche qui il conto torna', testoP.includes(fmt(c1.soste)) && testoP.includes(fmt(c1.cammino)), `atteso ${fmt(c1.soste)} + ${fmt(c1.cammino)} · trovato: ${testoP}`)
  ok('pioggia ON · avviso sulle tappe al coperto', /una sola tappa scoperta invece di sei/.test(await p.locator('.avviso:not(.avviso--forte)').first().innerText()))
  ok('pioggia ON · salvata in b40:v1:piove', (await p.evaluate(() => localStorage.getItem('b40:v1:piove'))) === 'true')
  ok('pioggia ON · niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  await p.screenshot({ path: '/tmp/venerdi-pioggia.png', fullPage: true })
  await ctx.close()

  // la preferenza sopravvive alla chiusura del browser: contesto nuovo, stesso localStorage
  const ctx2 = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p2 = await ctx2.newPage()
  await p2.goto(base + '/')
  await p2.evaluate(() => { localStorage.setItem('b40:v1:person', JSON.stringify('ale')); localStorage.setItem('b40:v1:onboarded', 'true'); localStorage.setItem('b40:v1:piove', 'true') })
  await p2.goto(base + '/#/programma/ven', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(500)
  ok('la preferenza pioggia persiste alla riapertura', await p2.locator('#piove').isChecked() && await p2.locator('.card[data-stop="f2b"]').count() === 1)
  // e tornando al sereno si torna esattamente alla tabella
  await p2.locator('#piove').uncheck()
  await p2.waitForTimeout(600)
  const asciutto = await p2.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()]))
  const attesiOrari = [['f2', '09:30'], ['f3', '10:30'], ['f4', '10:50'], ['f5', '11:20'], ['f6', '11:35'], ['f7', '11:50'], ['f8', '12:20'], ['f9', '12:45'], ['f10', '14:05'], ['f11', '14:20'], ['f12', '15:00']]
  ok('pioggia OFF · si torna alla tabella degli orari', attesiOrari.every(([id, t]) => (asciutto.find(([x]) => x === id) || [])[1] === t), JSON.stringify(asciutto.filter(([id]) => id !== 'f1').slice(0, 11)))
  ok('pioggia OFF · El Born sparisce', !asciutto.some(([id]) => id === 'f2b'))
  await ctx2.close()
}

// 4. Sezioni Info
{
  const { p, ctx, errs } = await apri('ale', '/#/info')
  const ids = await p.evaluate(() => [...document.querySelectorAll('.acc > details')].map((d) => d.id))
  ok('restano otto sezioni, nell'+"'"+'ordine giusto', JSON.stringify(ids) === JSON.stringify(['sec-novita', 'sec-viaggio', 'sec-foto', 'sec-canzone', 'sec-extra', 'sec-apt', 'sec-profilo', 'sec-verifiche']), ids.join(' '))
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
