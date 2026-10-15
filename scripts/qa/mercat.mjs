// QA dell'extra "Mercat de Mercats" (sabato, s98): è un extra senza orario come il Casinò, quindi il sabato
// non si muove di un minuto; la card ha prezzi, avviso, consiglio, Maps dall'appartamento e il pulsante
// "Programma completo" che apre il pannello con Sab 17 di default, le quattro sezioni ad accordion, le righe ★
// in giallo e "Dove mangiare" in fondo; con un'allerta arancione o rossa compare "Sconsigliato oggi".
//   node scripts/qa/mercat.mjs [http://localhost:4173]
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const errori = []
const ok = (n, c, x = '') => { if (!c) errori.push(n); console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8'))
const venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues
const bagni = JSON.parse(readFileSync('data/bagni.json', 'utf8'))
const foto = JSON.parse(readFileSync('data/foto-tappe.json', 'utf8'))
const mercat = JSON.parse(readFileSync('data/mercat.json', 'utf8'))
const changelog = JSON.parse(readFileSync('data/changelog.json', 'utf8')).entries
const missions = JSON.parse(readFileSync('data/missions.json', 'utf8')).missions
const sab = it.days.find((d) => d.label === 'Sabato')
const s = sab.stops.find((x) => x.id === 's98')
const v = venues.mercat
const MAPS = 'https://www.google.com/maps/dir/?api=1&origin=41.3954365,2.1796078&destination=41.4021668,2.1876385&travelmode=walking'

// ---- 1. dati: l'extra c'è, il sabato è quello di prima ----
ok('s98: extra senza orario, durata né distanza dalla tappa precedente', !!s && s.time === null && s.timeStatus === 'opzionale' && s.durataMin === null && s.distFromPrevM === null && s.minFromPrev === null)
ok('s98: titolo, sottotitolo e perché', s.title === 'Mercat de Mercats' && /Plaça de les Glòries/.test(s.sottotitolo) && /barbecue gratuiti/.test(s.why) && /15 minuti a piedi da casa/.test(s.why))
ok('venue: coordinate di Google Places, verificate, dentro Plaça de les Glòries', v.lat === 41.4021668 && v.lng === 2.1876385 && v.verified === true && v.lat > 41.4005 && v.lat < 41.4035 && v.lng > 2.1855 && v.lng < 2.1895)
ok('orari stampati: ven e sab 11–22, dom 11–21, ingresso gratuito', /11:00–22:00/.test(v.hours) && /dom 18 11:00–21:00/.test(v.hours) && s.details.some((d) => /Ingresso gratuito/.test(d)))
ok('prezzi: tapas 4–6, menú 16 e 40, cauzioni 1 e 2', s.prezzi.length === 4 && /4–6 €/.test(s.prezzi[0]) && /16 €/.test(s.prezzi[1]) && /40 €/.test(s.prezzi[2]) && /1 €/.test(s.prezzi[3]) && /2 €/.test(s.prezzi[3]))
ok('avviso giallo: all\'aperto, con pioggia forte lasciate perdere', s.avviso === "All'aperto in piazza. Con pioggia forte lasciate perdere." && s.sconsigliatoConAllerta === true)
ok('consiglio: vermut alle 14:30 e 15:30, birra alle 20', /14:30 o alle 15:30/.test(s.consiglio) && /alle 20 quella di birra Estrella/.test(s.consiglio))
ok('il link Maps parte dall\'appartamento e arriva alla fiera a piedi', s.urlMaps === MAPS && s.actions.maps === true)
ok('metro Glòries L1 e tram', /Glòries L1/.test(s.actions.metro) && /T4\/T5\/T6/.test(s.actions.metro))
ok('distanza da casa nei dettagli: 1,3 km · 15 min (Valhalla)', s.details.some((d) => d === "Dall'appartamento: 1,3 km · 15 min a piedi"))
ok('link al programma ufficiale nei dettagli', s.details.some((d) => d.includes('https://www.barcelona.cat/mercatdemercats/es/mercat-de-mercats')))
ok('è di chi c\'è sabato, non di Monne', JSON.stringify(s.people) === JSON.stringify(['ale', 'giulio', 'manuel']))
ok('sta in fondo al sabato, prima del Casinò', sab.stops.slice(-2).map((x) => x.id).join(' ') === 's98 s99')
const ATTESI = [['s1', '07:40', null, null, null, null], ['s2', '08:15', null, 17100, 24, 'auto'], ['s3', '09:45', null, null, null, null], ['s3c', '09:45', 30, 1291, 16, null], ['s4', '10:30', null, 162, 2, null], ['s5', '11:20', null, 527, 7, null], ['s5b', '13:00', 10, 1189, 15, null], ['s6', '13:30', null, 574, 7, null], ['s7', '15:00', null, 672, 8, null], ['s8', '19:30', null, 2823, 34, null], ['s9', '00:15', null, 3500, 12, 'taxi']]
ok('il sabato con orario non si muove: stesse tappe, orari, durate e tratti', JSON.stringify(sab.stops.filter((x) => x.time).map((x) => [x.id, x.time, x.durataMin ?? null, x.distFromPrevM ?? null, x.minFromPrev ?? null, x.distMode ?? null])) === JSON.stringify(ATTESI))
ok('i due percorsi di sabato sono quelli di prima e non toccano s98', sab.percorsi.length === 2 && sab.percorsi.every((pc) => !pc.stops.includes('s98')) && sab.percorsi[0].url === 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.4066347,2.1799385&travelmode=walking&waypoints=41.4039406,2.1751597' && sab.percorsi[1].url === 'https://www.google.com/maps/dir/?api=1&origin=41.395437,2.179608&destination=41.3744026,2.1695739&travelmode=walking&waypoints=41.3791891,2.1770567')
ok('niente XP, niente missioni per s98', !missions.some((m) => m.stopId === 's98'))
ok('ven e dom non hanno il Mercat (è l\'extra di sabato)', !it.days.filter((d) => d.label !== 'Sabato').some((d) => d.stops.some((x) => x.venueId === 'mercat')))
const disseny = bagni.bagni.find((b) => b.id === 'disseny')
ok('bagno: Museu del Disseny, stimato, 10–20, 236 m · 3 min da Valhalla', bagni.tappe.s98?.prima === 'disseny' && disseny?.stimato === true && disseny.orarioBreve === '10–20' && bagni.tappe.s98.dist.disseny.m === 236 && bagni.tappe.s98.dist.disseny.min === 3)
const f = foto.foto.find((x) => x.id === 'mercat')
ok('foto da Commons, CC BY 2.0, con crediti in CREDITS.md', s.img === 'mercat.webp' && f?.licenza === 'CC BY 2.0' && f.autore === 'Fred Romero' && readFileSync('CREDITS.md', 'utf8').includes(f.pagina))
ok('changelog v51: l\'extra di sabato con vermut e birra', changelog[0].v === 51 && /Mercat de Mercats/.test(changelog[0].titolo + changelog[0].voci.join(' ')) && /Vermut gratis alle 14:30 e alle 15:30, birra alle 20/.test(changelog[0].voci.join(' ')))
ok('DA_VERIFICARE: gli orari vengono dal PDF del 13/10 e possono cambiare con la pioggia', /PDF ufficiale del 13\/10/.test(readFileSync('DA_VERIFICARE.md', 'utf8')) && /possono cambiare in caso di pioggia/.test(readFileSync('DA_VERIFICARE.md', 'utf8')))
// il programma: tre giorni, Encants solo sabato, niente spazio famiglie, le ★ dove dice il programma
const g = Object.fromEntries(mercat.giorni.map((x) => [x.key, x]))
ok('programma: ven, sab, dom; il Palco degli Encants solo sabato', Object.keys(g).join(' ') === 'ven sab dom' && !g.ven.eventi.encants && g.sab.eventi.encants?.length === 3 && !g.dom.eventi.encants)
ok('programma: niente spazio famiglie', !/famigli/i.test(JSON.stringify(mercat.sezioni)) && !Object.values(g).some((x) => x.eventi.famiglie))
const top = (key, sez) => (g[key].eventi[sez] || []).filter((e) => e.top).map((e) => e.testo)
ok('★ di sabato: vermut, ratafia, Maset, Estrella Damm, DJ Pierre Antoine', top('sab', 'bodegueta').length === 3 && /vermut/.test(top('sab', 'bodegueta')[0]) && /Ratafia/.test(top('sab', 'bodegueta')[1]) && /Maset/.test(top('sab', 'bodegueta')[2]) && top('sab', 'aula').join() === 'Degustazione di birra Estrella Damm' && top('sab', 'lago').join() === 'DJ Pierre Antoine' && top('sab', 'encants').length === 0)
ok('★ di venerdì: vermut e Disfrutar; domenica nessuna', top('ven', 'bodegueta').length === 1 && /Disfrutar/.test(top('ven', 'aula').join()) && top('ven', 'lago').length === 0 && ['bodegueta', 'aula', 'lago'].every((sz) => top('dom', sz).length === 0))
ok('conteggio eventi: ven 4+6+5, sab 5+7+5+3, dom 3+5+6', [g.ven.eventi.bodegueta.length, g.ven.eventi.aula.length, g.ven.eventi.lago.length, g.sab.eventi.bodegueta.length, g.sab.eventi.aula.length, g.sab.eventi.lago.length, g.sab.eventi.encants.length, g.dom.eventi.bodegueta.length, g.dom.eventi.aula.length, g.dom.eventi.lago.length].join() === '4,6,5,5,7,5,3,3,5,6')
ok('dove mangiare: Terrassa del Llac, piazza, banchi dei mercati, produttori', mercat.mangiare.map((m) => m.titolo).join('|') === 'Terrassa del Llac|Plaça de les Glòries|Banchi dei mercati|Produttori' && mercat.mangiare[0].voci.includes('Bar Nuri') && mercat.mangiare[2].voci.length === 11)

// ---- 2. nel browser ----
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const ALLERTA = (livello) => ({ aggiornato: new Date().toISOString(), finestra: { inizio: '2026-10-15T00:00', fine: '2026-10-19T06:00', fuso: 'Europe/Rome' }, attive: [{ zona: 'barcellona', area: 'Litoral de Barcelona', evento: 'Lluvias', livello, tipo: 'pioggia', inizio: new Date(Date.now() - 3600e3).toISOString(), fine: new Date(Date.now() + 6 * 3600e3).toISOString(), titolo: 'prova', fonte: 'https://www.aemet.es/' }], errori: [] })
async function apri(person, path, { allerta = null, width = 380 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  if (allerta) await p.route('**/allerte.json*', (r) => r.fulfill({ json: ALLERTA(allerta) }))
  await p.addInitScript((x) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)); localStorage.setItem('b40:v1:onboarded', 'true') } catch {} }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  return { p, ctx, errs }
}
const pulito = (t) => t.replace(/\s+/g, ' ').trim()

// la card, nel programma di sabato
{
  const { p, ctx, errs } = await apri('ale', '/#/programma/sab')
  const card = p.locator('.card[data-stop="s98"]')
  ok('sab: la card del Mercat c\'è, una sola', (await card.count()) === 1)
  ok('sab: sta sotto la riga "Extra se avanza tempo", prima del Casinò', await p.evaluate(() => { const riga = document.querySelector('.timeline__opzionale'), m = document.querySelector('.card[data-stop="s98"]'), c = document.querySelector('.card[data-stop="s99"]'); return !!riga && !!m && !!c && /extra se avanza tempo/i.test(riga.textContent) && (riga.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 && (m.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 }))
  ok('sab: intestazione "· 2 extra"', /· 2 extra$/.test(pulito(await p.locator('.day-head .faint').innerText())), await p.locator('.day-head .faint').innerText())
  ok('sab: badge EXTRA e "Se avete voglia" al posto dell\'ora', (await card.locator('.badge--opzionale').innerText()) === 'EXTRA' && (await card.locator('.card__foto-time').innerText()) === 'Se avete voglia')
  ok('sab: sottotitolo sotto il titolo', pulito(await card.locator('.card__venue').innerText()) === 'La festa dei mercati di Barcellona · Plaça de les Glòries')
  ok('sab: foto del Museu del Disseny con il credito Commons', (await card.locator('.card__foto img').getAttribute('src')).endsWith('/mercat.webp') && /Fred Romero/.test(await card.locator('.card__credito').innerText()))
  const prezzi = card.locator('.card__prezzi')
  ok('sab: il riquadro dei prezzi, quattro righe, si legge senza aprire i dettagli', (await prezzi.count()) === 1 && (await prezzi.locator('li').count()) === 4 && /16 €/.test(await prezzi.innerText()) && /40 €/.test(await prezzi.innerText()) && await prezzi.isVisible())
  const avvisi = await card.locator('.avviso').evaluateAll((els) => els.map((e) => [e.textContent.replace(/\s+/g, ' ').trim(), e.hidden, getComputedStyle(e).display]))
  ok('sab: avviso giallo "All\'aperto in piazza"; "Sconsigliato oggi" nascosto senza allerta', avvisi.some(([t, h, d]) => /All'aperto in piazza. Con pioggia forte lasciate perdere/.test(t) && !h && d !== 'none') && avvisi.some(([t, h, d]) => /Sconsigliato oggi/.test(t) && h && d === 'none'), JSON.stringify(avvisi))
  const consiglio = card.locator('.card__consiglio')
  ok('sab: il consiglio per i ragazzi, in terracotta', /vermut/.test(await consiglio.innerText()) && (await consiglio.evaluate((e) => getComputedStyle(e).color)) === 'rgb(232, 85, 46)')
  ok('sab: Maps parte dall\'appartamento (link del dato, non rigenerato)', (await card.locator('a[data-maps]').getAttribute('href')) === MAPS)
  ok('sab: niente taxi, la metro c\'è', (await card.locator('[data-taxi]').count()) === 0 && /Glòries L1/.test(await card.locator('.actions').innerText()))
  ok('sab: la riga bagno dice Museu del Disseny · 236 m · 10–20, su una riga sola', /Museu del Disseny · 236 m · 10–20/.test(pulito(await card.locator('[data-bagno-riga]').innerText())) && await card.locator('[data-bagno-riga] .bagno__txt').evaluate((e) => e.scrollWidth <= e.clientWidth), pulito(await card.locator('[data-bagno-riga]').innerText()))
  await card.locator('[data-bagno-riga]').click(); await p.waitForTimeout(500)
  const bagnoSheet = p.locator('[data-bagno-sheet="disseny"]')
  ok('sab: il pannello del bagno dice che è stimato, con orario e Maps a piedi', (await bagnoSheet.count()) === 1 && (await bagnoSheet.locator('.badge--stimato').count()) === 1 && /10:00–20:00/.test(await bagnoSheet.innerText()) && /236 m · 3 min/.test(await bagnoSheet.innerText()), pulito(await bagnoSheet.innerText().catch(() => '')).slice(0, 120))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  ok('sab: la spunta "Fatto" resta, niente XP', (await card.locator('input[data-done]').count()) === 1 && (await card.locator('.check__xp').count()) === 0)
  ok('sab: niente overflow a 380px', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0)
  // il pannello
  const btn = card.locator('[data-mercat-programma]')
  ok('sab: il pulsante "Programma completo" c\'è', (await btn.count()) === 1 && /Programma completo/.test(await btn.innerText()))
  await btn.click(); await p.waitForTimeout(500)
  const sheet = p.locator('.sheet [data-mercat-sheet]')
  ok('pannello: si apre', (await sheet.count()) === 1)
  ok('pannello: tab Sab 17 selezionata di default', (await sheet.locator('[data-mercat-tab][aria-selected="true"]').getAttribute('data-mercat-tab')) === 'sab' && (await sheet.locator('[data-mercat-giorno]').getAttribute('data-mercat-giorno')) === 'sab')
  ok('pannello: quattro sezioni di sabato, nell\'ordine Bodegueta, Aula, Lago, Encants', (await sheet.locator('[data-mercat-sez]').evaluateAll((els) => els.map((e) => e.dataset.mercatSez).join(' '))) === 'bodegueta aula lago encants')
  ok('pannello: la Bodegueta è aperta, le altre chiuse', (await sheet.locator('[data-mercat-sez][open]').evaluateAll((els) => els.map((e) => e.dataset.mercatSez).join())) === 'bodegueta')
  await sheet.locator('[data-mercat-sez="aula"] summary').click(); await p.waitForTimeout(250)
  ok('pannello: l\'Aula si apre al tocco', await sheet.locator('[data-mercat-sez="aula"]').evaluate((e) => e.open))
  await sheet.locator('[data-mercat-sez="aula"] summary').click(); await p.waitForTimeout(250)
  ok('pannello: e si richiude', !(await sheet.locator('[data-mercat-sez="aula"]').evaluate((e) => e.open)))
  const stelle = await sheet.locator('[data-mercat-sez="bodegueta"] .mercat__riga').evaluateAll((els) => els.map((e) => [e.classList.contains('mercat__riga--top'), getComputedStyle(e).backgroundColor, e.textContent.replace(/\s+/g, ' ').trim()]))
  ok('pannello: le righe ★ della Bodegueta sono tre, evidenziate con uno sfondo diverso dalle altre', stelle.filter(([t]) => t).length === 3 && stelle.filter(([t]) => !t).length === 2 && new Set(stelle.filter(([t]) => t).map(([, c]) => c)).size === 1 && stelle.filter(([t]) => t)[0][1] !== stelle.filter(([t]) => !t)[0][1] && stelle.filter(([t]) => t).every(([, , x]) => /★/.test(x)), JSON.stringify(stelle.map(([t, c]) => [t, c])))
  ok('pannello: la riga del vermut dice 14:30–15:15 e 15:30–16:15', stelle.some(([t, , x]) => t && /14:30–15:15 e 15:30–16:15/.test(x) && /vermut/.test(x)))
  ok('pannello: "Dove mangiare" in fondo, con Bar Nuri e i banchi dei mercati', /Dove mangiare/.test(await sheet.locator('[data-mercat-mangiare]').innerText()) && /Bar Nuri/.test(await sheet.locator('[data-mercat-mangiare]').innerText()) && /Peixateria La Vero/.test(await sheet.locator('[data-mercat-mangiare]').innerText()))
  ok('pannello: il testo lungo va a capo, niente scorrimento orizzontale', await p.evaluate(() => { const s = document.querySelector('.sheet'); return s.scrollWidth <= s.clientWidth && document.documentElement.scrollWidth - document.documentElement.clientWidth === 0 }))
  await sheet.locator('[data-mercat-tab="ven"]').click(); await p.waitForTimeout(300)
  ok('pannello: tab Ven 16, tre sezioni (niente Encants), il vermut e Disfrutar in ★', (await sheet.locator('[data-mercat-giorno]').getAttribute('data-mercat-giorno')) === 'ven' && (await sheet.locator('[data-mercat-sez]').count()) === 3 && (await sheet.locator('[data-mercat-sez="encants"]').count()) === 0 && (await sheet.locator('.mercat__riga--top').count()) === 2)
  await sheet.locator('[data-mercat-tab="dom"]').click(); await p.waitForTimeout(300)
  ok('pannello: tab Dom 18, tre sezioni, nessuna ★, orario 11:00–21:00', (await sheet.locator('[data-mercat-sez]').count()) === 3 && (await sheet.locator('.mercat__riga--top').count()) === 0 && /11:00–21:00/.test(await sheet.locator('[data-mercat-giorno] .faint').first().innerText()))
  ok('pannello: "Dove mangiare" resta anche cambiando giorno', (await sheet.locator('[data-mercat-mangiare]').count()) === 1)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  ok('pannello: Esc lo chiude', (await p.locator('.sheet').count()) === 0)
  ok('sab: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// con un'allerta arancione: "Sconsigliato oggi"; con una gialla no
for (const [livello, atteso] of [['arancione', true], ['rosso', true], ['giallo', false]]) {
  const { p, ctx, errs } = await apri('ale', '/#/programma/sab', { allerta: livello })
  await p.waitForTimeout(800)
  const blocco = p.locator('.card[data-stop="s98"] [data-allerta-sconsiglia]')
  const visibile = await blocco.evaluate((e) => !e.hidden && getComputedStyle(e).display !== 'none')
  ok(`allerta ${livello}: "Sconsigliato oggi" ${atteso ? 'compare' : 'non compare'}`, visibile === atteso && (!atteso || new RegExp(`Allerta ${livello === 'rosso' ? 'rossa' : livello} su Barcellona`).test(await blocco.innerText())), pulito(await blocco.innerText()))
  if (atteso) ok(`allerta ${livello}: il banner in cima c'è`, (await p.locator('[data-allerta-banner]').count()) === 1)
  ok(`allerta ${livello}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// Oggi: mai "Adesso", mai nella cascata; l'ordine in fondo è Mercat, poi Casinò
{
  const { p, ctx, errs } = await apri('ale', '/?now=2026-10-17T16:00#/oggi')
  const adesso = await p.locator('.tile--accent .card[data-stop]').getAttribute('data-stop').catch(() => null)
  ok('Oggi sabato 16:00: Adesso è il pomeriggio (s7), non il Mercat', adesso === 's7', String(adesso))
  const ultimi = await p.locator('.timeline .card[data-stop]').evaluateAll((els) => els.slice(-2).map((e) => e.dataset.stop).join(' '))
  ok('Oggi: in fondo alla lista Mercat e poi Casinò', ultimi === 's98 s99', ultimi)
  ok('Oggi: il Mercat non sta nel conto della giornata', !/Mercat/.test(await p.locator('.avviso--forte').first().innerText().catch(() => '')))
  ok('Oggi: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// chi lo vede: Giulio sì, Monne no
{
  const { p, ctx } = await apri('giulio', '/#/programma/sab')
  ok('Giulio vede il Mercat', (await p.locator('.card[data-stop="s98"]').count()) === 1)
  await ctx.close()
  const r = await apri('monne', '/#/programma/sab')
  ok('Monne no: sabato è già a Bologna', (await r.p.locator('.card[data-stop="s98"]').count()) === 0)
  await r.ctx.close()
}
// mappa: marker tratteggiato senza numero, nel punto giusto; il popup apre Maps
{
  const { p, ctx, errs } = await apri('ale', '/#/mappa')
  await p.waitForTimeout(1200)
  // prima del weekend sono accesi tutti e tre i giorni: non si tocca il segmented, altrimenti si spegne il sabato
  const n = await p.locator('.marker--opz[style*="--sab"]').count()
  const titoli = []
  for (let i = 0; i < n; i++) { await p.locator('.marker--opz[style*="--sab"]').nth(i).dispatchEvent('click'); await p.waitForTimeout(300); titoli.push(await p.locator('.popup__title').last().innerText().catch(() => '?')); await p.evaluate(() => document.querySelector('.leaflet-popup-close-button')?.click()); await p.waitForTimeout(150) }
  ok('mappa: due marker extra di sabato (Mercat e Casinò), senza numero', n === 2 && titoli.includes('Mercat de Mercats') && titoli.includes('Casino Barcelona') && (await p.locator('.marker--opz span').count()) === 0, titoli.join(' | '))
  ok('mappa: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
await b.close()
if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) }
console.log('OK mercat')
