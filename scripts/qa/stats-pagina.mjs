// QA della pagina privata delle statistiche (stats-dtcmbsis.html).
// Il browser di questo container non si fida della CA del proxy, quindi le chiamate vere a
// GoatCounter da dentro la pagina non si possono provare qui: si provano con curl (sotto) e la
// pagina si prova con fetch sostituita, così i numeri sono controllabili riga per riga.
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PAGINA = 'stats-dtcmbsis.html'
const CONTATORE = 'https://barcellona40.goatcounter.com/counter/'
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }

// ——— 1. la pagina non è linkata da nessuna parte del sito ———
{
  const cerca = (dir) => readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : cerca(p)
    return /\.(js|css|html|json|md)$/.test(f) ? [p] : []
  })
  const file = ['src', 'data', 'public', 'scripts'].flatMap(cerca).concat(['index.html', 'vite.config.js', 'CHANGELOG.md'])
  const citano = file.filter((f) => readFileSync(f, 'utf8').includes('stats-dtcmbsis'))
  // Solo la configurazione di build e la QA possono nominarla: il sito no.
  const ammessi = new Set(['vite.config.js', 'CHANGELOG.md', path.join('scripts', 'qa', 'stats-pagina.mjs')])
  const intrusi = citano.filter((f) => !ammessi.has(f))
  ok('nessun link alla pagina nel sito', intrusi.length === 0, intrusi.join(', '))
  ok('la pagina non compare nemmeno nel changelog degli amici', !readFileSync('data/changelog.json', 'utf8').includes('stats-dtcmbsis'))
}

// ——— 2. i percorsi veri rispondono (curl: qui la CA del proxy è a posto) ———
const veri = {}
for (const p of ['/manuel/oggi', 'manuel/missione-completata', '/giulio/oggi']) {
  let stato = 0, corpo = '{}'
  try {
    const r = execFileSync('curl', ['-s', '-w', '\n%{http_code}', CONTATORE + encodeURIComponent(p) + '.json'], { encoding: 'utf8' })
    const righe = r.trim().split('\n')
    stato = Number(righe.pop()); corpo = righe.join('\n')
  } catch { /* rete assente: il controllo sotto lo dice */ }
  const j = JSON.parse(corpo || '{}')
  veri[p] = { stato, n: Number(j.count || 0), unici: Number(j.count_unique || 0) }
  ok(`contatore vero ${p} → ${stato}`, stato === 200 || stato === 404, JSON.stringify(j))
  ok(`${p}: il 404 vale zero`, stato !== 404 || veri[p].n === 0)
}

// ——— la finta GoatCounter dentro il browser ———
const FINTA = (dati) => {
  window.__fetchLog = { chiamate: [], inVolo: 0, picco: 0 }
  window.fetch = (url) => {
    const L = window.__fetchLog
    L.chiamate.push(String(url))
    L.inVolo++; L.picco = Math.max(L.picco, L.inVolo)
    const chiave = decodeURIComponent(String(url).split('/counter/')[1] || '').replace(/\.json$/, '')
    const v = dati.mappa[chiave]
    return new Promise((res, rej) => setTimeout(() => {
      L.inVolo--
      if (dati.rompiTutto || (dati.rompi || []).includes(chiave)) { rej(new TypeError('Failed to fetch')); return }
      const body = JSON.stringify(v ? { count: String(v[0]), count_unique: String(v[1]) } : { count: '0', count_unique: '0' })
      res(new Response(body, { status: v ? 200 : 404, headers: { 'Content-Type': 'application/json' } }))
    }, 20))
  }
}

const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function apri(dati) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 900 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(FINTA, dati)
  await p.goto(`${base}/${PAGINA}`, { waitUntil: 'load' })
  await p.waitForSelector('.s-foot', { timeout: 20000 })
  return { p, ctx, errs }
}
// Numeri finti ma espliciti: ogni riga della pagina deve poterci essere ricondotta.
const MAPPA = {
  '/alessandro/oggi': [7, 3], '/alessandro/programma': [4, 2], '/alessandro/mappa': [1, 1],
  '/alessandro/missioni': [2, 1], '/alessandro/info': [3, 2], '/alessandro/coro': [1, 1],
  'alessandro/album-apri': [2, 1], 'alessandro/canzone-play': [5, 2], 'alessandro/rigori-apri': [1, 1],
  '/monne/oggi': [2, 2], '/monne/speedrun': [1, 1], 'monne/qr-parcheggio-apri': [1, 1],
  '/manuel/oggi': [1, 1], 'manuel/missione-completata': [1, 1],
  '/anonimo/onboarding': [2, 2],
  'maps-tappa/f8': [4, 2], 'maps-tappa/s4': [9, 3], 'maps-tappa/d2': [1, 1]
}
const TOT_VISTE = 7 + 4 + 1 + 2 + 3 + 1 + 2 + 1 + 1 // profili, senza /anonimo/onboarding
// Quante richieste deve fare la pagina: 4 profili × 6 sezioni, lo speedrun di Monne, gli eventi
// (18 a testa meno i tre WhatsApp che valgono solo per Alessandro), l'onboarding e una per tappa con Maps.
const TAPPE_MAPS = JSON.parse(readFileSync('data/itinerary.json', 'utf8')).days.flatMap((d) => d.stops).filter((s) => s.actions?.maps).length
const RICHIESTE = 4 * 6 + 1 + (18 * 4 - 3) + 1 + TAPPE_MAPS

// ——— 3. la pagina disegnata sui numeri finti ———
{
  const { p, ctx, errs } = await apri({ mappa: MAPPA })
  const txt = await p.locator('body').innerText()
  ok('titolo della pagina', (await p.title()) === 'Statistiche · Barcelona 40')
  ok('meta noindex', (await p.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'))
  ok('totale delle viste', (await p.locator('.totale__num').innerText()).trim() === String(TOT_VISTE), await p.locator('.totale__num').innerText())
  ok('più attivo: Alessandro', (await p.locator('.totale__top').innerText()).includes('Alessandro'))
  ok('aperture prima del profilo', (await p.locator('.totale__anon').innerText()).includes('2'))
  ok('quattro card, una per persona', (await p.locator('.p-card').count()) === 4)
  const ale = p.locator('.p-card').first()
  ok('Alessandro: 18 viste in card', (await ale.locator('.p-card__tot').innerText()).trim() === '18', await ale.locator('.p-card__tot').innerText())
  ok('Alessandro: "volte diverse" quando è diverso', (await ale.innerText()).includes('volte diverse'))
  const barreAle = await ale.locator('.barra').allInnerTexts()
  ok('Alessandro: barra Oggi = 7', barreAle.some((t) => t.startsWith('Oggi') && t.trim().endsWith('7')), barreAle.join(' / '))
  ok('Alessandro: la barra Coro c\'è solo perché l\'ha aperto', barreAle.some((t) => t.startsWith('Coro')))
  ok('Alessandro: niente barra Speedrun', !barreAle.some((t) => t.startsWith('Speedrun')))
  const spunteAle = await ale.locator('.spunte li').allInnerTexts()
  ok('Alessandro: ✓ sulla canzone con il numero', spunteAle.some((t) => t.includes('Ascoltata la canzone') && t.includes('✓') && t.includes('5')))
  ok('Alessandro: — su quello che non ha toccato', spunteAle.some((t) => t.includes('Chiamato un taxi') && t.includes('—')))
  ok('solo Alessandro ha la voce WhatsApp', spunteAle.filter((t) => t.includes('WhatsApp')).length === 1)
  const monne = p.locator('.p-card').nth(1)
  ok('Monne: barra Speedrun presente', (await monne.locator('.barra').allInnerTexts()).some((t) => t.startsWith('Speedrun')))
  const giulio = p.locator('.p-card').nth(2)
  ok('Giulio: card spenta', (await giulio.getAttribute('class')).includes('p-card--spenta'))
  ok('Giulio: "Non ancora entrato"', (await giulio.innerText()).includes('Non ancora entrato'))
  ok('Manuel: entrato, quindi card viva', !(await p.locator('.p-card').nth(3).getAttribute('class')).includes('spenta'))
  ok('sezione "Cosa viene usato"', txt.includes('Cosa viene usato') && txt.includes('Ascoltata la canzone'))
  const maps = await p.locator('.s-titolo:has-text("Maps") + .barre .barra').allInnerTexts()
  ok('classifica Maps in ordine', maps[0].includes('9') && maps.length === 3, maps.join(' / '))
  ok('classifica Maps: solo le tappe aperte', !maps.some((t) => t.trim().endsWith(' 0')))
  ok('orario di aggiornamento', /Aggiornato alle \d{2}:\d{2}/.test(txt))
  ok('i limiti scritti in piccolo', (await p.locator('.s-limiti li').count()) === 4)
  const limiti = (await p.locator('.s-limiti').innerText()).toLowerCase()
  ok('limite: ad blocker', limiti.includes('ad blocker'))
  ok('limite: il profilo non è la persona', limiti.includes('non la persona reale'))
  ok('limite: totali, non per giorno', limiti.includes('non per giorno'))
  ok('niente scorrimento laterale a 380px', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 380)
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  // blocchi da 6
  ok('mai più di 6 richieste insieme', (await p.evaluate(() => window.__fetchLog.picco)) <= 6, String(await p.evaluate(() => window.__fetchLog.picco)))
  const chiamate = await p.evaluate(() => window.__fetchLog.chiamate.length)
  ok(`un solo giro di richieste (${RICHIESTE})`, chiamate === RICHIESTE, String(chiamate))
  ok('percorsi url-encoded', (await p.evaluate(() => window.__fetchLog.chiamate[0])).includes('%2F'))
  await ctx.close()
}

// ——— 4. i numeri veri di tre percorsi arrivano a schermo come sono ———
{
  const mappa = {}
  for (const [k, v] of Object.entries(veri)) if (v.stato === 200) mappa[k] = [v.n, v.unici]
  const { p, ctx } = await apri({ mappa })
  const manuel = p.locator('.p-card').nth(3)
  ok('Manuel: le viste di /manuel/oggi sono quelle del contatore', (await manuel.locator('.barra').allInnerTexts()).some((t) => t.startsWith('Oggi') && t.trim().endsWith(String(veri['/manuel/oggi'].n))), String(veri['/manuel/oggi'].n))
  ok('Manuel: la missione contata è quella del contatore', (await manuel.locator('.spunte li').allInnerTexts()).some((t) => t.includes('Completata una missione') && t.includes('✓')))
  // Il contatore è vivo: il giorno in cui Giulio entra, il 404 diventa 200. Il test segue il dato.
  const giulio = p.locator('.p-card').nth(2)
  if (veri['/giulio/oggi'].stato === 404) ok('Giulio: 404 sul contatore → card spenta', (await giulio.innerText()).includes('Non ancora entrato'))
  else ok('Giulio: le viste di /giulio/oggi sono quelle del contatore', (await giulio.locator('.barra').allInnerTexts()).some((t) => t.startsWith('Oggi') && t.trim().endsWith(String(veri['/giulio/oggi'].n))), String(veri['/giulio/oggi'].n))
  await ctx.close()
}

// ——— 5. GoatCounter irraggiungibile ———
{
  const { p, ctx, errs } = await apri({ mappa: MAPPA, rompiTutto: true })
  ok('tutto giù → "Dati non disponibili"', (await p.locator('.s-giu h2').innerText()).includes('Dati non disponibili'))
  ok('tutto giù → non spaccia il guasto per zero visite', (await p.locator('.s-giu').innerText()).includes('vuol dire che adesso non si può sapere'))
  ok('tutto giù → c\'è il pulsante Riprova', (await p.locator('[data-aggiorna]').count()) >= 1)
  ok('tutto giù → nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// Qualche richiesta persa: si mostra quello che c'è, dicendo che è incompleto
{
  const { p, ctx } = await apri({ mappa: MAPPA, rompi: ['/alessandro/oggi', 'alessandro/canzone-play'] })
  ok('richieste perse → avviso di dato parziale', (await p.locator('.s-parziale').innerText()).includes('2 richieste'))
  ok('richieste perse → la pagina resta in piedi', (await p.locator('.p-card').count()) === 4)
  await ctx.close()
}

// ——— 6. cache di 5 minuti e pulsante Aggiorna ———
{
  const { p, ctx } = await apri({ mappa: MAPPA })
  await p.reload({ waitUntil: 'load' })
  await p.waitForSelector('.s-foot')
  ok('ricaricando entro 5 minuti non si richiede niente', (await p.evaluate(() => window.__fetchLog.chiamate.length)) === 0)
  ok('i numeri arrivano dalla cache', (await p.locator('.totale__num').innerText()).trim() === String(TOT_VISTE))
  await p.locator('[data-aggiorna]').last().click()
  await p.waitForFunction(() => window.__fetchLog.chiamate.length > 0)
  await p.waitForSelector('.s-foot')
  ok('"Aggiorna" ricarica davvero i contatori', (await p.evaluate(() => window.__fetchLog.chiamate.length)) === RICHIESTE)
  // si fa invecchiare la cache di sei minuti, poi si ricarica
  await p.evaluate(() => {
    const o = JSON.parse(sessionStorage.getItem('b40:stats:v1'))
    o.quando = Date.now() - 6 * 60 * 1000
    sessionStorage.setItem('b40:stats:v1', JSON.stringify(o))
  })
  await p.reload({ waitUntil: 'load' })
  await p.waitForSelector('.s-foot')
  ok('dopo 5 minuti i contatori si rileggono', (await p.evaluate(() => window.__fetchLog.chiamate.length)) === RICHIESTE)
  await ctx.close()
}

await b.close()
const bad = out.filter((r) => r[0] === '✗')
for (const r of bad) console.log(r[0], r[1], r[2] ? `(${r[2]})` : '')
console.log(`${out.length - bad.length}/${out.length} test ok`)
