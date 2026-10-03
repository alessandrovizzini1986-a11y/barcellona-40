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
  // f99 (Casino, opzionale) sta in fondo, fuori dalla fila cronologica: la mattina e la cena sono f1→f15
  const attesi = ['f1', 'f1b', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f99']
  ok('sedici tappe più quella opzionale', ids.length === attesi.length, ids.join(' '))
  ok('ordine f1, f1b, f2→f15, poi l\'opzionale', JSON.stringify(ids) === JSON.stringify(attesi), ids.join(' '))
  ok('El Born non c\'è col sereno', !ids.includes('f2b'))
  const titoli = tappe.map((t) => t[1]).join(' | ')
  for (const atteso of ['Colazione · Brunells', 'Parc de la Ciutadella', 'Santa Maria del Mar', 'Carrer de Montcada', 'Pont del Bisbe', 'Sant Felip Neri', 'Duck Store', 'Santa Caterina', 'Bar Joan', 'Jamón da Debón'])
    ok(`in programma: ${atteso}`, titoli.includes(atteso))
  const testo = (await p.locator('body').innerText()).toLowerCase()
  ok('nessun Chao Pescao', !testo.includes('chao'))
  ok('nessun residuo di Elsa y Fred', !testo.includes('elsa y fred') && !testo.includes('rec comtal'))
  ok('niente overflow a 380px', await overflow(p) === 0, String(await overflow(p)))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))

  // 2. Immagini: qui solo il minimo, il resto lo controlla scripts/qa/immagini.mjs
  const img = await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, c.querySelector('.card__foto img')?.getAttribute('src').split('/').pop() || null]))
  ok('ogni tappa del venerdì ha la sua immagine', img.every(([, src]) => !!src), img.filter(([, s2]) => !s2).map(([id]) => id).join(' '))
  // nessuna card disegnata: Duck Store e Bar Joan sono foto come tutte le altre
  ok('nessuna card stilizzata nel venerdì', img.every(([, src]) => (src || '').endsWith('.webp')), img.filter(([, src]) => !(src || '').endsWith('.webp')).map(([id]) => id).join(' '))
  ok('Duck Store e Bar Joan hanno la foto vera', img.find(([id]) => id === 'f7')?.[1] === 'duckstore.webp' && img.find(([id]) => id === 'f9')?.[1] === 'barjoan.webp')
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
    const list = ven.filter((s) => (!s.soloPioggia || pioggia) && !(pioggia && s.saltaPioggia))
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
  const conDurata = ['f1b', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10']
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
  ok('pioggia ON · El Born viene subito dopo la colazione', conP[2][0] === 'f2b', conP.slice(0, 4).map(([id]) => id).join(' '))
  const ciut = await p.evaluate(() => { const c = document.querySelector('.timeline__saltata .card[data-stop="f2"]'); return c ? { grigia: c.classList.contains('card--saltata'), etichetta: c.querySelector('.card__time')?.textContent, chips: c.querySelector('.chips')?.innerText.replace(/\n/g, ' '), ultima: [...document.querySelectorAll('.card[data-stop]')].at(-1)?.dataset.stop } : null })
  ok('pioggia ON · la Ciutadella è saltata: in coda, grigia, "saltata per pioggia", zero soste', !!ciut && ciut.grigia && /saltata per pioggia/.test(ciut.etichetta) && !/\d+ min\s*★|15 min|25 min/.test(ciut.chips) && ciut.ultima === 'f2', JSON.stringify(ciut))
  ok('pioggia ON · Santa Maria del Mar si visita dentro: 30 min, testo e dettagli', /30 min/.test(await p.locator('.card[data-stop="f3"] .chips').innerText()) && /si entra/.test(await p.locator('.card[data-stop="f3"] .card__why').innerText()) && /tetto con la vista resta chiuso/.test(await p.locator('.card[data-stop="f3"] details').evaluate((d) => d.textContent)))
  const soste = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.chips')?.innerText || '').match(/(\d+) min(?! a piedi)/g)?.map((x) => parseInt(x)).find((x) => x) ?? null])))
  ok('pioggia ON · nessuna sosta all\'aperto oltre i 5 minuti (Montcada, Bisbe, Sant Felip a 5; Ciutadella a zero)', soste.f4 === 5 && soste.f5 === 5 && soste.f6 === 5 && soste.f2 === null, JSON.stringify({ f2: soste.f2, f4: soste.f4, f5: soste.f5, f6: soste.f6 }))
  ok('pioggia ON · la colazione dura 55 min, El Born non prima delle 10:00', /55 min/.test(await p.locator('.card[data-stop="f1b"] .chips').innerText()) && conP[2][1] === '10:00')
  // dalla colazione delle 09:00: 55 min + 4 a piedi = 09:59, ma El Born apre alle 10:00 → 10:00 (40) + 3 → Santa Maria 10:43 (30) + 4 →
  // Montcada 11:17 (5) + 11 → Bisbe 11:33 (5) + 2 → Sant Felip 11:40 (5) + 2 → Duck 11:47 (20) + 8 → Santa Caterina 12:15 (20) → Bar Joan 12:35
  ok('pioggia ON · orari ricalcolati a cascata fino al Bar Joan', JSON.stringify(conP.slice(2, 10).map(([, t]) => t)) === JSON.stringify(['10:00', '10:43', '11:17', '11:33', '11:40', '11:47', '12:15', '12:35']), conP.slice(2, 10).map(([id, t]) => id + ' ' + t).join(' '))
  const c1 = conto(true)
  const testoP = await p.locator('.avviso--forte').innerText()
  ok('pioggia ON · anche qui il conto torna', testoP.includes(fmt(c1.soste)) && testoP.includes(fmt(c1.cammino)), `atteso ${fmt(c1.soste)} + ${fmt(c1.cammino)} · trovato: ${testoP}`)
  const avvisoP = await p.locator('.avviso:not(.avviso--forte)').first().innerText()
  ok('pioggia ON · avviso: i vicoli sono all\'aperto e si attraversano senza fermarsi (via il testo falso)', /si attraversano senza fermarsi/.test(avvisoP) && !/vicoli stretti|quasi sempre riparati/.test(avvisoP), avvisoP)
  ok('pioggia ON · Rooftop Garden: avviso giallo con telefono e piano B', /\+34 935 10 11 30/.test(await p.locator('.card[data-stop="f14"] .avviso--pioggia').innerText()) && /bar dell'hotel/.test(await p.locator('.card[data-stop="f14"] .avviso--pioggia').innerText()))
  ok('pioggia ON · il percorso del mattino usa il link di pioggia (da Brunells via El Born)', /origin=41\.3854186,2\.1806806.*waypoints=41\.3856869,2\.1836862/.test(await p.locator('[data-percorso="ven-mattina"]').first().getAttribute('href') || ''))
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
  const attesiOrari = [['f1b', '09:00'], ['f2', '09:55'], ['f3', '10:30'], ['f4', '10:50'], ['f5', '11:21'], ['f6', '11:35'], ['f7', '11:50'], ['f8', '12:20'], ['f9', '12:45'], ['f10', '14:05'], ['f11', '14:20'], ['f12', '15:00']]
  ok('pioggia OFF · si torna alla tabella degli orari', attesiOrari.every(([id, t]) => (asciutto.find(([x]) => x === id) || [])[1] === t), JSON.stringify(asciutto.filter(([id]) => id !== 'f1').slice(0, 12)))
  ok('pioggia OFF · El Born sparisce', !asciutto.some(([id]) => id === 'f2b'))
  ok('pioggia OFF · la Ciutadella torna in fila alle 09:55 con 25 min, nessun avviso giallo sul Rooftop', asciutto[2]?.[0] === 'f2' && asciutto[2]?.[1] === '09:55' && (await p2.locator('.card--saltata').count()) === 0 && (await p2.locator('.card[data-stop="f14"] .avviso--pioggia').count()) === 0)
  await ctx2.close()
}

// 3c. Brunells: la colazione prima della Ciutadella, il blocco per il tassista, Bolt e Uber
{
  const UBER = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=41.3854186&dropoff[longitude]=2.1806806&dropoff[nickname]=Brunells&dropoff[formatted_address]=Carrer%20de%20la%20Princesa%2022%2C%20Barcelona'
  for (const [persona, ua, attesoBolt] of [['ale', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36', /^intent:\/\/#Intent;package=ee\.mtakso\.client;.*play\.google\.com.*ee\.mtakso\.client/], ['monne', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1', /^https:\/\/apps\.apple\.com\/app\/id675033630$/]]) {
    const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true, userAgent: ua, permissions: ['clipboard-read', 'clipboard-write'] })
    const p = await ctx.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    await p.addInitScript((x) => { try { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') } catch {}; window.__copiato = []; navigator.clipboard.writeText = (t) => { window.__copiato.push(t); return Promise.resolve() } }, persona)
    await p.goto(base + '/?stats=prova#/programma/ven', { waitUntil: 'networkidle' }); await p.waitForTimeout(450)
    const card = p.locator('.card[data-stop="f1b"]')
    ok(`${persona}: la colazione c'è, alle 09:00, prima della Ciutadella`, (await card.count()) === 1 && (await card.locator('.card__foto-time').innerText()) === '09:00' && (await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => c.dataset.stop).slice(0, 3).join(' '))) === 'f1 f1b f2')
    ok(`${persona}: titolo, 45 min, 15,4 km · 27 min, 4 su 2.376`, (await card.locator('.card__title').innerText()) === 'Colazione · Brunells' && /45 min/.test(await card.locator('.chips').innerText()) && /15,4 km · 27 min/.test(await card.locator('.chips').innerText()) && /4 · 2\.376/.test(await card.locator('.chips').innerText()), (await card.locator('.chips').innerText()).replace(/\n/g, ' '))
    ok(`${persona}: foto brunells.webp con "per gentile concessione"`, (await card.locator('.card__foto img').getAttribute('src') || '').endsWith('brunells.webp') && (await card.locator('.card__credito').innerText()) === 'foto: per gentile concessione')
    ok(`${persona}: blocco "Da dare al tassista" con l'indirizzo grande e la nota`, (await card.locator('.tassista__addr').innerText()) === 'Carrer de la Princesa, 22 · 08003 Barcelona' && (await card.locator('.tassista__nota').innerText()) === 'Pastisseria Brunells, esquina con Carrer de Montcada' && parseFloat(await card.locator('.tassista__addr').evaluate((e) => getComputedStyle(e).fontSize)) >= 24)
    await card.locator('[data-copia-indirizzo]').click(); await p.waitForTimeout(200)
    ok(`${persona}: "Copia indirizzo" copia davvero`, (await p.evaluate(() => window.__copiato)).at(-1) === 'Carrer de la Princesa, 22 · 08003 Barcelona')
    const hrefBolt = await card.locator('[data-taxi-bolt]').getAttribute('href')
    ok(`${persona}: Bolt punta all'app (${/Android/.test(ua) ? 'intent Android' : 'App Store'})`, attesoBolt.test(hrefBolt || ''), hrefBolt)
    await card.locator('[data-taxi-bolt]').evaluate((a) => { a.addEventListener('click', (e) => e.preventDefault(), { once: true }) }) // qui non si apre nulla: si guarda solo cosa fa il tocco
    await card.locator('[data-taxi-bolt]').click(); await p.waitForTimeout(300)
    ok(`${persona}: il tocco su Bolt copia l'indirizzo e lo dice`, (await p.evaluate(() => window.__copiato)).at(-1) === 'Carrer de la Princesa, 22 · 08003 Barcelona' && /incollalo come destinazione in Bolt/.test(await p.locator('body').innerText()))
    ok(`${persona}: Uber con la destinazione già impostata, link ufficiale`, (await card.locator('[data-taxi-uber]').getAttribute('href')) === UBER && (await card.locator('[data-taxi-uber]').getAttribute('target')) === '_blank', await card.locator('[data-taxi-uber]').getAttribute('href'))
    await card.locator('[data-taxi-uber]').evaluate((a) => { a.addEventListener('click', (e) => e.preventDefault(), { once: true }) }); await card.locator('[data-taxi-uber]').click(); await p.waitForTimeout(200)
    const conte = await p.evaluate(() => (window.__b40stats?.conte || []).map((c) => c.path))
    ok(`${persona}: eventi GoatCounter taxi-bolt e taxi-uber`, conte.some((x) => x.endsWith('/taxi-bolt')) && conte.some((x) => x.endsWith('/taxi-uber')), conte.join(' '))
    ok(`${persona}: nessun errore JS`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
  // solo ale e monne: Giulio e Manuel arrivano sabato
  for (const persona of ['giulio', 'manuel']) {
    const { p, ctx } = await apri(persona, '/#/programma/ven')
    ok(`${persona} non vede la colazione (né il venerdì)`, (await p.locator('.card[data-stop="f1b"]').count()) === 0)
    await ctx.close()
  }
  // orari a cascata nel sereno e "Adesso" alle 09:10 del venerdì
  {
    const { p, ctx } = await apri('ale', '/#/programma/ven')
    const orari = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-stop]')].map((c) => [c.dataset.stop, (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()])))
    ok('sereno: 08:05 atterraggio · 09:00 colazione · 09:55 Ciutadella · 10:30 Santa Maria, il resto invariato', orari.f1 === '08:05' && orari.f1b === '09:00' && orari.f2 === '09:55' && orari.f3 === '10:30' && orari.f4 === '10:50' && orari.f9 === '12:45' && orari.f12 === '15:00', JSON.stringify(orari))
    ok('la Ciutadella ha 25 min e dice 677 m · 8 min', /25 min/.test(await p.locator('.card[data-stop="f2"] .chips').innerText()) && /677 m · 8 min/.test(await p.locator('.card[data-stop="f2"] .chips').innerText()))
    const dettF1 = await p.locator('.card[data-stop="f1"] details').evaluate((d) => d.textContent.replace(/\s+/g, ' '))
    ok('atterraggio: il taxi va a Brunells, non alla Ciutadella', /fino a Brunells/.test(dettF1) && !/Ciutadella/.test(dettF1), dettF1)
    const avviso = await p.locator('.avviso--forte').innerText()
    ok('il conto della mattina parte dalle 09:00 e consiglia il taglio 30 → 15', /tra le 09:00 e/.test(avviso) && /da 25 a 15 minuti/.test(avviso), avviso)
    ok('il percorso del mattino parte da Brunells', (await p.locator('[data-percorso="ven-mattina"]').first().innerText()).includes('Brunells'))
    await ctx.close()
    const { p: q, ctx: c2 } = await apri('monne', '/?now=2026-10-16T09:10#/oggi')
    ok('Oggi, venerdì 09:10: "Adesso" è la colazione', (await q.locator('.tile--accent .card').getAttribute('data-stop')) === 'f1b')
    await c2.close()
  }
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
