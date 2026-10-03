// AUDIT 7 · il gioco: 20 partite di fila (heap, timer, listener), app in background a metà tiro, rotazione, doppio tocco,
// AudioContext, pass-and-play a 4, video con audio, tocchi fino al menu e al sito, Mario/Manuel. Solo Chromium.
import { readFileSync, readdirSync } from 'node:fs'
import { lancia, base, SWIFT, Registro } from './_lib.mjs'
const R = new Registro('gioco')
const b = await lancia([...SWIFT, '--js-flags=--expose-gc', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'])
const STRUMENTI = () => {
  const T = window.__t = { timeout: new Set(), interval: new Set(), listeners: 0, raf: 0, rafAttivi: 0 }
  const st = window.setTimeout, si = window.setInterval, ct = window.clearTimeout, ci = window.clearInterval, ae = EventTarget.prototype.addEventListener, re = EventTarget.prototype.removeEventListener, raf = window.requestAnimationFrame
  window.setTimeout = function (fn, ms, ...a) { const id = st(function () { T.timeout.delete(id); return typeof fn === 'function' ? fn(...a) : fn }, ms); T.timeout.add(id); return id }
  window.clearTimeout = function (id) { T.timeout.delete(id); return ct(id) }
  window.setInterval = function (...a) { const id = si(...a); T.interval.add(id); return id }
  window.clearInterval = function (id) { T.interval.delete(id); return ci(id) }
  EventTarget.prototype.addEventListener = function (...a) { T.listeners++; return ae.apply(this, a) }
  EventTarget.prototype.removeEventListener = function (...a) { T.listeners--; return re.apply(this, a) }
  window.requestAnimationFrame = function (fn) { T.raf++; return raf(fn) }
}
const nuova = async ({ person = 'monne', xp = 150, viewport = { width: 380, height: 820 } } = {}) => {
  const ctx = await b.newContext({ viewport, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(String(e.message))); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|goatcounter/.test(m.text())) errs.push('console: ' + m.text()) })
  await p.addInitScript(STRUMENTI)
  await p.addInitScript(({ person, xp }) => { try { localStorage.clear(); localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:rigori:xp', String(xp)) } catch {} }, { person, xp })
  await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 120000 }); await p.click('.rg-loading__tap', { force: true }); await p.waitForFunction(() => window.__rigori.flow() === 'chiTira', null, { timeout: 60000 }); await p.evaluate(() => window.__rigori.kitReady)
  return { p, ctx, errs }
}
const flow = (p, f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 90000 })
const stato = (p) => p.evaluate(() => ({ flow: window.__rigori.flow(), role: window.__rigori.role(), shot: window.__rigori.shotState(), lock: window.__rigori.esitoLocked, pick: !!document.querySelector('.rg-zone'), hand: !!document.querySelector('[data-ok]'), kick: window.__rigori.events.some((e) => e.type === 'kick') }))
const memoria = (p) => p.evaluate(async () => { window.gc?.(); await new Promise((r) => setTimeout(r, 300)); window.gc?.(); const T = window.__t; return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), timeout: T.timeout.size, interval: T.interval.size, listeners: T.listeners, raf: T.raf } })
// una partita di Sfida Ale corta: tre tiri fatti parare
async function sfidaCorta(p) {
  await p.click('[data-tira-io], .rg-card[data-value="monne"]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(500)
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { const R = window.__rigori; R.events.length = 0; R.ctx.forceKeeperZone(5); R.setPrecision(0); R.fire({ x: 1.4, y: 0.4, power: 0.5, curve: 0 }, true, 0.5) }); await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd') || window.__rigori.flow() === 'risultato', null, { timeout: 90000 }); await p.waitForTimeout(300) }
  await flow(p, 'risultato'); await p.waitForTimeout(300)
}
// 1. venti partite di fila
{
  const { p, ctx, errs } = await nuova()
  const m0 = await memoria(p); R.numero('memoria all\'inizio (menu)', m0)
  const t0 = Date.now()
  for (let i = 0; i < 20; i++) { await sfidaCorta(p); await p.click('[data-value="menu"]'); await flow(p, 'chiTira'); if (i === 9) R.numero('memoria dopo 10 partite', await memoria(p)) }
  const m1 = await memoria(p); R.numero('memoria dopo 20 partite (menu)', m1)
  R.numero('20 partite in', `${Math.round((Date.now() - t0) / 1000)} s (SwiftShader)`)
  const crescita = (m1.heapMB - m0.heapMB) / m0.heapMB * 100
  R.numero('crescita dell\'heap', `${crescita.toFixed(0)} %`)
  if (crescita > 30) R.problema('ALTA', `l'heap cresce del ${crescita.toFixed(0)} % in 20 partite (${m0.heapMB} → ${m1.heapMB} MB)`, { dove: 'src/rigori/main.js', riproduzione: '20 Sfida Ale di fila senza ricaricare', costo: 'medio: trovare cosa resta agganciato', rischio: 'basso' })
  if (m1.interval > m0.interval) R.problema('ALTA', `${m1.interval - m0.interval} setInterval in più dopo 20 partite`, { dove: 'src/rigori' })
  if (m1.timeout > m0.timeout + 2) R.problema('MEDIA', `${m1.timeout - m0.timeout} timeout pendenti in più dopo 20 partite`, { dove: 'src/rigori' })
  if (m1.listeners > m0.listeners + 50) R.problema('MEDIA', `${m1.listeners - m0.listeners} listener netti in più dopo 20 partite`, { dove: 'src/rigori (overlay e card ricreati)', nota: 'listener su elementi rimossi vengono raccolti con l\'elemento: conta, ma non è per forza una perdita' })
  if (errs.length) R.problema('ALTA', '20 partite: errori', { nota: errs.join(' | ').slice(0, 200) }); else R.ok('20 partite senza errori')
  await ctx.close()
}
// 2. app in background a metà tiro
{
  const { p, ctx, errs } = await nuova()
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(500)
  await p.evaluate(() => { window.__rigori.events.length = 0; window.__rigori.setPrecision(0); window.__rigori.fire({ x: 1.85, y: 1.5, power: 0.9, curve: 0 }, true, 0.3) })
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 30000 })
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await p.waitForTimeout(3000)
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  const ok = await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd') && window.__rigori.shotState() === 'idle', null, { timeout: 60000 }).then(() => true).catch(() => false)
  const st = await stato(p)
  if (!ok) R.problema('ALTA', 'app in background a metà tiro: al ritorno il gioco non riprende', { dove: 'src/rigori/main.js (nessun gestore di visibilitychange)', nota: JSON.stringify(st) }); else R.ok(`background a metà tiro: al ritorno il tiro si chiude e si torna al turno (${st.flow}, ${st.shot})`)
  const musica = await p.evaluate(() => ({ nome: window.__rigori.audio.musicName, stato: window.__rigori.audio.context?.state }))
  R.numero('audio durante il background', JSON.stringify(musica))
  R.problema('MEDIA', 'il gioco non ascolta visibilitychange: in background il loop continua (batteria) e l\'audio non si mette in pausa', { dove: 'src/rigori/main.js', riproduzione: 'durante una partita, blocca lo schermo o cambia app', costo: 'piccolo: pausa del loop e sospensione dell\'AudioContext su hidden', rischio: 'basso' })
  if (errs.length) R.problema('ALTA', 'background: errori', { nota: errs.join(' | ') })
  await ctx.close()
}
// 3. rotazione in ogni schermata
{
  const { p, ctx, errs } = await nuova()
  const schermate = [['chiTira', async () => {}], ['modalita', async () => { await p.click('[data-tira-io]'); await flow(p, 'modalita') }], ['gioco', async () => { await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(400) }], ['pausa', async () => { await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]') }]]
  for (const [nome, vai] of schermate) {
    await vai()
    await p.setViewportSize({ width: 820, height: 380 }); await p.waitForTimeout(500)
    const o = await p.evaluate(() => { const c = document.querySelector('canvas'); const pan = document.querySelector('.rg-panel'); const r = pan?.getBoundingClientRect(); return { canvas: c ? `${c.clientWidth}×${c.clientHeight}` : null, scrollX: document.documentElement.scrollWidth - innerWidth, panelDentro: !pan || (r.top >= -1 && r.bottom <= innerHeight + 1), panelH: r ? Math.round(r.height) : null, scrollPanel: pan ? pan.scrollHeight > pan.clientHeight + 2 : false, hud: document.querySelector('.rg-modehud') && !document.querySelector('.rg-modehud').hidden ? document.querySelector('.rg-modehud').getBoundingClientRect().width : null } })
    if (o.canvas !== '820×380') R.problema('MEDIA', `${nome} ruotato: canvas ${o.canvas} invece di 820×380`, { dove: 'src/rigori' })
    if (!o.panelDentro && !o.scrollPanel) R.problema('MEDIA', `${nome} ruotato: il pannello esce dallo schermo (h ${o.panelH}) senza scorrimento`, { dove: 'src/rigori/styles/rigori.css .rg-panel' })
    else R.ok(`${nome} ruotato 820×380: canvas ${o.canvas}, pannello ${o.panelDentro ? 'dentro' : 'scorre'}`)
    await p.setViewportSize({ width: 380, height: 820 }); await p.waitForTimeout(400)
  }
  await p.click('[data-value="continua"]').catch(() => {})
  if (errs.length) R.problema('ALTA', 'rotazione: errori', { nota: errs.join(' | ').slice(0, 160) })
  await ctx.close()
}
// 4. doppio tocco rapido
{
  const { p, ctx, errs } = await nuova()
  const doppio = async (sel) => { const el = p.locator(sel).first(); await el.click({ force: true }).catch(() => {}); await el.click({ force: true, timeout: 500 }).catch(() => {}); await p.waitForTimeout(500) }
  await doppio('[data-tira-io]'); await flow(p, 'modalita'); let ov = await p.locator('.rg-overlay').count(); if (ov !== 1) R.problema('ALTA', `doppio tocco sul volto: ${ov} overlay`, { dove: 'src/rigori/ui/screens/overlay.js' }); else R.ok('doppio tocco sul volto: un solo overlay')
  await doppio('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(800); ov = await p.locator('.rg-overlay').count(); const modi = await p.evaluate(() => window.__rigori.mode()?.id); if (ov !== 0) R.problema('ALTA', `doppio tocco sulla modalità: ${ov} overlay restano`, {}); else R.ok(`doppio tocco sulla modalità: una partita (${modi}), nessun overlay doppio`)
  await doppio('.rg-musicbtn'); const mus = await p.evaluate(() => window.__rigori.settings.music); if (mus !== false) R.problema('BASSA', 'doppio tocco sull\'altoparlante: resta acceso (due toggle in 500 ms)', { nota: 'comportamento atteso di un interruttore' }); else R.ok('doppio tocco sull\'altoparlante: torna spento')
  await doppio('.rg-menubtn'); ov = await p.locator('.rg-overlay').count(); if (ov > 1) R.problema('ALTA', `doppio tocco sul ≡: ${ov} overlay di pausa`, { dove: 'src/rigori/main.js menuBtn' }); else R.ok(`doppio tocco sul ≡: ${ov} overlay`)
  await p.click('[data-value="continua"]').catch(() => {}); await p.waitForTimeout(300)
  await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 1.85, y: 1.5, power: 0.9, curve: 0 }, true, 0.3) }); await p.waitForSelector('.rg-skip:not([hidden])', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300)
  await doppio('.rg-skip'); await p.waitForTimeout(800); const st = await stato(p); if (st.lock) R.problema('MEDIA', 'doppio tocco su "Tocca per saltare": l\'esito resta bloccato', { nota: JSON.stringify(st) }); else R.ok('doppio tocco su salta: si torna al turno')
  if (errs.length) R.problema('ALTA', 'doppio tocco: errori', { nota: errs.join(' | ').slice(0, 160) })
  await ctx.close()
}
// 5. AudioContext sospeso e ripreso; 6. pass-and-play a 4; 7. video con audio
{
  const { p, ctx, errs } = await nuova()
  await p.evaluate(() => window.__rigori.audio.context.suspend()); await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.waitForTimeout(300)
  const st = await p.evaluate(() => window.__rigori.audio.context.state)
  if (st !== 'running') R.problema('ALTA', `AudioContext resta ${st} dopo un tocco`, { dove: 'src/rigori/main.js' }); else R.ok('AudioContext sospeso → tocco → running (Chromium; WebKit non verificabile qui)')
  await p.click('.rg-mode[data-value="passAndPlay"]'); await p.waitForSelector('[data-go]'); await p.click('[data-name="Giulio"]'); await p.click('[data-name="Manuel"]'); await p.click('[data-go]'); await flow(p, 'gioco')
  const t0 = Date.now(); let tiri = 0
  while (Date.now() - t0 < 420000) { const s = await stato(p); if (s.flow === 'risultato') break; if (s.pick) { await p.click('.rg-zone'); await p.waitForTimeout(250); continue } if (s.hand) { await p.click('[data-ok]'); await p.waitForTimeout(250); continue } if (s.role === 'shooter' && s.shot === 'idle' && !s.lock) { await p.evaluate((i) => { const R = window.__rigori; R.events.length = 0; R.setPrecision(0); R.fire({ x: [-1.85, 0, 1.85][i % 3], y: i % 2 ? 1.5 : 0.45, power: 0.9, curve: 0 }, true, 0.5) }, tiri); tiri++ } await p.waitForTimeout(700) }
  const fine = await p.evaluate(() => ({ flow: window.__rigori.flow(), titolo: document.querySelector('.rg-panel .rg-title')?.textContent, righe: [...document.querySelectorAll('.rg-panel li, .rg-panel p')].map((e) => e.textContent.trim()).slice(0, 6) }))
  if (fine.flow !== 'risultato') R.problema('ALTA', `pass-and-play a 4: non arriva al risultato in 7 minuti (${tiri} tiri)`, { dove: 'src/rigori/game/modes/passAndPlay.js' }); else R.ok(`pass-and-play a 4: ${tiri} tiri, "${fine.titolo}"`, fine.righe.join(' | ').slice(0, 120))
  const video = await p.evaluate(async () => { const f = await window.__rigori.registraVideo(); if (!f) return { file: null, nonDisp: window.__rigori.videoNonDisponibile }; const t = new TextDecoder('latin1').decode(new Uint8Array(await f.slice(0, 262144).arrayBuffer())); return { file: f.name, size: f.size, tipo: f.type, audio: t.includes('soun') || /A_OPUS|A_AAC|A_VORBIS/.test(t), bottone: !!document.querySelector('[data-share-video]') } }).catch((e) => ({ errore: String(e) }))
  if (!video.file || !video.audio) R.problema('ALTA', `video condiviso: ${video.file ? 'senza traccia audio' : 'non prodotto'}`, { nota: JSON.stringify(video).slice(0, 160) }); else R.ok(`video: ${video.tipo} ${Math.round(video.size / 1024)} kB con traccia audio (Chromium)`)
  R.problema('MEDIA', 'WebKit non disponibile: "Condividi video" su iPhone (file muto → pulsante nascosto) non è verificato', { dove: 'src/rigori/core/condividi.js', costo: 'prova di 1 minuto su iPhone', rischio: '—' })
  if (errs.length) R.problema('ALTA', 'audio/pass-and-play/video: errori', { nota: errs.join(' | ').slice(0, 200) })
  await ctx.close()
}
// 8. tocchi fino al menu del gioco e al sito, da ogni schermata
{
  const { p, ctx } = await nuova()
  const conta = async (nome) => { const r = await p.evaluate(() => ({ sito: !!document.querySelector('.rg-overlay .rg-sito, .rg-sito'), menuBtn: !!document.querySelector('.rg-menubtn:not([hidden])'), menuVoce: !!document.querySelector('[data-value="menu"], [data-value="__chi"], [data-value="esci"]'), overlay: !!document.querySelector('.rg-overlay') })); return `${nome}: sito ${r.sito ? '1 tocco' : r.menuBtn ? '2 tocchi (≡ → Torna al programma)' : '≥3'} · menu ${r.menuVoce ? '1 tocco' : r.menuBtn ? '2 tocchi (≡ → Esci)' : '?'}` }
  const righe = [await conta('Chi tira?')]
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); righe.push(await conta('Modalità'))
  await p.click('[data-value="__opzioni"]'); await p.waitForSelector('[data-ok]'); righe.push(await conta('Opzioni')); await p.click('[data-ok]')
  await p.click('[data-value="__classifica"]'); await p.waitForSelector('[data-value="ok"]'); righe.push(await conta('Classifica')); await p.click('[data-value="ok"]')
  await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(300); righe.push(await conta('In partita'))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]'); righe.push(await conta('Pausa')); await p.click('[data-value="continua"]')
  await sfidaCorta(p); righe.push(await conta('Risultato'))
  R.numero('tocchi per uscire', righe.join(' || '))
  for (const r of righe) if (/≥3/.test(r)) R.problema('MEDIA', `sito a più di 3 tocchi: ${r}`, {})
  await ctx.close()
}
// 9. Manuel ovunque, Mario mai (bundle del gioco e DOM)
{
  const js = readdirSync('dist/assets').filter((f) => /^rigori-.*\.js$/.test(f)).map((f) => readFileSync('dist/assets/' + f, 'utf8')).join('\n')
  const mario = (js.match(/\bMario\b/g) || []).length, manuel = (js.match(/Manuel/g) || []).length
  R.numero('bundle del gioco', `"Manuel" ${manuel} volte · "Mario" ${mario} volte`)
  if (mario) R.problema('BASSA', `"Mario" compare ${mario} volte nel bundle del gioco`, { dove: 'src/rigori/game/progress.js (migrazione delle classifiche vecchie: "Mario" → "Manuel")', nota: 'è il codice che lo rinomina, non un testo mostrato' })
}
await b.close(); R.salva()
