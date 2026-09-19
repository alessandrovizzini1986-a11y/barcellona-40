// QA delle novità: chi rientra deve vedere solo quello che è uscito dopo l'ultima volta, e una volta
// sola. Chi apre il sito per la prima volta non deve vedere la cronologia di cose che non ha mai visto.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const out = []
const ok = (n, c, x = '') => { out.push(c); if (!c) process.exitCode = 1; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' · ' + x : ''}`) }

const changelog = JSON.parse(readFileSync('data/changelog.json', 'utf8'))
const entries = [...changelog.entries].sort((a, b) => b.v - a.v)
const ultima = entries[0].v
ok('changelog: versioni intere, uniche e senza buchi', entries.every((e) => Number.isInteger(e.v)) && new Set(entries.map((e) => e.v)).size === entries.length && ultima === entries.length, entries.map((e) => e.v).join(' '))
ok('changelog: ogni entry ha data, titolo e voci', entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.data) && e.titolo && e.voci?.length))

const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
// Ogni caso parte da un contesto pulito: il localStorage è la sola cosa che conta qui.
async function apri({ storage = {}, path = '/#/oggi' } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, storage)
  await p.goto(base + path)
  await p.reload({ waitUntil: 'networkidle' }) // il pannello parte all'avvio: serve un caricamento vero
  await p.waitForTimeout(600)
  return { p, ctx, errs }
}
const letto = (p) => p.evaluate(() => localStorage.getItem('b40:v1:lastSeenVersion'))

// 1. Primo accesso in assoluto: niente pannello, ma si parte allineati
{
  const { p, ctx, errs } = await apri({ storage: {}, path: '/' })
  ok('primo accesso: nessun pannello', await p.locator('.sheet-host').count() === 0)
  ok('primo accesso: lastSeenVersion salvato alla versione corrente', (await letto(p)) === String(ultima), String(await letto(p)))
  ok('primo accesso: si vede l\'onboarding, non le novità', await p.locator('.person-card').count() === 4)
  ok('primo accesso: nessun pallino sulla tab', await p.locator('.tab__dot').count() === 0)
  ok('primo accesso: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 2. Fermo alla v5 con changelog alla 7: vede la 6 e la 7, non tutte
{
  const { p, ctx, errs } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': '5' } })
  const sheet = p.locator('.sheet')
  ok('v5: il pannello si apre', await sheet.count() === 1)
  const testo = await sheet.innerText()
  const dopoLa5 = entries.filter((e) => e.v > 5)
  ok('v5: titolo e conteggio giusti', testo.includes('Cosa è cambiato') && testo.includes(`${dopoLa5.length} aggiornamenti da quando sei passato.`), testo.split('\n').filter(Boolean).slice(0, 2).join(' / '))
  ok('v5: ci sono solo le entry uscite dopo la 5', await sheet.locator('.novita__entry').count() === dopoLa5.length, `${await sheet.locator('.novita__entry').count()} su ${dopoLa5.length}`)
  ok('v5: c\'è il titolo della 7', testo.includes(entries.find((e) => e.v === 7).titolo))
  ok('v5: c\'è il titolo della 6', testo.includes(entries.find((e) => e.v === 6).titolo))
  ok('v5: NON c\'è il titolo della 5', !testo.includes(entries.find((e) => e.v === 5).titolo))
  ok('v5: pallino sulla tab Info', await p.locator('a.tab[href="#/info"] .tab__dot').count() === 1)
  ok('v5: il pulsante è "Ho capito"', (await sheet.locator('.btn--acqua').innerText()).trim() === 'Ho capito')
  await sheet.locator('.btn--acqua').click()
  await p.waitForTimeout(500)
  ok('dopo "Ho capito": il pannello si chiude e salva', await p.locator('.sheet-host').count() === 0 && (await letto(p)) === String(ultima))
  ok('dopo "Ho capito": il pallino sparisce', await p.locator('.tab__dot').count() === 0)
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  ok('dopo il reload: il pannello non ricompare', await p.locator('.sheet-host').count() === 0)
  ok('v5: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 3. Chiusura col tap fuori: salva comunque
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"monne"', 'b40:v1:lastSeenVersion': '6' } })
  ok('tap fuori: il pannello c\'era', await p.locator('.sheet-host').count() === 1)
  await p.mouse.click(190, 50)
  await p.waitForTimeout(400)
  ok('tap fuori: chiude e salva lo stesso', await p.locator('.sheet-host').count() === 0 && (await letto(p)) === String(ultima), String(await letto(p)))
  await ctx.close()
}
// 4. Chiusura con lo swipe verso il basso: salva comunque
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"giulio"', 'b40:v1:lastSeenVersion': '4' } })
  const box = await p.locator('.sheet__handle').boundingBox()
  await p.touchscreen.tap(box.x + box.width / 2, box.y)
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('.sheet')
    const tocco = (cy) => new Touch({ identifier: 1, target: el, clientX: x, clientY: cy })
    const ev = (tipo, cy) => new TouchEvent(tipo, { touches: [tocco(cy)], changedTouches: [tocco(cy)], bubbles: true })
    el.dispatchEvent(ev('touchstart', y))
    el.dispatchEvent(ev('touchmove', y + 90))
    el.dispatchEvent(ev('touchend', y + 140))
  }, { x: box.x + box.width / 2, y: box.y })
  await p.waitForTimeout(400)
  ok('swipe giù: chiude e salva lo stesso', await p.locator('.sheet-host').count() === 0 && (await letto(p)) === String(ultima), String(await letto(p)))
  await ctx.close()
}

// 5. Chi c'era prima che il changelog esistesse: chiave assente ma dati salvati
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:done': '["f2"]' } })
  ok('chiave assente ma dati salvati: vede tutto lo storico', await p.locator('.sheet .novita__entry').count() === entries.length, String(await p.locator('.sheet .novita__entry').count()))
  ok('conteggio al plurale', (await p.locator('.sheet').innerText()).includes(`${entries.length} aggiornamenti da quando sei passato.`))
  await ctx.close()
}
// 6. Una sola novità: copy al singolare
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': String(ultima - 1) } })
  ok('una sola novità: copy al singolare', (await p.locator('.sheet').innerText()).includes('Un aggiornamento da quando sei passato.'))
  await ctx.close()
}

// 7. La sezione in Info
{
  const { p, ctx, errs } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': '5' }, path: '/#/info' })
  await p.locator('.sheet .btn--acqua').click()
  await p.waitForTimeout(600)
  const ids = await p.evaluate(() => [...document.querySelectorAll('.acc > details')].map((d) => d.id))
  ok('Info: "Novità" è il primo accordion', ids[0] === 'sec-novita', ids.join(' '))
  ok('Info: lo storico resta consultabile anche dopo averlo letto', await p.locator('#sec-novita .novita__entry').count() === entries.length)
  ok('Info: niente puntini quando è tutto letto', await p.locator('#sec-novita .novita__punto').count() === 0)
  // a sezione letta l'accordion è chiuso: innerText non vede il contenuto nascosto, innerHTML sì
  ok('Info: quando è tutto letto lo dice', (await p.locator('#sec-novita').innerHTML()).includes('Nessuna novità. Sei aggiornato.'))
  ok('Info: con tutto letto la sezione parte chiusa', await p.locator('#sec-novita').evaluate((d) => !d.open))
  ok('Info: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': '5' }, path: '/#/info' })
  await p.keyboard.press('Escape') // chiude senza leggere davvero: i puntini restano finché non si salva
  await p.waitForTimeout(400)
  await p.goto(base + '/#/info')
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  ok('Info: le entry non lette hanno il puntino', await p.locator('#sec-novita .novita__punto').count() === 0, 'dopo Esc risultano lette, come da specifica')
  await ctx.close()
}

// 8. Avvisa i ragazzi: solo Alessandro
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': String(ultima) }, path: '/#/info' })
  const a = p.locator('[data-avvisa]')
  ok('ale: c\'è il pulsante "Avvisa i ragazzi"', await a.count() === 1)
  const href = decodeURIComponent((await a.getAttribute('href')).replace('https://wa.me/?text=', ''))
  const e = entries[0]
  ok('il testo parte da "Aggiornato il sito"', href.startsWith('Aggiornato il sito 🔧'), href.split('\n')[0])
  ok('il testo riporta titolo e voci dell\'ultima entry', href.includes(e.titolo) && e.voci.every((v) => href.includes(`- ${v}`)))
  ok('il testo finisce con l\'indirizzo del sito', /https:\/\/[^\s]+\/$/.test(href.trim()), href.trim().split('\n').pop())
  ok('si apre in una scheda nuova', await a.getAttribute('target') === '_blank' && await a.getAttribute('rel') === 'noopener')
  await ctx.close()
}
for (const chi of ['giulio', 'manuel', 'monne']) {
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': `"${chi}"`, 'b40:v1:lastSeenVersion': String(ultima) }, path: '/#/info' })
  ok(`${chi}: nessun pulsante "Avvisa i ragazzi"`, await p.locator('[data-avvisa]').count() === 0 && !(await p.evaluate(() => document.body.innerHTML)).includes('Avvisa i ragazzi'))
  await ctx.close()
}

// 9. Cache: i dati stanno nel bundle con l'hash, non in un file scaricato a parte
{
  const { p, ctx } = await apri({ storage: { 'b40:v1:person': '"ale"', 'b40:v1:lastSeenVersion': String(ultima) } })
  const richieste = await p.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name))
  ok('nessuna richiesta a /data/changelog.json: è dentro il bundle', !richieste.some((u) => u.includes('changelog.json')))
  ok('il bundle ha l\'hash nel nome', richieste.some((u) => /\/assets\/main-[A-Za-z0-9_-]{8}\.js/.test(u)), richieste.filter((u) => u.includes('/assets/main')).join(' '))
  await ctx.close()
}
await b.close()
console.log(`\n${out.filter(Boolean).length}/${out.length} controlli passati`)
