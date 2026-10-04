// QA dei tocchi fantasma: a ogni passaggio di schermata il dito si solleva quando la schermata nuova è già
// sotto, e il click non deve atterrare su niente. Tocchi veri via DevTools (touchStart, attesa 80–150 ms,
// touchEnd → pointerdown/pointerup/click di Chromium), N ripetizioni a passaggio, zero navigazioni ammesse.
//   node scripts/qa/rigori-tocchi.mjs [url] [ripetizioni]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const N = +(process.argv[3] || 50)
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const attesa = () => 80 + Math.floor(Math.random() * 70)
async function pagina(profilo = 'ale') {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript((profilo) => { try { localStorage.clear(); localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:person', JSON.stringify(profilo)); localStorage.setItem('b40:v1:rigori:xp', '400') } catch {} }, profilo)
  const cdp = await ctx.newCDPSession(p)
  // tocco vero: dito giù, pausa, dito su (Chromium genera pointerdown, pointerup e click)
  const tocco = async (x, y, ms = attesa()) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await p.waitForTimeout(ms)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const centro = async (sel) => { const r = await p.locator(sel).first().boundingBox(); if (!r) throw new Error('non trovato: ' + sel); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } }
  const toccaSu = async (sel, ms) => { const c = await centro(sel); await tocco(c.x, c.y, ms) }
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.waitForTimeout(300)
  return { p, ctx, errs, tocco, toccaSu, centro }
}
const flow = (p) => p.evaluate(() => window.__rigori?.flow() || 'FUORI').catch(() => 'FUORI')
const dentroIlGioco = (p) => /\/rigori\//.test(p.url())

// A. "Tocca per iniziare" → "Chi tira?" (pagina nuova a ogni ripetizione: è la schermata iniziale)
{
  let fuori = 0, flussoSbagliato = 0, bordi = 0, anelli = 0, sovrapposti = null
  for (let i = 0; i < 2 * N; i++) {
    const profilo = i % 2 ? 'monne' : 'ale'
    const { p, ctx, toccaSu, centro } = await pagina(profilo)
    const tap = await p.locator('.rg-loading__tap').boundingBox()
    await toccaSu('.rg-loading__tap'); await p.waitForTimeout(900)
    if (!dentroIlGioco(p)) fuori++
    else {
      if ((await flow(p)) !== 'chiTira') flussoSbagliato++
      const st = await p.evaluate(() => ({ tu: document.querySelectorAll('.rg-card--tu').length, anello: [...document.querySelectorAll('.rg-card, .rg-btn')].filter((e) => e.matches(':focus-visible')).length }))
      if (profilo === 'ale') bordi += st.tu
      anelli += st.anello
      if (sovrapposti == null && profilo === 'monne') { const link = await p.locator('.rg-overlay .rg-sito').boundingBox(); sovrapposti = !!(link && tap && link.y < tap.y + tap.height && link.y + link.height > tap.y); if (sovrapposti) console.log(`  nota: "Torna al programma" (y ${Math.round(link.y)}–${Math.round(link.y + link.height)}) e "Tocca per iniziare" (y ${Math.round(tap.y)}–${Math.round(tap.y + tap.height)}) si sovrappongono: la guardia deve reggere`) }
    }
    await ctx.close()
  }
  ok(`A. Tocca per iniziare → Chi tira?: ${2 * N} tocchi (Alessandro e Monne), zero uscite dal gioco`, fuori === 0, `${fuori} navigazioni involontarie`)
  ok('A. "Torna al programma" di Chi tira? non sta nella zona di "Tocca per iniziare"', sovrapposti === false, String(sovrapposti))
  ok('A. si arriva sempre a "Chi tira?"', flussoSbagliato === 0, `${flussoSbagliato} volte altrove`)
  ok('A. con profilo Alessandro nessun bordo giallo "Sei tu"; con nessun profilo un anello di focus al tocco', bordi === 0 && anelli === 0, `bordi ${bordi}, anelli ${anelli}`)
}
// B. "Chi tira?" → Modalità e ritorno; C. Modalità → partita (ed Esci); D. ≡ → Pausa → Continua
{
  const { p, ctx, errs, toccaSu } = await pagina('monne')
  await toccaSu('.rg-loading__tap'); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira', null, { timeout: 30000 }).catch(() => { throw new Error('uscito dal gioco al primo tocco: ' + p.url()) }); await p.waitForTimeout(400)
  let fuori = 0, sbagliati = 0
  for (let i = 0; i < N; i++) {
    await toccaSu('.rg-card[data-value="giulio"]'); await p.waitForTimeout(700)
    if (!dentroIlGioco(p)) { fuori++; break }
    if ((await flow(p)) !== 'modalita') sbagliati++
    await toccaSu('[data-tira] [data-value="__chi"]'); await p.waitForTimeout(600)
    if (!dentroIlGioco(p)) { fuori++; break }
    if ((await flow(p)) !== 'chiTira') sbagliati++
  }
  ok(`B. Chi tira? ⇄ Modalità: ${N} andate e ritorni, zero uscite`, fuori === 0 && sbagliati === 0, `${fuori} uscite, ${sbagliati} schermate sbagliate`)
  fuori = 0; sbagliati = 0
  for (let i = 0; i < N; i++) {
    await toccaSu('[data-tira-io]'); await p.waitForTimeout(600)
    await toccaSu('.rg-mode[data-value="sfidaAle"]'); await p.waitForTimeout(900)
    if (!dentroIlGioco(p)) { fuori++; break }
    if ((await flow(p)) !== 'gioco') { sbagliati++; continue }
    // D. Pausa: ≡ → la Pausa resta aperta, "Continua" la chiude
    await toccaSu('.rg-menubtn'); await p.waitForTimeout(700)
    if (!dentroIlGioco(p)) { fuori++; break }
    if ((await p.locator('.rg-overlay[data-overlay]').count()) !== 1) sbagliati++
    await toccaSu('[data-value="continua"]'); await p.waitForTimeout(500)
    if ((await p.locator('.rg-overlay[data-overlay]').count()) !== 0) sbagliati++
    await toccaSu('.rg-menubtn'); await p.waitForTimeout(700)
    await toccaSu('[data-value="esci"]'); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira', null, { timeout: 30000 }).catch(() => sbagliati++); await p.waitForTimeout(400)
  }
  ok(`C+D. Modalità → partita → ≡ Pausa → Continua → Esci: ${N} giri, zero uscite`, fuori === 0 && sbagliati === 0, `${fuori} uscite, ${sbagliati} passaggi sbagliati`)
  ok('B–D. nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// E. esito → risultato: il tocco che salta l'esito finisce sul risultato appena comparso
{
  const { p, ctx, errs, toccaSu, tocco } = await pagina('monne')
  await toccaSu('.rg-loading__tap'); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira', null, { timeout: 30000 }).catch(() => { throw new Error('uscito dal gioco al primo tocco: ' + p.url()) }); await p.waitForTimeout(400)
  let fuori = 0, sbagliati = 0
  for (let i = 0; i < N; i++) {
    await toccaSu('[data-tira-io]'); await p.waitForTimeout(500)
    await toccaSu('.rg-mode[data-value="sfidaAle"]'); await p.waitForTimeout(800)
    if ((await flow(p)) !== 'gioco') { sbagliati++; continue }
    // la terza parata chiude la partita: tiro nel portiere con due parate già a referto
    await p.evaluate(() => { const R = window.__rigori; R.mode().saves = 2; R.events.length = 0; R.setPrecision(0); R.ctx.forceKeeperZone(5); R.fire({ x: 1.4, y: 0.4, power: 0.5, curve: 0 }, true, 0.3) })
    await p.waitForFunction(() => window.__rigori.esitoLocked && window.__rigori.events.some((e) => e.type === 'result'), null, { timeout: 30000 }); await p.waitForTimeout(600)
    await tocco(206, 500) // sullo stage: il pointerdown salta l'esito, il risultato compare sotto il dito
    await p.waitForTimeout(900)
    if (!dentroIlGioco(p)) { fuori++; break }
    if ((await flow(p)) !== 'risultato' || (await p.locator('.rg-overlay[data-overlay]').count()) !== 1) sbagliati++
    await toccaSu('[data-value="menu"]'); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira', null, { timeout: 30000 }).catch(() => sbagliati++); await p.waitForTimeout(300)
  }
  ok(`E. esito saltato col dito → risultato: ${N} volte, il risultato resta e non si esce`, fuori === 0 && sbagliati === 0, `${fuori} uscite, ${sbagliati} sbagliati`)
  ok('E. nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// F. pass-and-play: "para tu" → "passa il telefono" (il tocco sulla zona non deve chiudere il passaggio)
{
  const { p, ctx, errs, toccaSu } = await pagina('giulio')
  await toccaSu('.rg-loading__tap'); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira', null, { timeout: 30000 }).catch(() => { throw new Error('uscito dal gioco al primo tocco: ' + p.url()) }); await p.waitForTimeout(400)
  await toccaSu('[data-tira-io]'); await p.waitForTimeout(500)
  await toccaSu('.rg-mode[data-value="passAndPlay"]'); await p.waitForSelector('[data-go]'); await toccaSu('[data-name="Manuel"]'); await p.waitForTimeout(300); await toccaSu('[data-go]')
  await p.waitForFunction(() => window.__rigori.flow() === 'gioco', null, { timeout: 30000 })
  let sbagliati = 0, fatti = 0
  for (let i = 0; i < N; i++) {
    await p.waitForSelector('.rg-zone', { timeout: 30000 }).catch(() => null)
    if (!(await p.locator('.rg-zone').count())) { sbagliati++; break }
    await toccaSu('.rg-zone'); await p.waitForTimeout(700)
    if ((await p.locator('[data-ok]').count()) !== 1 || (await p.locator('.rg-zone').count()) !== 0) sbagliati++
    await toccaSu('[data-ok]'); await p.waitForTimeout(600)
    if ((await p.locator('[data-ok]').count()) !== 0) sbagliati++
    // il tiro lo fa la API, poi si salta l'esito e si aspetta il prossimo "para tu" (o il risultato)
    await p.evaluate(() => { const R = window.__rigori; R.events.length = 0; R.setPrecision(0); R.fire({ x: -1.6, y: 0.5, power: 0.9, curve: 0 }, true, 0.3) })
    await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }).catch(() => null); await p.waitForTimeout(600)
    await p.evaluate(() => window.__rigori.salta()); await p.waitForTimeout(800)
    fatti++
    if ((await flow(p)) === 'risultato') { await toccaSu('[data-value="again"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco', null, { timeout: 30000 }).catch(() => null); await p.waitForSelector('[data-go]', { timeout: 5000 }).then(() => toccaSu('[data-go]')).catch(() => null) }
  }
  ok(`F. pass-and-play "para tu" → "passa il telefono": ${fatti} turni, nessun passaggio saltato dal tocco`, sbagliati === 0 && fatti === N, `${sbagliati} sbagliati su ${fatti}`)
  ok('F. nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK tocchi')
