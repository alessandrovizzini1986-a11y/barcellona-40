// QA del meteo: finestra di date, fetch una sola volta, card chiusa su una riga, striscia fino alle 23,
// chip dei giorni, pulsante che accende davvero il toggle Piove, sparizione se la fetch fallisce.
// La rete del Chromium di QA non esce: la fetch di Open-Meteo è stubbata con dati nella forma vera.
//   node scripts/qa/meteo.mjs http://localhost:4173
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
// Dati finti nella forma di Open-Meteo: 10 giorni dal giorno `da`, pioggia a venerdì mattina secondo `venerdi`
// `venerdi`: % di pioggia venerdì 9–14; `domenica`: % domenica 13–19 (il resto delle ore resta sotto soglia)
const fixture = (da, venerdi = 60, domenica = 30) => {
  const h = { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [], wind_speed_10m: [] }, d = { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], weather_code: [], sunrise: [], sunset: [] }
  const [y, m, g] = da.split('-').map(Number)
  for (let i = 0; i < 10; i++) {
    const dt = new Date(y, m - 1, g + i); const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    d.time.push(iso); d.temperature_2m_max.push(20 + i); d.temperature_2m_min.push(12 + i); d.precipitation_probability_max.push(iso === '2026-10-16' ? venerdi : iso === '2026-10-18' ? domenica : 10); d.weather_code.push([0, 2, 3, 61][i % 4]); d.sunrise.push(`${iso}T07:5${i % 10}`); d.sunset.push(`${iso}T19:0${i % 10}`)
    for (let o = 0; o < 24; o++) { h.time.push(`${iso}T${String(o).padStart(2, '0')}:00`); h.temperature_2m.push(14 + (o % 12)); h.precipitation_probability.push(iso === '2026-10-16' && o >= 9 && o <= 14 ? venerdi : iso === '2026-10-18' && o >= 13 && o <= 19 ? domenica : (o % 5 === 0 ? 30 : 5)); h.weather_code.push([0, 1, 3, 61, 95][o % 5]); h.wind_speed_10m.push(10) }
  }
  return { hourly: h, daily: d }
}
async function apri(path, { dati = null, fallisce = false, piove = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = [], console_ = [], fetches = []
  p.on('pageerror', (e) => errs.push(e.message)); // il Chromium di QA non esce in rete: i "Failed to load resource" (GoatCounter) sono rumore del sandbox, non del sito
  p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) console_.push(m.text()) })
  await p.addInitScript(({ dati, fallisce, piove }) => {
    try { if (!sessionStorage.getItem('qa:init')) { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('qa:init', '1'); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('ale')); if (piove) localStorage.setItem('b40:v1:piove', 'true') } } catch {}
    window.__fetchMeteo = 0
    const orig = window.fetch
    window.fetch = (url, opts) => {
      if (String(url).includes('api.open-meteo.com')) { window.__fetchMeteo++; if (fallisce) return Promise.reject(new TypeError('Failed to fetch')); return Promise.resolve(new Response(JSON.stringify(dati), { status: 200, headers: { 'Content-Type': 'application/json' } })) }
      return orig(url, opts)
    }
  }, { dati, fallisce, piove })
  p.on('request', (r) => { if (r.url().includes('open-meteo')) fetches.push(r.url()) })
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  return { p, ctx, errs, console_, fetches, chiamate: () => p.evaluate(() => window.__fetchMeteo) }
}
// 1. 8 ottobre: niente card, nessuna fetch
{
  const { p, ctx, chiamate, fetches } = await apri('/?now=2026-10-08T12:00#/oggi', { dati: fixture('2026-10-08') })
  ok('8 ottobre: la card non esiste', (await p.locator('[data-meteo]').count()) === 0)
  ok('8 ottobre: nessuna fetch a Open-Meteo', (await chiamate()) === 0 && fetches.length === 0)
  await ctx.close()
}
// 2. 15 ottobre: card, chip Oggi/Ven/Sab/Dom, una riga, striscia fino alle 23, piove
{
  const { p, ctx, errs, console_, chiamate } = await apri('/?now=2026-10-15T14:30#/oggi', { dati: fixture('2026-10-15') })
  ok('15 ottobre: la card c\'è, sotto il countdown', (await p.locator('.hero + [data-meteo], .hero ~ [data-meteo]').count()) === 1)
  ok('una sola fetch', (await chiamate()) === 1, String(await chiamate()))
  const riga = await p.evaluate(() => { const r = document.querySelector('.meteo__riga'); const b = r.getBoundingClientRect(); const ora = r.querySelector('.meteo__ora').getBoundingClientRect(), gg = r.querySelector('.meteo__giorni').getBoundingClientRect(); return { h: b.height, testo: r.innerText.replace(/\s+/g, ' ').trim(), stessaRiga: Math.abs(ora.top + ora.height / 2 - (gg.top + gg.height / 2)) < 8, dentro: gg.right <= b.right + 0.5 && ora.left >= b.left - 0.5, scroll: document.documentElement.scrollWidth } })
  ok('a 380 px la card chiusa sta su una riga', riga.h <= 60 && riga.stessaRiga && riga.dentro && riga.scroll <= 380, JSON.stringify(riga))
  ok('chiusa: il dettaglio non si vede', await p.evaluate(() => getComputedStyle(document.querySelector('#meteo-dett')).display === 'none'))
  ok('chiusa: "Barcellona, adesso" si legge per intero', await p.evaluate(() => { const d = document.querySelector('.meteo__dove'); return d.scrollWidth <= d.clientWidth + 1 }))
  ok('la riga dice temperatura di adesso e i tre giorni', /^\d+° Barcellona, adesso Ven \d+\/\d+° Sab \d+\/\d+° Dom \d+\/\d+°$/.test(riga.testo), riga.testo)
  ok('il testo non dice "sarà"', !/sarà/i.test(await p.locator('[data-meteo]').innerText()))
  await p.click('[data-meteo-toggle]'); await p.waitForTimeout(200)
  const chips = await p.evaluate(() => [...document.querySelectorAll('[data-meteo-giorno]')].map((c) => c.textContent.trim()))
  ok('chip Oggi · Ven · Sab · Dom', chips.join(' ') === 'Oggi Ven Sab Dom', chips.join(' '))
  const st = await p.evaluate(() => { const s = document.querySelector('[data-meteo-striscia]'); const cols = [...s.querySelectorAll('.meteo__col')]; return { prima: cols[0]?.dataset.ora, ultima: cols.at(-1)?.dataset.ora, n: cols.length, snap: getComputedStyle(s).scrollSnapType, scrolla: s.scrollWidth > s.clientWidth, forte: cols.filter((c) => c.classList.contains('meteo__col--forte')).map((c) => c.dataset.ora).join(','), blu: cols.filter((c) => c.querySelector('.meteo__p').textContent).map((c) => c.querySelector('.meteo__p').textContent).slice(0, 3), sole: document.querySelector('[data-meteo-sole]').textContent } })
  ok('oggi: la striscia va dall\'ora attuale (14) alle 23 e non oltre', st.prima === '14' && st.ultima === '23' && st.n === 10, JSON.stringify(st))
  ok('scorre con snap, senza frecce', st.snap.startsWith('x') && st.scrolla && (await p.locator('[data-meteo] button:has-text("›"), [data-meteo] button:has-text("‹")').count()) === 0)
  ok('ogni 3 ore l\'ora è in grassetto', st.forte === '15,18,21')
  ok('% pioggia solo sopra il 20', st.blu.every((t) => parseInt(t) > 20) && st.blu.length > 0, st.blu.join(','))
  ok('alba e tramonto dal dato vivo, con "previsione"', /alba 07:5\d · .*tramonto 19:0\d · previsione/.test(st.sole), st.sole)
  await p.click('[data-meteo-giorno="2026-10-16"]'); await p.waitForTimeout(150)
  const ven = await p.evaluate(() => { const cols = [...document.querySelectorAll('.meteo__col')]; return { prima: cols[0]?.dataset.ora, ultima: cols.at(-1)?.dataset.ora, on: document.querySelector('.chip--on').textContent.trim() } })
  ok('chip Ven: striscia di venerdì dalle 07 alle 23', ven.prima === '07' && ven.ultima === '23' && ven.on === 'Ven', JSON.stringify(ven))
  const piove = await p.evaluate(() => document.querySelector('.meteo__piove')?.innerText.replace(/\s+/g, ' ').trim())
  ok('riga gialla: "Previsione: venerdì mattina 60 % di pioggia. Attivo il piano coperto?"', piove === 'Previsione: venerdì mattina 60 % di pioggia. Attivo il piano coperto? Attiva', String(piove))
  ok('ombrello: con il 60 % di venerdì compare la riga blu', (await p.locator('.meteo__ombrello').innerText()) === 'Previsione pioggia: mettete in valigia un ombrello pieghevole.' && (await p.locator('.meteo__ombrello').evaluate((e) => getComputedStyle(e).color)) === 'rgb(61, 90, 128)')
  await p.click('[data-meteo-piove]'); await p.waitForTimeout(150)
  ok('"Attiva" accende davvero il toggle Piove', await p.evaluate(() => JSON.parse(localStorage.getItem('b40:v1:piove'))) === true && (await p.locator('.meteo__piove').innerText()).includes('Piano coperto attivo'))
  const prima = await chiamate()
  await p.goto(base + '/?now=2026-10-15T14:30#/programma/ven', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('nel Programma il toggle Piove è acceso', await p.isChecked('#piove'))
  // cambia solo l'ancora: stesso documento, la vista si ridisegna e deve ripartire dalla cache
  await p.goto(base + '/?now=2026-10-15T14:30#/oggi', { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  ok('tornando a Oggi la card dice "Piano coperto attivo" e non rifà la fetch (cache 30 min)', (await p.locator('.meteo__piove').innerText()).includes('Piano coperto attivo') && (await chiamate()) === prima, `${prima} → ${await chiamate()}`)
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  ok('ricaricando la pagina la card c\'è e la fetch non riparte (cache in sessionStorage)', (await p.locator('[data-meteo]').count()) === 1 && (await chiamate()) === 0, String(await chiamate()))
  ok('nessun errore JS o console', errs.length === 0 && console_.length === 0, [...errs, ...console_].join(' | '))
  await ctx.close()
}
// 3. venerdì con poca pioggia: niente riga gialla; 17 ottobre in weekend: chip senza "Oggi", card sotto "Adesso"
{
  const { p, ctx } = await apri('/?now=2026-10-17T10:00#/oggi', { dati: fixture('2026-10-12', 30) })
  ok('17 ottobre: la card sta subito sotto la card "Adesso"', await p.evaluate(() => { const m = document.querySelector('[data-meteo]'); return !!m && m.parentElement.classList.contains('bento') && m.previousElementSibling?.classList.contains('tile--accent') }))
  await p.click('[data-meteo-toggle]'); await p.waitForTimeout(150)
  ok('in weekend i chip sono Ven · Sab · Dom, Sab selezionato', (await p.evaluate(() => [...document.querySelectorAll('[data-meteo-giorno]')].map((c) => c.textContent.trim() + (c.classList.contains('chip--on') ? '*' : '')).join(' '))) === 'Ven Sab* Dom')
  ok('pioggia 30 %: nessuna riga gialla', (await p.locator('.meteo__piove').count()) === 0)
  ok('pioggia 30 %: nessun promemoria ombrello (soglia 40 %)', (await p.locator('.meteo__ombrello').count()) === 0)
  await ctx.close()
}
// 3b. domenica pomeriggio piovosa: la seconda riga gialla propone il piano Maremagnum; "Attiva" accende l'unico toggle
{
  const { p, ctx, errs } = await apri('/?now=2026-10-15T14:30#/oggi', { dati: fixture('2026-10-15', 60, 65) })
  await p.click('[data-meteo-toggle]'); await p.waitForTimeout(150)
  const righe = () => p.evaluate(() => [...document.querySelectorAll('.meteo__piove')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()))
  ok('venerdì 60 e domenica 65: due righe gialle, venerdì prima', JSON.stringify(await righe()) === JSON.stringify(['Previsione: venerdì mattina 60 % di pioggia. Attivo il piano coperto? Attiva', 'Previsione: domenica pomeriggio 65 % di pioggia. Attivo il piano Maremagnum? Attiva']), JSON.stringify(await righe()))
  ok('la riga della domenica è gialla', (await p.locator('[data-meteo-piano="dom"]').evaluate((e) => getComputedStyle(e).color)) === (await p.locator('[data-meteo-piano="ven"]').evaluate((e) => getComputedStyle(e).color)))
  await p.click('[data-meteo-piano="dom"] [data-meteo-piove]'); await p.waitForTimeout(150)
  ok('"Attiva" sulla domenica accende il toggle e aggiorna tutte e due le righe', await p.evaluate(() => JSON.parse(localStorage.getItem('b40:v1:piove'))) === true && JSON.stringify(await righe()) === JSON.stringify(['Piano coperto attivo.', 'Piano Maremagnum attivo.']), JSON.stringify(await righe()))
  await p.goto(base + '/?now=2026-10-15T14:30#/programma/dom', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  ok('nel Programma di domenica il toggle è acceso e il Time Out Market c\'è', await p.isChecked('#piove') && (await p.locator('.card[data-stop="d1b"]').count()) === 1)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri('/?now=2026-10-15T14:30#/oggi', { dati: fixture('2026-10-15', 30, 70) })
  await p.click('[data-meteo-toggle]'); await p.waitForTimeout(150)
  ok('venerdì asciutto e domenica 70: solo la riga della domenica, con la sua percentuale', (await p.locator('.meteo__piove').count()) === 1 && (await p.locator('[data-meteo-piano="dom"]').innerText()).includes('domenica pomeriggio 70 %'))
  ok('nessun automatismo: il toggle resta spento finché non si tocca "Attiva"', await p.evaluate(() => localStorage.getItem('b40:v1:piove')) === null)
  await ctx.close()
}
// 4. fetch che fallisce: niente card, niente in console
{
  const { p, ctx, errs, console_, chiamate } = await apri('/?now=2026-10-15T14:30#/oggi', { fallisce: true })
  ok('fetch fallita: la card non compare e non c\'è nessun placeholder', (await p.locator('[data-meteo], [data-meteo-slot]:not([hidden])').count()) === 0 && !(await p.locator('#app').innerText()).includes('non disponibil'))
  ok('fetch fallita: niente in console', errs.length === 0 && console_.length === 0, [...errs, ...console_].join(' | '))
  await p.goto(base + '/?now=2026-10-15T14:35#/oggi', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  ok('dopo un errore non si riprova prima di 30 minuti', (await chiamate()) === 0)
  await ctx.close()
}
// 4b. IL CASO DEL TELEFONO: ?now=2026-10-15T10:00 ma i dati sono quelli veri di oggi (27 settembre → 6 ottobre).
// La data simulata non sta nella previsione: la card deve comparire lo stesso, con l'ora reale e i tre giorni successivi.
{
  // i dati partono da OGGI (reale), come farebbe l'API: la data simulata resta fuori dalla previsione finché non siamo nel weekend
  // "oggi" e "adesso" sono quelli di Barcellona (il sito ha il fuso fisso Europe/Madrid, come i dati dell'API), non quelli della macchina di QA
  const parti = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  const oggi = new Date(+parti.year, +parti.month - 1, +parti.day), isoOggi = `${parti.year}-${parti.month}-${parti.day}`, oraBarcellona = parti.hour
  const NOMI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'], attesi = [1, 2, 3].map((i) => NOMI[new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + i).getDay()]).join(' ')
  const { p, ctx, errs } = await apri('/#/oggi?now=2026-10-15T10:00', { dati: fixture(isoOggi) })
  ok('?now= fuori dalla previsione: la card compare lo stesso', (await p.locator('[data-meteo]').count()) === 1)
  const st = await p.evaluate(() => { const c = document.querySelector('[data-meteo]'); return { oggi: c?.dataset.oggi, ora: c?.dataset.ora, giorni: [...c.querySelectorAll('.meteo__giorni > span i')].map((e) => e.textContent.trim()).join(' '), chips: [...c.querySelectorAll('[data-meteo-giorno]')].map((e) => e.textContent.trim()).join(' ') } })
  ok('adesso = ora reale del giorno dei dati, giorni = i tre successivi, chip Oggi + tre', st.oggi === isoOggi && st.giorni === attesi && st.chips === 'Oggi ' + attesi, JSON.stringify(st) + ' attesi ' + attesi)
  await p.click('[data-meteo-toggle]'); await p.waitForTimeout(150)
  const prima = await p.evaluate(() => document.querySelector('.meteo__col')?.dataset.ora)
  ok('la striscia di Oggi parte dall\'ora reale di Barcellona', prima === oraBarcellona, `${prima} vs ${oraBarcellona}`)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// 5. 19 ottobre: fuori finestra
{
  const { p, ctx, chiamate } = await apri('/?now=2026-10-19T09:00#/oggi', { dati: fixture('2026-10-15') })
  ok('19 ottobre: niente card, nessuna fetch', (await p.locator('[data-meteo]').count()) === 0 && (await chiamate()) === 0)
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK meteo')
