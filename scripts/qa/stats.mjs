// QA delle statistiche anonime (GoatCounter): script in pagina, percorsi con il profilo davanti,
// eventi, e le due guardie che devono spegnere tutto (?now= e sviluppo).
// Il sito non contatta mai GoatCounter da qui: con ?stats=prova le chiamate restano in
// window.__b40stats.conte, che è quello che leggiamo.
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }

// I link veri aprirebbero Maps, WhatsApp o il gioco: il clic si annulla in cattura, così i listener
// delegati scattano lo stesso ma la pagina resta dov'è.
const NO_NAV = () => document.addEventListener('click', (e) => { if (e.target.closest?.('a')) e.preventDefault() }, true)

async function open(path, { person = 'ale', novitaLette = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/')
  await p.evaluate(([x, n]) => {
    localStorage.clear()
    if (n) localStorage.setItem('b40:v1:lastSeenVersion', '999')
    if (x) localStorage.setItem('b40:v1:person', JSON.stringify(x))
  }, [person, novitaLette])
  await p.addInitScript(NO_NAV)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(400)
  return { p, ctx, errs }
}
// Clic sintetico: la tab bar fissa in fondo copre il punto centrale di alcuni link e intercetterebbe
// il tocco. Qui interessa che scatti il listener delegato, non la fisica del dito.
const tocca = (p, sel) => p.locator(sel).first().evaluate((el) => el.click())
const conte = (p) => p.evaluate(() => (window.__b40stats?.conte || []).map((c) => [c.path, c.title, !!c.event]))
const percorsi = async (p) => (await conte(p)).map((c) => c[0])
const eventi = async (p) => (await conte(p)).filter((c) => c[2])

// 1. Lo script è nella pagina, con l'account giusto e no_onload (il sito è a hash)
{
  const { p, ctx } = await open('/#/oggi')
  const s = await p.locator('script[data-goatcounter]').first()
  ok('script GoatCounter in pagina', (await p.locator('script[data-goatcounter]').count()) === 1)
  ok('account barcellona40', (await s.getAttribute('data-goatcounter')) === 'https://barcellona40.goatcounter.com/count')
  ok('no_onload attivo', JSON.parse(await s.getAttribute('data-goatcounter-settings')).no_onload === true)
  ok('caricato async', (await s.getAttribute('async')) !== null)
  await ctx.close()
}

// 2. In sviluppo non si conta: niente __b40stats e nessun errore, anche senza GoatCounter raggiungibile
{
  const { p, ctx, errs } = await open('/#/oggi')
  ok('senza ?stats=prova nessuna registrazione', (await p.evaluate(() => window.__b40stats === undefined)))
  ok('goatcounter assente (script bloccato)', (await p.evaluate(() => typeof window.goatcounter)) === 'undefined')
  ok('il sito si disegna lo stesso', (await p.locator('.hero, .bento, .view').count()) >= 1)
  ok('nessun errore JS senza statistiche', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 3. Una vista per profilo: il nome sta davanti al percorso
{
  const { p, ctx } = await open('/?stats=prova#/oggi', { person: 'giulio' })
  ok('vista con prefisso profilo', (await percorsi(p)).includes('/giulio/oggi'), (await percorsi(p)).join(','))
  await p.evaluate(() => { location.hash = '#/programma' }); await p.waitForTimeout(400)
  await p.evaluate(() => { location.hash = '#/mappa' }); await p.waitForTimeout(600)
  const ps = await percorsi(p)
  ok('cambio vista, nuovo conteggio', ps.includes('/giulio/programma') && ps.includes('/giulio/mappa'), ps.join(','))
  ok('nessun evento fra i conteggi di vista', (await eventi(p)).length === 0)
  await ctx.close()
}

// 4. Prima di scegliere il profilo: /anonimo/onboarding
{
  const { p, ctx } = await open('/?stats=prova#/oggi', { person: null })
  ok('onboarding anonimo', (await percorsi(p)).includes('/anonimo/onboarding'), (await percorsi(p)).join(','))
  await ctx.close()
}

// 5. Il profilo cambia, il prefisso dei conteggi successivi cambia con lui
{
  const { p, ctx } = await open('/?stats=prova#/info/profilo', { person: 'ale' })
  ok('prefisso alessandro (id ale)', (await percorsi(p)).includes('/alessandro/info'))
  await p.selectOption('#person', 'monne')
  await p.waitForTimeout(600)
  const ps = await percorsi(p)
  ok('dopo il cambio profilo il prefisso è monne', ps.some((x) => x.startsWith('/monne/')), ps.join(','))
  await ctx.close()
}

// 6. Un ri-render della stessa vista non vale una visita in più
{
  const { p, ctx } = await open('/?stats=prova#/info/profilo')
  await p.locator('#gam').check() // fa ridisegnare la vista dallo store
  await p.waitForTimeout(500)
  const quante = (await percorsi(p)).filter((x) => x === '/alessandro/info').length
  ok('ri-render della stessa vista: un solo conteggio', quante === 1, `conteggi: ${quante}`)
  await ctx.close()
}

// 7. Con ?now= non si conta niente: sono prove, non visite
{
  const { p, ctx } = await open('/?stats=prova&now=2026-10-17T10:00#/oggi')
  ok('con ?now= nessun conteggio', (await conte(p)).length === 0, (await percorsi(p)).join(','))
  await tocca(p, '.album__cta')
  await p.waitForTimeout(300)
  ok('con ?now= nemmeno gli eventi', (await conte(p)).length === 0)
  await ctx.close()
}
// Anche con ?now= dentro l'hash, che è la forma usata dalle altre suite
{
  const { p, ctx } = await open('/?stats=prova#/oggi?now=2026-10-17T10:00')
  ok('con ?now= nell\'hash nessun conteggio', (await conte(p)).length === 0, (await percorsi(p)).join(','))
  await ctx.close()
}

// 8. Eventi dell'album, della canzone e del gioco (tutti presenti in Info)
{
  const { p, ctx, errs } = await open('/?stats=prova#/info')
  await p.locator('#sec-extra summary').click() // la sezione Extra è chiusa: dentro c'è il gioco
  await tocca(p, '.album__cta')
  await tocca(p, '[data-album-copy]')
  await tocca(p, '[data-song-dl="mp3"]')
  await tocca(p, '[data-song-dl="video"]')
  await tocca(p, '[data-song-coro]')
  await tocca(p, '[data-rigori]')
  // play e pause dell'audio non si pilotano dai controlli nativi: si verifica il collegamento
  await p.evaluate(() => {
    document.querySelector('[data-song-audio]')?.dispatchEvent(new Event('play'))
    document.querySelector('[data-song-video]')?.dispatchEvent(new Event('play'))
  })
  await p.waitForTimeout(400)
  const ev = (await eventi(p)).map((c) => c[0] + '|' + c[1])
  for (const nome of ['album-apri', 'album-copia-link', 'canzone-scarica-mp3', 'canzone-scarica-video', 'coro-apri', 'rigori-apri', 'canzone-play', 'canzone-video']) {
    ok(`evento ${nome}`, ev.includes(`alessandro/${nome}|${nome}`), ev.join(' , '))
  }
  ok('gli eventi non sono viste (event: true)', (await conte(p)).filter((c) => c[2]).length === ev.length)
  ok('nessun errore JS con gli eventi', errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 9. Album su WhatsApp: solo Alessandro vede quel blocco
{
  const { p, ctx } = await open('/?stats=prova#/info')
  await tocca(p, '.share-album__cta')
  await p.waitForTimeout(300)
  ok('evento album-whatsapp', (await eventi(p)).some((c) => c[0] === 'alessandro/album-whatsapp'))
  await ctx.close()
}

// 10. Eventi del Programma: Maps di tappa (con l'id nel titolo), percorso, taxi, QR, giorno, pioggia
{
  const { p, ctx, errs } = await open('/?stats=prova#/programma/ven')
  const idTappa = await p.locator('[data-maps]').first().getAttribute('data-maps')
  await tocca(p, '[data-maps]')
  await tocca(p, '[data-percorso]')
  await tocca(p, '[data-taxi]')
  await tocca(p, '[data-qr]')
  await p.waitForTimeout(400)
  const ev = await eventi(p)
  const trova = (n) => ev.find((c) => c[0] === `alessandro/${n}`)
  ok('evento maps-tappa', !!trova('maps-tappa'))
  ok("maps-tappa porta l'id della tappa nel titolo", trova('maps-tappa')?.[1] === `maps-tappa ${idTappa}`, trova('maps-tappa')?.[1])
  ok('evento maps-percorso', !!trova('maps-percorso'))
  // Secondo conteggio senza profilo: è quello che rende interrogabile la classifica delle tappe,
  // perché i contatori pubblici di GoatCounter si leggono per percorso esatto.
  ok('evento globale maps-tappa/<id>', ev.some((c) => c[0] === `maps-tappa/${idTappa}`), ev.map((c) => c[0]).join(','))
  ok('evento taxi', !!trova('taxi'))
  ok('evento qr-parcheggio-apri', !!trova('qr-parcheggio-apri'))
  ok('nessun errore JS nel programma', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
{
  const { p, ctx } = await open('/?stats=prova#/programma/ven')
  await p.locator('#piove').check()
  await p.waitForTimeout(600)
  ok('evento piove-attiva', (await eventi(p)).some((c) => c[0] === 'alessandro/piove-attiva'))
  await tocca(p, '[data-day="sab"]')
  await p.waitForTimeout(600)
  const ev = await eventi(p)
  ok('evento giorno-cambia', ev.some((c) => c[0] === 'alessandro/giorno-cambia' && c[1] === 'giorno-cambia sab'), ev.map((c) => c[1]).join(','))
  ok('il cambio giorno conta anche come vista', (await percorsi(p)).filter((x) => x === '/alessandro/programma').length === 1)
  await ctx.close()
}
{
  // togliere la pioggia non è "piove-attiva": si conta solo quando si accende
  const { p, ctx } = await open('/?stats=prova#/programma/ven')
  await p.locator('#piove').check(); await p.waitForTimeout(600)
  await p.locator('#piove').uncheck(); await p.waitForTimeout(600)
  ok('piove-attiva contato una volta sola', (await eventi(p)).filter((c) => c[0] === 'alessandro/piove-attiva').length === 1)
  await ctx.close()
}

// 11. Missione completata: una volta sola, e non quando si toglie la spunta
{
  const { p, ctx } = await open('/?stats=prova#/missioni')
  const cb = p.locator('input[data-mission]').first()
  await cb.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await cb.check(); await p.waitForTimeout(400)
  ok('evento missione-completata', (await eventi(p)).some((c) => c[0] === 'alessandro/missione-completata'))
  await p.locator('input[data-mission]').first().uncheck(); await p.waitForTimeout(400)
  ok('togliere la spunta non conta', (await eventi(p)).filter((c) => c[0] === 'alessandro/missione-completata').length === 1)
  await ctx.close()
}

// 12. Pannello delle novità: si conta quando si apre davvero
{
  const { p, ctx } = await open('/?stats=prova#/oggi', { novitaLette: false })
  await p.waitForTimeout(600)
  ok('evento novita-apri col pannello aperto', (await eventi(p)).some((c) => c[0] === 'alessandro/novita-apri'))
  await ctx.close()
}
{
  const { p, ctx } = await open('/?stats=prova#/oggi')
  ok('niente novita-apri se non c\'è niente di nuovo', !(await eventi(p)).some((c) => c[0] === 'alessandro/novita-apri'))
  await ctx.close()
}

await b.close()
const bad = out.filter((r) => r[0] === '✗')
for (const r of bad) console.log(r[0], r[1], r[2] ? `(${r[2]})` : '')
console.log(`${out.length - bad.length}/${out.length} test ok`)
