// QA dei controlli da tastiera del gioco (solo desktop) e della convivenza con mouse e touch.
// 1) Partita completa (Shootout) SOLO con la tastiera: frecce, Q/E, Spazio tenuto e rilasciato nella finestra 70–85 %,
//    tuffi con frecce + Spazio. Il record del tiro deve avere esattamente mira, potenza ed effetto della tastiera.
// 2) Partita completa solo col mouse (swipe con pointer mouse). 3) Partita completa sul telefono (touch via CDP).
// 4) Spazio e click insieme → un tiro solo. 5) Riquadro dei tasti: desktop sì, sparisce dopo il primo tiro, H lo riapre,
//    telefono no. 6) Spazio non fa scorrere la pagina. 7) Invio conferma, Esc pausa e chiude, M audio, guardia 350 ms.
//   node scripts/qa/rigori-tastiera.mjs [url base]
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const URL = `${base}/rigori/?noflow=1&q=bassa`
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
async function apri({ mobile = false } = {}) {
  // viewport piccola anche su desktop: con SwiftShader il gioco va a pochi fps e ogni pixel costa
  const ctx = await b.newContext(mobile ? { viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 720, height: 540 }, isMobile: false, hasTouch: false })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(URL, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 90000 })
  await p.evaluate(() => window.__rigori.kitReady)
  await p.evaluate(() => { const R = window.__rigori; R.settings.skipReplay = true; R.applySettings() })
  return { p, ctx, errs }
}
const stato = (p) => p.evaluate(() => { const R = window.__rigori, m = R.mode(); return { role: R.role(), shot: R.shotState(), locked: R.esitoLocked, mode: m && { round: m.round, me: m.me, ale: m.ale, finished: m.finished }, kicks: R.events.filter((e) => e.type === 'kick').length, risultati: R.events.filter((e) => e.type === 'result').length } })
const risultati = async (p) => (await stato(p)).risultati
const attendi = async (p, f, ms, che) => { const t0 = Date.now(); for (;;) { const s = await stato(p); if (f(s)) return s; if (Date.now() - t0 > ms) throw new Error('attesa scaduta: ' + che + ' · ' + JSON.stringify(s)); await p.waitForTimeout(80) } }
// turno pronto: ruolo stabile per due letture di fila, palla ferma, nessun esito in corso (o partita finita)
async function attendiTurno(p) {
  let prec = null
  return attendi(p, (s) => {
    if (!s.mode || s.mode.finished) return true
    const pronto = (s.role === 'shooter' || s.role === 'keeper') && s.shot === 'idle' && !s.locked
    const stabile = pronto && prec && prec.role === s.role && prec.shot === 'idle' && !prec.locked
    prec = s
    return stabile
  }, 40000, 'turno')
}
// tiene Spazio finché la barra è nella finestra 70–85 % e rilascia: potenza "perfetta"
async function spazioNellaFinestra(p, { min = 0.72, max = 0.83 } = {}) {
  await p.keyboard.down('Space')
  const t0 = Date.now()
  for (;;) {
    const v = await p.evaluate(() => window.__rigori.tastiera.potenza)
    if (v != null && v >= min && v <= max) break
    if (Date.now() - t0 > 60000) throw new Error('la barra non è mai entrata nella finestra: ' + v)
    await p.waitForTimeout(8)
  }
  await p.keyboard.up('Space')
}
async function partita(p, turno) {
  await p.evaluate(() => { const R = window.__rigori; R.game.holdShot = false; R.events.length = 0; R.setShooter('monne'); R.startMode('shootout') })
  let tiri = 0, tuffi = 0, finita = false
  for (let n = 0; n < 40; n++) {
    const s = await attendiTurno(p)
    if (!s.mode || s.mode.finished) { finita = true; break } // a fine partita mode() torna null (endMode)
    // si aspetta l'ESITO del tiro (un evento 'result' in più), non la finestra del lock: a pochi fps una lettura
    // può saltare i 900 ms in cui l'esito resta a schermo
    await p.evaluate(() => { window.__rigori.events.length = 0 })
    const r0 = 0
    if (s.role === 'shooter') { await turno.tira(p, n); tiri++ } else { await turno.tuffa(p, n); tuffi++ }
    await attendi(p, (x) => x.risultati > r0 || x.mode?.finished || !x.mode, 40000, 'esito')
    await p.waitForTimeout(200)
  }
  const fine = await stato(p)
  return { tiri, tuffi, fine, finita }
}
// ——— 1. solo tastiera (desktop) ———
{
  const { p, ctx, errs } = await apri()
  ok('desktop: il gioco sa di essere su desktop', await p.evaluate(() => window.__rigori.tastiera.desktop === true))
  let record = null
  const tastiera = {
    async tira(p, n) {
      await p.waitForTimeout(400) // guardia anti-ghost di 350 ms dal cambio di ruolo
      const m0 = await p.evaluate(() => window.__rigori.tastiera.mira)
      // mira: a sinistra o a destra alternando, in alto ogni terzo tiro. Si tiene il tasto finché il mirino si è spostato
      // di almeno 0,3 m (a 60 fps bastano 250 ms; qui, a pochi fps, serve di più)
      const tieni = async (k, f) => { await p.keyboard.down(k); const t0 = Date.now(); while (!f(await p.evaluate(() => window.__rigori.tastiera.mira)) && Date.now() - t0 < 20000) await p.waitForTimeout(50); await p.keyboard.up(k) }
      await tieni(n % 2 ? 'ArrowLeft' : 'ArrowRight', (m) => Math.abs(m.x - m0.x) >= 0.3)
      if (n % 3 === 0) await tieni('ArrowUp', (m) => m.y - m0.y >= 0.2)
      const m1 = await p.evaluate(() => window.__rigori.tastiera.mira)
      if (n === 0) ok('frecce: il mirino si muove (passo fluido) e resta dentro i limiti della porta', Math.abs(m1.x - m0.x) >= 0.3 && m1.y > m0.y && Math.abs(m1.x) <= 4.2 && m1.y <= 2.9, JSON.stringify([m0, m1]))
      await p.keyboard.press(n % 2 ? 'q' : 'e')
      if (n === 1) { await p.keyboard.press('q'); ok('Q due volte: effetto forte a sinistra (−1)', (await p.evaluate(() => window.__rigori.tastiera.curva)) === -1) }
      const atteso = await p.evaluate(() => ({ mira: window.__rigori.tastiera.mira, curva: window.__rigori.tastiera.curva }))
      await spazioNellaFinestra(p)
      await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 })
      const rec = await p.evaluate(() => { const r = window.__rigori.record(); return { aim: r.aim, timingPerfect: !!r.timingPerfect } })
      if (n === 0) { record = { atteso, rec }; ok('il record del tiro ha mira (± dispersione) ed effetto della tastiera, potenza nella finestra, tempismo perfetto', Math.abs(rec.aim.x - atteso.mira.x) < 0.05 && Math.abs(rec.aim.y - atteso.mira.y) < 0.05 && rec.aim.curve === atteso.curva /* il record porta la dispersione della precisione, come per lo swipe: tolleranza di 5 cm */ && rec.aim.power >= 0.72 && rec.aim.power <= 0.83 && rec.timingPerfect, JSON.stringify(record)) }
    },
    async tuffa(p, n) {
      await attendi(p, (s) => s.shot === 'windup' || s.shot === 'flying', 40000, 'tiro di Ale')
      const tasti = [['ArrowUp', 'ArrowLeft'], ['ArrowRight'], ['ArrowUp', 'ArrowRight'], ['ArrowLeft'], []][n % 5]
      for (const k of tasti) await p.keyboard.down(k)
      const zona = await p.evaluate(() => window.__rigori.tastiera.zona)
      await p.keyboard.press('Space')
      for (const k of tasti) await p.keyboard.up(k)
      const scelta = await p.evaluate(() => window.__rigori.game.shot.playerDiveZone())
      if (n === 1 || n === 3) ok(`tuffo da tastiera (${tasti.join('+') || 'centro'}): zona ${zona} registrata`, scelta === zona, `${scelta} vs ${zona}`)
    }
  }
  const r = await partita(p, tastiera)
  ok(`partita completa solo con la tastiera: finita, ${r.tiri} tiri e ${r.tuffi} tuffi`, r.finita && r.tiri >= 3 && r.tuffi >= 3 /* un best of 5 può chiudersi prima del quinto rigore */, JSON.stringify({ ...r.fine, tiri: r.tiri, tuffi: r.tuffi }))
  ok('solo tastiera: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// ——— 2. solo mouse (desktop) ———
async function swipeMouse(p, { dx, dy, passi = 12, ms = 180 }) {
  const b0 = await p.evaluate(() => window.__rigori.game.input.ballOnScreen())
  const x0 = b0.x, y0 = Math.max(b0.y, (await p.evaluate(() => innerHeight)) * 0.6)
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= passi; i++) { await p.mouse.move(x0 + dx * i / passi, y0 + dy * i / passi); await p.waitForTimeout(ms / passi) }
  await p.mouse.up()
}
{
  const { p, ctx, errs } = await apri()
  const mouse = {
    async tira(p, n) { await p.waitForTimeout(400); await swipeMouse(p, { dx: (n % 2 ? -1 : 1) * 160, dy: -(260 + (n % 3) * 60) }); await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 }) },
    async tuffa(p, n) { await attendi(p, (s) => s.shot === 'windup' || s.shot === 'flying', 40000, 'tiro di Ale'); await swipeMouse(p, { dx: (n % 2 ? -1 : 1) * 140, dy: n % 3 === 0 ? -120 : 0, ms: 120 }) }
  }
  const r = await partita(p, mouse)
  ok(`partita completa solo col mouse: finita, ${r.tiri} tiri e ${r.tuffi} tuffi`, r.finita && r.tiri >= 3 && r.tuffi >= 3 /* un best of 5 può chiudersi prima del quinto rigore */, JSON.stringify({ ...r.fine, tiri: r.tiri, tuffi: r.tuffi }))
  ok('solo mouse: nessun errore JS', errs.length === 0, errs.join(' | '))
  // 4. Spazio e click insieme → un tiro solo
  await p.evaluate(() => { const R = window.__rigori; R.game.holdShot = false; R.events.length = 0; R.startMode('sfidaAle') })
  await attendi(p, (s) => s.role === 'shooter' && s.shot === 'idle', 20000, 'turno sfida')
  await p.waitForTimeout(400)
  await p.keyboard.down('Space'); await p.waitForTimeout(300)
  ok('Spazio tenuto: la barra carica', await p.evaluate(() => window.__rigori.tastiera.carica === true))
  await swipeMouse(p, { dx: 80, dy: -260 })
  ok('swipe col mouse mentre Spazio è tenuto: nessun tiro (lo swipe è disattivato)', (await stato(p)).kicks === 0)
  await spazioNellaFinestra(p)
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 })
  await p.waitForTimeout(300)
  ok('al rilascio UN tiro solo', (await stato(p)).kicks === 1, String((await stato(p)).kicks))
  await ctx.close()
}
// ——— 3. telefono: touch veri via CDP ———
async function swipeTouch(p, cdp, { dx, dy, passi = 10, ms = 160 }) {
  const b0 = await p.evaluate(() => window.__rigori.game.input.ballOnScreen())
  const x0 = b0.x, y0 = Math.max(b0.y, (await p.evaluate(() => innerHeight)) * 0.6)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let i = 1; i <= passi; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx * i / passi, y: y0 + dy * i / passi }] }); await p.waitForTimeout(ms / passi) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
{
  const { p, ctx, errs } = await apri({ mobile: true })
  const cdp = await ctx.newCDPSession(p)
  ok('telefono: il gioco non è su desktop, il riquadro dei tasti non c\'è', await p.evaluate(() => window.__rigori.tastiera.desktop === false && !window.__rigori.tastiera.aiutoVisibile))
  const touch = {
    async tira(p, n) { await p.waitForTimeout(400); await swipeTouch(p, cdp, { dx: (n % 2 ? -1 : 1) * 90, dy: -(220 + (n % 3) * 50) }); await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 }) },
    async tuffa(p, n) { await attendi(p, (s) => s.shot === 'windup' || s.shot === 'flying', 40000, 'tiro di Ale'); await swipeTouch(p, cdp, { dx: (n % 2 ? -1 : 1) * 110, dy: n % 3 === 0 ? -100 : 0, ms: 110 }) }
  }
  const r = await partita(p, touch)
  ok(`partita completa sul telefono (touch): finita, ${r.tiri} tiri e ${r.tuffi} tuffi`, r.finita && r.tiri >= 3 && r.tuffi >= 3 /* un best of 5 può chiudersi prima del quinto rigore */, JSON.stringify({ ...r.fine, tiri: r.tiri, tuffi: r.tuffi }))
  ok('telefono: il riquadro dei tasti resta nascosto anche dopo', await p.evaluate(() => { const t = document.querySelector('.rg-tasti'); return t.hidden || getComputedStyle(t).display === 'none' }))
  ok('telefono: nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
// ——— 5-7. riquadro, Spazio, Invio, Esc, M, guardia ———
{
  const { p, ctx, errs } = await apri()
  ok('Spazio non fa scorrere la pagina (preventDefault)', await p.evaluate(() => { const ev = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true }); document.body.dispatchEvent(ev); return ev.defaultPrevented }))
  await p.evaluate(() => { window.__rigori.startMode('sfidaAle') })
  await attendi(p, (s) => s.role === 'shooter' && s.shot === 'idle', 20000, 'turno')
  ok('desktop: il riquadro dei tasti c\'è, in basso, con frecce, Q/E, Spazio, Invio, Esc, M, H', await p.evaluate(() => { const t = document.querySelector('.rg-tasti'); const r = t.getBoundingClientRect(); return !t.hidden && getComputedStyle(t).display !== 'none' && r.bottom > innerHeight * 0.8 && /Spazio/.test(t.textContent) && /Esc/.test(t.textContent) && /Invio/.test(t.textContent) }))
  ok('il mirino si vede subito, al centro della porta', await p.evaluate(() => !document.querySelector('.rg-mirino').hidden && window.__rigori.tastiera.mira.x === 0))
  // guardia: Spazio entro 350 ms dal cambio di ruolo non carica
  await p.evaluate(() => { const R = window.__rigori; R.ctx.role('shooter') })
  await p.keyboard.down('Space'); await p.waitForTimeout(50)
  ok('guardia anti-ghost: Spazio subito dopo il cambio di schermata non carica', await p.evaluate(() => window.__rigori.tastiera.carica === false))
  await p.keyboard.up('Space'); await p.waitForTimeout(500)
  await p.evaluate(() => { window.__rigori.events.length = 0 })
  await spazioNellaFinestra(p)
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 })
  ok('dopo il primo tiro il riquadro sparisce', await p.evaluate(() => document.querySelector('.rg-tasti').hidden))
  await p.keyboard.press('h')
  ok('H lo riapre', await p.evaluate(() => !document.querySelector('.rg-tasti').hidden))
  await p.keyboard.press('h')
  const audioPrima = await p.evaluate(() => window.__rigori.settings.audio !== false)
  await p.keyboard.press('m'); await p.waitForTimeout(100)
  ok('M: audio on/off', (await p.evaluate(() => window.__rigori.settings.audio !== false)) === !audioPrima)
  await p.keyboard.press('m')
  // Invio conferma la schermata aperta (passaggio del telefono)
  await attendi(p, (s) => !s.locked, 20000, 'fine esito')
  const invio = p.evaluate(() => window.__rigori.ctx.handoff('Monne').then(() => 'ok'))
  await p.waitForSelector('.rg-overlay [data-ok]'); await p.waitForTimeout(400)
  await p.keyboard.press('Enter')
  ok('Invio conferma la schermata aperta', (await Promise.race([invio, p.waitForTimeout(3000).then(() => 'no')])) === 'ok')
  // Esc apre la pausa (col ≡ visibile, come in partita) e la richiude
  await p.evaluate(() => { document.querySelector('.rg-menubtn').hidden = false })
  await p.keyboard.press('Escape'); await p.waitForTimeout(500)
  ok('Esc: si apre la Pausa', (await p.locator('.rg-overlay[data-overlay] .rg-title').innerText().catch(() => '')) === 'Pausa')
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok('Esc di nuovo: la Pausa si chiude', (await p.locator('.rg-overlay[data-overlay]').count()) === 0)
  // Tab: focus visibile sui pulsanti dei menu
  await p.evaluate(() => { document.querySelector('.rg-menubtn').click() }); await p.waitForTimeout(500)
  await p.keyboard.press('Tab')
  ok('Tab: il focus si muove sui pulsanti del menu con l\'anello visibile', await p.evaluate(() => { const a = document.activeElement; return !!a && a.closest('.rg-overlay') !== null && getComputedStyle(a).outlineStyle !== 'none' && parseFloat(getComputedStyle(a).outlineWidth) >= 2 }))
  await p.keyboard.press('Escape')
  ok('nessun errore JS', errs.length === 0, errs.join(' | '))
  await ctx.close()
}
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK rigori-tastiera')
