// QA dei "Bagni puliti" (data/bagni.json, src/ui/bagno.js): ogni tappa ha la sua riga "Bagno più vicino" (anche
// "Appartamento" o "Ristorante"); le coordinate sono quelle del JSON (Google Places), mai ricalcolate; il layer
// "Bagni" della mappa si accende e si spegne e non entra nei link dei percorsi; a 380 px la riga sta su una riga
// e il pannello si chiude col tap fuori; la card "Adesso" di Oggi ha la riga; Info ha la sezione per tutti;
// evento GoatCounter bagno-apri; DA_VERIFICARE.md ha la voce URGENTE sui Bunkers in cima.
//   node scripts/qa/bagni.mjs [url base]
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const bagni = JSON.parse(readFileSync('data/bagni.json', 'utf8'))
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const tappe = it.days.flatMap((d) => d.stops.map((s) => s.id))
const byId = Object.fromEntries(bagni.bagni.map((x) => [x.id, x]))

// 1. dati: una riga per ogni tappa, coordinate del JSON uguali a quelle date (non ricalcolate), distanze presenti
ok(`ogni tappa ha una riga bagno (${tappe.length} tappe)`, tappe.every((id) => bagni.tappe[id] && (bagni.tappe[id].prima || bagni.tappe[id].semplice)), tappe.filter((id) => !bagni.tappe[id]).join(','))
const ATTESE = { edition: [41.385944, 2.1778103], neri: [41.3831717, 2.1753815], santpau: [41.4117072, 2.1743395], canudas: [41.3033401, 2.076845], maremagnum: [41.3746496, 2.1823721] }
ok('le coordinate sono quelle di Google Places nel JSON, cifra per cifra', Object.entries(ATTESE).every(([id, [lat, lng]]) => byId[id].lat === lat && byId[id].lng === lng))
ok('lo script delle distanze non scrive lat/lng', !/\.(lat|lng)\s*=[^=]/.test(readFileSync('scripts/bagni-distanze.mjs', 'utf8')))
ok('ogni coppia tappa → hotel ha metri e minuti di Valhalla', Object.values(bagni.tappe).every((t) => [t.prima, t.seconda].filter((k) => k && byId[k]).every((k) => Number.isInteger(t.dist?.[k]?.m) && Number.isInteger(t.dist?.[k]?.min))))
ok('i 6 da tenere a mente sono EDITION, Neri, Mercer, Sercotel, El Palace, Maremagnum, in quest\'ordine', JSON.stringify(bagni.daTenereAMente) === JSON.stringify(['edition', 'neri', 'mercer', 'sercotel', 'elpalace', 'maremagnum']))
ok('il riepilogo WhatsApp non parla di bagni', !/bagn/i.test(readFileSync('src/views/oggi.js', 'utf8').split('export function summaryText')[1].split('\n}')[0]))
const dv = readFileSync('DA_VERIFICARE.md', 'utf8')
const primaSezione = dv.split('\n').find((l) => l.startsWith('## ')) || ''
ok('DA_VERIFICARE.md: la prima voce è URGENTE e parla dei Bunkers, con le due versioni e le fonti', /URGENTE/.test(primaSezione) && /Bunkers/.test(primaSezione) && /guia\.barcelona\.cat/.test(dv) && /museuhistoria/.test(dv) && /17\.30|17:30/.test(dv) && /lliure accés/.test(dv), primaSezione)

// 2. nel browser
async function apri(person, path) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !/CERT|net::ERR/.test(m.text())) errs.push(m.text()) })
  await p.addInitScript((person) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true') } catch {} }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return { p, ctx, errs }
}
const righe = (p) => p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => { const r = c.querySelector('[data-bagno-riga]'); const t = r?.querySelector('.bagno__txt'); return { id: c.dataset.stop, c: !!r, testo: r?.innerText.replace(/\s+/g, ' ').trim(), h: r ? Math.round(r.getBoundingClientRect().height) : null, over: t ? t.scrollWidth - t.clientWidth : null, nascosta: r ? getComputedStyle(r).display === 'none' : null } }))
for (const [person, key] of [['ale', 'ven'], ['monne', 'ven'], ['ale', 'sab'], ['giulio', 'sab'], ['manuel', 'dom']]) {
  const { p, ctx, errs } = await apri(person, `/#/programma/${key}`)
  const r = await righe(p)
  ok(`${person} · ${key}: ogni card ha la riga bagno (${r.length} card)`, r.length > 0 && r.every((x) => x.c), r.filter((x) => !x.c).map((x) => x.id).join(','))
  ok(`${person} · ${key}: a 380 px ogni riga sta su una riga, senza puntini`, r.filter((x) => x.c && !x.nascosta).every((x) => x.h <= 40 && x.over <= 0), JSON.stringify(r.filter((x) => x.c && !x.nascosta && (x.h > 40 || x.over > 0)).map((x) => [x.id, x.testo, x.h, x.over])))
  ok(`${person} · ${key}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx, errs } = await apri('ale', '/?stats=prova#/programma/ven')
  const f1b = p.locator('.card[data-stop="f1b"]')
  ok('f1b: la riga dice EDITION · bar Veraz · 425 m · 7:30–24', (await f1b.locator('[data-bagno-riga]').innerText()).replace(/\s+/g, ' ').trim() === 'EDITION · bar Veraz · 425 m · 7:30–24', await f1b.locator('[data-bagno-riga]').innerText())
  ok('f11: "Appartamento", riga semplice senza pannello', (await p.locator('.card[data-stop="f11"] .bagno--semplice').count()) === 1 && (await p.locator('.card[data-stop="f11"] [data-bagno]').count()) === 0)
  ok('f15: "Ristorante · o NH Constanza · 607 m", il tocco apre il piano B', (await p.locator('.card[data-stop="f15"] [data-bagno="nhconstanza"]').count()) === 1 && /Ristorante · o NH Constanza · 607 m/.test(await p.locator('.card[data-stop="f15"] [data-bagno-riga]').innerText()))
  await f1b.locator('[data-bagno]').scrollIntoViewIfNeeded(); await f1b.locator('[data-bagno]').click(); await p.waitForTimeout(500)
  const sheet = p.locator('[data-bagno-sheet="edition"]')
  const testo = (await sheet.count()) ? (await sheet.innerText()).replace(/\s+/g, ' ') : ''
  ok('tocco: si apre il pannello con come fare, orario, dov\'è, discrezione, telefono, 425 m · 5 min', (await sheet.count()) === 1 && /Entri dal bar Veraz/.test(testo) && /bar 7:30–24:00/.test(testo) && /Bagni del bar Veraz/.test(testo) && /Discrezione/.test(testo) && /\+34 936 26 33 30/.test(testo) && /425 m · 5 min/.test(testo), testo.slice(0, 200))
  ok('pannello: pallini di discrezione 5 su 5, riga "puliti per regola, non per recensione", badge stimato', (await p.locator('.bagno__pallini').getAttribute('aria-label')) === 'Discrezione 5 su 5' && /Hall di hotel: puliti per regola, non per recensione\./.test(testo) && (await sheet.locator('.badge--stimato').count()) === 1)
  ok('pannello: Maps a piedi verso le coordinate del JSON', (await sheet.locator('[data-bagno-maps]').getAttribute('href')) === 'https://www.google.com/maps/dir/?api=1&destination=41.385944,2.1778103&travelmode=walking')
  ok('pannello: "In alternativa: H10 Montcada · 243 m · 3 min"', /In alternativa: H10 Montcada · 243 m · 3 min/.test(testo))
  ok('evento GoatCounter bagno-apri, con il bagno nel titolo', await p.evaluate(() => (window.__b40stats?.conte || []).some((c) => c.path === 'alessandro/bagno-apri' && c.title === 'bagno-apri edition' && c.event === true)))
  await sheet.locator('[data-bagno="h10montcada"]').click(); await p.waitForTimeout(500)
  ok('"In alternativa" apre il pannello dell\'altro', (await p.locator('[data-bagno-sheet="h10montcada"]').count()) === 1 && (await p.locator('[data-bagno-sheet="edition"]').count()) === 0)
  await p.mouse.click(190, 40); await p.waitForTimeout(400) // tap fuori, sullo sfondo scuro
  ok('tap fuori: il pannello si chiude', (await p.locator('.sheet-host').count()) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/dom')
  const d2 = p.locator('.card[data-stop="d2"]')
  ok('Bunkers: avviso giallo "Orario da confermare: una fonte ufficiale dice che in ottobre l\'area chiude alle 17:30."', (await d2.locator('.avviso--orario').count()) === 1 && (await d2.locator('.avviso--orario').innerText()).trim() === "Orario da confermare: una fonte ufficiale dice che in ottobre l'area chiude alle 17:30.")
  ok('Bunkers: orario 16:00 e durata invariati (l\'itinerario non cambia)', (await d2.locator('.card__foto-time').innerText()).trim() === '16:00' && /3 h 30 min/.test(await d2.locator('.chips').innerText()))
  ok('Bunkers: riga "Nessuno quassù · o Sant Pau · 1,9 km"', /Nessuno quassù · o Sant Pau · 1,9 km/.test(await d2.locator('[data-bagno-riga]').innerText()))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  // Oggi, venerdì alle 12:50: "Adesso" è Bar Joan (f9), la card ha la riga EDITION
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-16T12:50#/oggi')
  const adesso = p.locator('.tile--accent .card[data-stop]')
  ok('Oggi: la card "Adesso" (f9) ha la riga bagno, sempre visibile', (await adesso.count()) === 1 && (await adesso.getAttribute('data-stop')) === 'f9' && /EDITION · bar Veraz · 52 m/.test(await adesso.locator('[data-bagno-riga]').innerText()))
  await adesso.locator('[data-bagno]').click(); await p.waitForTimeout(400)
  ok('Oggi: il tocco apre il pannello', (await p.locator('[data-bagno-sheet="edition"]').count()) === 1)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  const { p, ctx, errs } = await apri(person, '/#/info/bagni')
  const sec = p.locator('#sec-bagni')
  const t = (await sec.count()) ? (await sec.innerText()).replace(/\s+/g, ' ') : ''
  const nomi = await sec.locator('.bagni-lista').first().locator('.bagno-voce b').allInnerTexts()
  ok(`${person}: Info ha "Bagni puliti" aperta, con la regola in tre righe, i 6 da tenere a mente in ordine, tutti e 13, la nota sulla pulizia`, (await sec.count()) === 1 && (await sec.getAttribute('open')) !== null && /Hall di hotel 4-5 stelle: entri dal bar, prendi un caffè, chiedi del bagno\. Sempre un caffè: così sei un cliente\. Evita le 11-12, orario dei check-out\./.test(t) && JSON.stringify(nomi) === JSON.stringify(['The Barcelona EDITION · bar Veraz', 'Hotel Neri · A Restaurant', 'Mercer Hotel · Cocktail Bar', 'Sercotel Rosellón', 'El Palace · hall e Rooftop', 'Maremagnum · bagni 1° e 2° piano']) && (await sec.locator('.bagni-lista').nth(1).locator('.bagno-voce').count()) === 13 && /Puliti per regola, non per recensione: nessuna recensione parla dei bagni delle hall\./.test(t), nomi.join(' | '))
  if (person === 'manuel') { await sec.locator('[data-bagno="mercer"]').first().click(); await p.waitForTimeout(400); ok('Info: la voce apre il pannello', (await p.locator('[data-bagno-sheet="mercer"]').count()) === 1) }
  ok(`${person}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx, errs } = await apri('ale', '/#/mappa')
  await p.waitForTimeout(1500)
  const toggle = p.locator('[data-bagni]')
  ok('Mappa: il pulsante "Bagni" c\'è ed è spento, nessun marker bagno', (await toggle.count()) === 1 && (await toggle.getAttribute('aria-pressed')) === 'false' && (await p.locator('[data-bagno-marker]').count()) === 0)
  await toggle.click(); await p.waitForTimeout(600)
  ok('Mappa: acceso → 13 marker blu con l\'icona del bagno', (await toggle.getAttribute('aria-pressed')) === 'true' && (await p.locator('[data-bagno-marker]').count()) === 13 && (await p.locator('.marker--bagno svg').count()) === 13)
  await p.locator('[data-bagno-marker="nhconstanza"]').first().dispatchEvent('click'); await p.waitForTimeout(500)
  ok('Mappa: tap sul marker → stesso pannello', (await p.locator('[data-bagno-sheet="nhconstanza"]').count()) === 1)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await toggle.click(); await p.waitForTimeout(500)
  ok('Mappa: spento → zero marker', (await toggle.getAttribute('aria-pressed')) === 'false' && (await p.locator('[data-bagno-marker]').count()) === 0)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  // i percorsi su Maps non passano dai bagni: nessuna coordinata di un bagno nei link
  const coords = bagni.bagni.map((x) => `${x.lat},${x.lng}`)
  let hrefs = []
  for (const key of ['ven', 'sab', 'dom']) { const { p, ctx } = await apri('ale', `/#/programma/${key}`); hrefs.push(...await p.locator('.percorso').evaluateAll((as) => as.map((a) => a.href))); await ctx.close() }
  // El Palace, la Sagrada e il T2 sono anche tappe: quelle coordinate stanno nei percorsi per le tappe, non per i bagni
  const soloBagni = coords.filter((c) => !['41.3915035,2.1715182', '41.4039406,2.1751597', '41.3033401,2.076845'].includes(c))
  ok(`i link dei percorsi (${hrefs.length}) non contengono coordinate dei bagni`, hrefs.length >= 6 && !hrefs.some((h) => soloBagni.some((c) => h.includes(c))))
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK bagni')
