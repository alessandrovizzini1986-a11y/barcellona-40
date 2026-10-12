// QA delle allerte meteo. 1) Lo script scripts/allerte.mjs con feed finti (stessa struttura del feed MeteoAlarm letto
// il 12/10/2026) e un ntfy finto in locale: fuori finestra non legge niente; prima lettura → notifiche; stessa lettura →
// zero duplicati; cambio di livello → una; fine → una; --test → la notifica di prova. 2) Il sito con un allerte.json di
// prova nei tre livelli: banner, colori, testo, pannello; ?now= non inventa allerte; Oggi con la tappa esposta; Info.
// 3) grep: il topic non sta nel repo né nella build.
//   node scripts/qa/allerte.mjs [url base]
import { chromium } from 'playwright-core'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const base = process.argv[2] || 'http://localhost:4173'
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }

// ——— 1. lo script, con feed finti e ntfy finto ———
const dir = mkdtempSync(path.join(tmpdir(), 'allerte-'))
const entry = ({ area, event, colore, sev, onset, expires, id }) => `<entry>
    <cap:geocode><valueName>EMMA_ID</valueName><value>ES000</value></cap:geocode>
    <link title="${area}" href="https://meteoalarm.org?geocode=EMMA_ID:ES000" hreflang="en"/>
    <cap:areaDesc>${area}</cap:areaDesc>
    <cap:event>${event}</cap:event>
    <cap:sent>2026-10-17T06:00:00+00:00</cap:sent>
    <cap:expires>${expires}</cap:expires>
    <cap:effective>2026-10-17T06:00:00+00:00</cap:effective>
    <cap:onset>${onset}</cap:onset>
    <cap:certainty>Likely</cap:certainty>
    <cap:severity>${sev}</cap:severity>
    <cap:urgency>Future</cap:urgency>
    <cap:scope>Public</cap:scope>
    <cap:message_type>Alert</cap:message_type>
    <cap:status>Actual</cap:status>
    <cap:identifier>${id}</cap:identifier>
    <link type="application/cap+xml" href="https://feeds.meteoalarm.org/api/v1/warnings/feeds-spain/${id}"/>
    <title>${colore} ${event.replace(/ warning$/i, '')} Warning issued for Spain - ${area}</title>
    <updated>2026-10-17T06:00:00Z</updated>
  </entry>`
const feed = (entries) => `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><title>MeteoAlarm</title>\n${entries.join('\n')}\n</feed>`
const BCN_GIALLA = entry({ area: 'Litoral de Barcelona', event: 'Moderate rain warning', colore: 'Yellow', sev: 'Moderate', onset: '2026-10-17T13:00:00+00:00', expires: '2026-10-17T21:00:00+00:00', id: 'A1' })
const BCN_ARANCIONE = entry({ area: 'Litoral de Barcelona', event: 'Severe rain warning', colore: 'Orange', sev: 'Severe', onset: '2026-10-17T13:00:00+00:00', expires: '2026-10-17T21:00:00+00:00', id: 'A2' })
const MALLORCA = entry({ area: 'Sur de Mallorca', event: 'Moderate rain warning', colore: 'Yellow', sev: 'Moderate', onset: '2026-10-17T12:00:00+00:00', expires: '2026-10-17T16:59:59+00:00', id: 'M1' })
const ER_GIALLA = entry({ area: 'Emilia e Romagna', event: 'Moderate thunderstorm warning', colore: 'Yellow', sev: 'Moderate', onset: '2026-10-18T22:00:00+00:00', expires: '2026-10-19T06:00:00+00:00', id: 'I1' })
const vuoto = feed([])
const ricevute = []
const ntfy = createServer((req, res) => { let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => { ricevute.push({ titolo: req.headers.title, priorita: req.headers.priority, tags: req.headers.tags, corpo: b }); res.writeHead(200); res.end('{}') }) })
await new Promise((r) => ntfy.listen(0, '127.0.0.1', r))
const porta = ntfy.address().port
const stato = path.join(dir, 'allerte.json')
// lo script gira in un processo figlio ASINCRONO: con execFileSync il server ntfy finto non potrebbe rispondere (loop bloccato)
async function giro({ es = vuoto, it = vuoto, ora = '2026-10-17T10:00:00+02:00', test = false, meteo = null } = {}) {
  writeFileSync(path.join(dir, 'es.xml'), es); writeFileSync(path.join(dir, 'it.xml'), it)
  const meteoFile = path.join(dir, 'meteo.json'); writeFileSync(meteoFile, JSON.stringify(meteo || { hourly: { time: [], precipitation: [] } }))
  const prima = ricevute.length
  const { stdout: out } = await execFileP('node', ['scripts/allerte.mjs', ...(test ? ['--test'] : [])], { encoding: 'utf8', env: { ...process.env, ALLERTE_ORA: ora, ALLERTE_FEED_ES: path.join(dir, 'es.xml'), ALLERTE_FEED_IT: path.join(dir, 'it.xml'), ALLERTE_METEO: meteoFile, NTFY_URL: `http://127.0.0.1:${porta}/topic-di-prova`, ALLERTE_STATO: stato, GITHUB_OUTPUT: '' } })
  return { out, nuove: ricevute.slice(prima), stato: existsSync(stato) ? JSON.parse(readFileSync(stato, 'utf8')) : null }
}
{
  const r = await giro({ es: feed([BCN_ARANCIONE]), ora: '2026-10-14T23:00:00+02:00' })
  ok('fuori finestra (14/10 23:00 Roma): esce subito, nessuna notifica, nessuno stato', /fuori finestra/.test(r.out) && r.nuove.length === 0 && r.stato === null, r.out.trim())
  const r2 = await giro({ es: feed([BCN_ARANCIONE]), ora: '2026-10-19T06:00:00+02:00' })
  ok('dopo il 19/10 06:00 Roma: esce subito', /fuori finestra/.test(r2.out) && r2.nuove.length === 0)
}
{
  const r = await giro({ es: feed([MALLORCA, BCN_GIALLA]), it: feed([ER_GIALLA]), ora: '2026-10-17T10:00:00+02:00' })
  ok('prima lettura: 2 notifiche (Barcellona gialla, Bologna gialla), Mallorca ignorata', r.nuove.length === 2 && r.nuove.some((n) => /🟡 Barcellona: allerta GIALLA pioggia/.test(n.corpo)) && r.nuove.some((n) => /🟡 Bologna \/ Emilia-Romagna: allerta GIALLA temporali/.test(n.corpo)) && !r.nuove.some((n) => /Mallorca/.test(n.corpo)), r.nuove.map((n) => n.corpo).join(' | '))
  const bcn = r.nuove.find((n) => /Barcellona/.test(n.corpo))
  ok('notifica gialla: finestra in ora di Madrid (sab 17 dalle 15:00 alle 23:00), "Programma invariato, ombrello.", priorità 3', /sab 17 dalle 15:00 alle 23:00/.test(bcn.corpo) && /Programma invariato, ombrello\./.test(bcn.corpo) && bcn.priorita === '3', bcn.corpo)
  ok('notifica Bologna: "Parti 15 min prima."', /Parti 15 min prima\./.test(r.nuove.find((n) => /Bologna/.test(n.corpo)).corpo))
  ok('allerte.json: 2 attive con zona, area, livello, tipo, finestra, fonte; niente topic', r.stato.attive.length === 2 && r.stato.attive.every((a) => a.zona && a.area && a.livello && a.tipo && a.inizio && a.fine && a.fonte) && !JSON.stringify(r.stato).includes('topic-di-prova'), JSON.stringify(r.stato.attive.map((a) => [a.zona, a.livello, a.tipo])))
  const r2 = await giro({ es: feed([MALLORCA, BCN_GIALLA]), it: feed([ER_GIALLA]), ora: '2026-10-17T11:00:00+02:00' })
  ok('stessa lettura un\'ora dopo: ZERO notifiche, stato non riscritto', r2.nuove.length === 0 && /nessun cambiamento/.test(r2.out), r2.out.trim())
  const r3 = await giro({ es: feed([BCN_ARANCIONE]), it: feed([ER_GIALLA]), ora: '2026-10-17T12:00:00+02:00' })
  ok('Barcellona passa ad arancione: UNA notifica "passa a ARANCIONE", priorità 4, con le regole (moli, sottopassi, taxi)', r3.nuove.length === 1 && /🟠 Barcellona: allerta passa a ARANCIONE pioggia/.test(r3.nuove[0].corpo) && /Niente moli, sottopassi e metro in zone basse\. Taxi\./.test(r3.nuove[0].corpo) && r3.nuove[0].priorita === '4', r3.nuove.map((n) => n.corpo).join(' | '))
  const r4 = await giro({ es: vuoto, it: feed([ER_GIALLA]), ora: '2026-10-17T22:00:00+02:00' })
  ok('Barcellona sparisce dal feed: UNA notifica "🟢 Barcellona: allerta pioggia terminata."', r4.nuove.length === 1 && /🟢 Barcellona: allerta pioggia terminata\./.test(r4.nuove[0].corpo) && r4.stato.attive.length === 1, r4.nuove.map((n) => n.corpo).join(' | '))
  const r5 = await giro({ es: vuoto, it: feed([ER_GIALLA]), ora: '2026-10-17T23:00:00+02:00' })
  ok('di nuovo lo stesso: zero notifiche', r5.nuove.length === 0)
  const rossa = entry({ area: 'Prelitoral de Barcelona', event: 'Extreme rain warning', colore: 'Red', sev: 'Extreme', onset: '2026-10-18T00:00:00+00:00', expires: '2026-10-18T12:00:00+00:00', id: 'R1' })
  const r6 = await giro({ es: feed([rossa]), it: vuoto, ora: '2026-10-18T01:00:00+02:00' })
  ok('rossa sul Prelitoral: notifica urgente (5) con "Resta al chiuso, segui @emergenciescat e il 112."; Bologna terminata', r6.nuove.some((n) => /🔴 Barcellona: allerta ROSSA pioggia/.test(n.corpo) && n.priorita === '5' && /Resta al chiuso, segui @emergenciescat e il 112\./.test(n.corpo)) && r6.nuove.some((n) => /🟢 Bologna/.test(n.corpo)) && r6.nuove.length === 2, r6.nuove.map((n) => n.corpo).join(' | '))
  const meteo = { hourly: { time: Array.from({ length: 48 }, (_, i) => `2026-10-18T${String(i % 24).padStart(2, '0')}:00`), precipitation: Array.from({ length: 48 }, (_, i) => (i === 10 ? 12.4 : 0)) } }
  const r7 = await giro({ es: vuoto, it: vuoto, ora: '2026-10-18T06:00:00+02:00', meteo })
  ok('Open-Meteo ≥ 10 mm/h nelle 12 ore: pre-allarme non ufficiale, etichettato così, e stato con nonUfficiale', r7.nuove.some((n) => /🌧 Barcellona: Pioggia prevista 12\.4 mm\/h/.test(n.corpo) && /non un'allerta ufficiale/.test(n.corpo)) && r7.stato.attive.some((a) => a.livello === 'preallarme' && a.nonUfficiale === true), r7.nuove.map((n) => n.corpo).join(' | '))
  const r8 = await giro({ es: vuoto, it: vuoto, ora: '2026-10-18T06:00:00+02:00', meteo })
  ok('stesso pre-allarme un\'ora dopo: zero notifiche', r8.nuove.length === 0)
  const rt = await giro({ test: true, ora: '2026-10-01T10:00:00+02:00' })
  ok('--test: manda "✅ Allerte Barcelona 40 attive" anche fuori finestra, e basta', rt.nuove.length === 1 && rt.nuove[0].corpo === '✅ Allerte Barcelona 40 attive')
}
ntfy.close()
// ——— 2. il sito ———
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const ALLERTA = (livello, extra = {}) => ({ aggiornato: '2026-10-17T10:00:00Z', attive: livello ? [{ id: 'x', zona: 'barcellona', area: 'Litoral de Barcelona', livello, tipo: 'pioggia', evento: 'Rain warning', inizio: '2026-10-17T13:00:00+00:00', fine: '2026-10-17T21:00:00+00:00', fonte: 'https://meteoalarm.org?geocode=EMMA_ID:ES000', ...extra }] : [] })
async function apri(person, path, dati) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.route('**/allerte.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dati) }))
  await p.addInitScript((person) => { try { if (sessionStorage.getItem('qa:init')) return; sessionStorage.setItem('qa:init', '1'); localStorage.clear(); sessionStorage.removeItem('b40:allerte:v1'); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true') } catch {} }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
  return { p, ctx, errs }
}
const col = (p) => p.evaluate(() => { const b = document.querySelector('[data-allerta-banner]'); const s = getComputedStyle(b); return { bg: s.backgroundColor, fg: s.color, testo: b.innerText.replace(/\s+/g, ' ').trim(), prima: document.getElementById('app').firstElementChild === b } })
for (const [livello, attesoTesto, attesoBg, attesoFg] of [
  ['giallo', 'Allerta gialla pioggia fino alle 23:00. Programma invariato, ombrello.', 'rgb(242, 183, 5)', 'rgb(14, 17, 22)'],
  ['arancione', 'Allerta arancione. Spostamenti in taxi, niente moli, spiagge, Montjuïc, sottopassi.', 'rgb(232, 85, 46)', 'rgb(255, 255, 255)'],
  ['rosso', 'Allerta rossa. Restate al chiuso. Emergenze: 112.', 'rgb(198, 40, 40)', 'rgb(255, 255, 255)']
]) {
  const { p, ctx, errs } = await apri('giulio', '/#/programma/sab', ALLERTA(livello))
  const c = await col(p)
  ok(`banner ${livello}: in cima alla vista, testo e colori giusti`, c.prima && c.testo === attesoTesto && c.bg === attesoBg && c.fg === attesoFg, JSON.stringify(c))
  await p.locator('[data-allerta-banner]').tap(); await p.waitForTimeout(400)
  const sheet = (await p.locator('.sheet').count()) ? (await p.locator('.sheet').innerText()).replace(/\s+/g, ' ') : ''
  ok(`banner ${livello}: il tap apre il pannello con dettagli, fonte, regole e 112`, /Barcellona · /.test(sheet) && /Litoral de Barcelona/.test(sheet) && /Fonte/.test(sheet) && /Arancione\./.test(sheet) && (await p.locator('.sheet a[href="tel:112"]').count()) === 1, sheet.slice(0, 160))
  await p.keyboard.press('Escape')
  await p.goto(base + '/#/mappa', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  ok(`banner ${livello}: c'è anche sulla Mappa`, (await p.locator('[data-allerta-banner]').count()) === 1)
  ok(`banner ${livello}: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-17T15:00#/oggi', ALLERTA(null))
  ok('niente allerta (anche con ?now= nel weekend): nessun banner, nessuno spazio vuoto', (await p.locator('[data-allerta-banner]').count()) === 0 && await p.evaluate(() => document.getElementById('app').firstElementChild.classList.contains('header')))
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T16:30#/oggi', ALLERTA('arancione'))
  const a = p.locator('.tile--accent [data-allerta-esposto="maremagnum"]')
  ok('Oggi domenica 16:30 con arancione: Adesso = Maremagnum, zona esposta → alternativa al coperto', (await p.locator('.tile--accent .card').getAttribute('data-stop')) === 'd1c' && (await a.count()) === 1 && /Time Out Market al 2° piano/.test(await a.innerText()) && /taxi al T2 alle 18:45/.test(await a.innerText()))
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-18T16:30#/oggi', ALLERTA('giallo'))
  ok('Oggi con gialla: niente alternativa (solo arancione e rossa)', (await p.locator('[data-allerta-esposto]').count()) === 0 && (await p.locator('[data-allerta-banner="giallo"]').count()) === 1)
  await ctx.close()
}
{
  const { p, ctx } = await apri('ale', '/?now=2026-10-17T13:00#/oggi', ALLERTA('rosso'))
  ok('Oggi sabato 13:00 con rossa: Adesso = Teixidó (non esposta) → nessuna alternativa, ma il banner rosso c\'è', (await p.locator('[data-allerta-esposto]').count()) === 0 && (await p.locator('[data-allerta-banner="rosso"]').count()) === 1)
  await ctx.close()
}
{
  const { p, ctx, errs } = await apri('manuel', '/#/info/emergenze', ALLERTA(null))
  const sec = p.locator('#sec-emergenze')
  const t = (await sec.innerText()).replace(/\s+/g, ' ')
  ok('Info: "Maltempo e emergenze" con livelli, ES-Alert, 112, link e diritti', (await sec.getAttribute('open')) !== null && /Gialla\./.test(t) && /Arancione\./.test(t) && /Rossa\./.test(t) && /ES-Alert/.test(t) && /catalano e in inglese/.test(t) && (await sec.locator('a[href="tel:112"]').count()) === 1 && (await sec.locator('a[href*="aemet.es"]').count()) === 1 && (await sec.locator('a[href*="meteo.cat"]').count()) === 1 && (await sec.locator('a[href*="emergenciescat"]').count()) === 1 && (await sec.locator('a[href*="ryanair.com"]').count()) === 1 && /Niente compensazione/.test(t) && /ricevute/.test(t), t.slice(0, 120))
  ok('Info senza allerte: "Nessuna allerta attiva"', /Nessuna allerta attiva/.test(t))
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const bolognaSolo = { aggiornato: '2026-10-18T20:00:00Z', attive: [{ id: 'b', zona: 'bologna', area: 'Emilia e Romagna', livello: 'giallo', tipo: 'nebbia', evento: 'Fog', inizio: '2026-10-18T22:00:00+00:00', fine: '2026-10-19T06:00:00+00:00', fonte: 'https://meteoalarm.org' }] }
  const { p, ctx } = await apri('ale', '/#/info/emergenze', bolognaSolo)
  ok('allerta solo su Bologna: niente banner, ma sta nella sezione Info (con l\'ora di Roma)', (await p.locator('[data-allerta-banner]').count()) === 0 && /Bologna \/ Emilia-Romagna · gialla/.test((await p.locator('#sec-emergenze').innerText()).replace(/\s+/g, ' ')) && /00:00/.test(await p.locator('#sec-emergenze').innerText()))
  await ctx.close()
}
await b.close()
// ——— 3. il topic non sta da nessuna parte ———
{
  const file = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['node_modules', '.git', '_legacy'].includes(e.name) ? [] : file(`${d}/${e.name}`)) : [`${d}/${e.name}`]))
  const tutti = [...file('src'), ...file('scripts'), ...file('public'), ...file('.github'), ...file('data'), ...file('dist'), 'ALLERTE.md', 'DA_VERIFICARE.md', 'CHANGELOG.md', 'README.md'].filter((f) => /\.(js|mjs|json|html|css|md|yml|txt)$/.test(f) && existsSync(f))
  const conTopic = tutti.filter((f) => /b40-allerte-[a-z0-9]{8,}|ntfy\.sh\/[a-zA-Z0-9_-]{6,}/.test(readFileSync(f, 'utf8')))
  ok('nessun topic ntfy nel repo né nella build (solo il riferimento al secret)', conTopic.length === 0, conTopic.join(' '))
  ok('il workflow legge il topic dal secret NTFY_TOPIC', /secrets\.NTFY_TOPIC/.test(readFileSync('.github/workflows/allerte.yml', 'utf8')))
  ok('il sito non contiene ntfy', !file('dist').filter((f) => /\.(js|html)$/.test(f)).some((f) => /ntfy/.test(readFileSync(f, 'utf8'))))
}
if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK allerte')
