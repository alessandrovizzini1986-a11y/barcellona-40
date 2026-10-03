// QA di regressione sugli INCROCI fra i cambi della settimana: due modifiche che da sole funzionano e insieme no.
//   1. replay unico (B2) × video a richiesta: stessa finestra, suoni rifatti una volta, tempo fermo, UI bloccata
//   2. "Chi tira?" senza card × pass-and-play: "Tira X · Cambia" e il passaggio del telefono arrivano dove devono
//   3. XP per giocatore × XP totale (B7) × Boss (B1): la riga sotto il volto e il risultato non si contraddicono
//   4. musica OFF (B2) × altoparlante HUD × Opzioni: un flag, tre posti, sempre allineati
//   6. distribuzione Boss 25/25/50 × Sfida Ale × Skill: dopo un Boss le altre modalità tornano al portiere normale
//   7. rinomina Manuel (B4) × classifiche salvate con "Mario": una riga sola
//   8. tap ovunque per saltare (B2) × Condividi nell'esito (B7): il tap su Condividi non salta il replay
//   node scripts/qa/rigori-incroci.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const errors = []
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
const apri = async (ls = {}) => {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await p.addInitScript((ls) => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, JSON.stringify(v)) } catch {} }, ls)
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
  await p.waitForFunction(() => window.__rigori.flow() === 'chiTira')
  return { p, ctx }
}
const flow = (p, f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 60000 })
const tiro = async (p, aim, zonaForzata = null) => {
  await p.evaluate(({ aim, z }) => { const R = window.__rigori; R.events.length = 0; R.ctx.forceKeeperZone(z); R.setPrecision(0); R.fire(aim, true, 0.5) }, { aim, z: zonaForzata })
  await p.waitForFunction(() => window.__rigori.lastResult() != null, null, { timeout: 90000 })
  return p.evaluate(() => window.__rigori.lastResult())
}
const strumenta = (p) => p.evaluate(() => { const A = window.__rigori.audio; window.__suoni = []; for (const m of ['play', 'whistle', 'crowd', 'sting']) { const f = A[m]; A[m] = (...a) => { window.__suoni.push(m + ':' + String(a[0] ?? '')); return f(...a) } } })

// ---- 1. replay unico × video a richiesta ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne' })
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(800)
  await strumenta(p)
  const esito = await tiro(p, { x: 1.85, y: 1.5, power: 1.0, curve: 0 })
  await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd'), null, { timeout: 90000 }); await p.waitForTimeout(600)
  const visto = await p.evaluate(() => ({ r: window.__rigori.ultimoReplay, suoni: window.__suoni.slice() }))
  await p.evaluate(() => { window.__suoni.length = 0; window.__t = [] })
  const video = await p.evaluate(async () => {
    const R = window.__rigori; const panel = document.createElement('div'); panel.className = 'rg-panel'; panel.innerHTML = '<button class="rg-btn">x</button>'; R.game.ui.appendChild(panel)
    const during = []
    const iv = setInterval(() => during.push({ frame: R.frames, ts: R.game.timeScale, blocco: R.game.ui.classList.contains('rg-registrando'), pe: getComputedStyle(panel.querySelector('.rg-btn')).pointerEvents, kick: R.kicker()?.phase, replaying: R.game.juice.replaying }), 150)
    const f = await R.registraVideo(); clearInterval(iv); panel.remove()
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) // il tempo riparte al frame dopo la fine del replay
    return { file: !!f, size: f?.size || 0, during, dopo: { ts: R.game.timeScale, blocco: R.game.ui.classList.contains('rg-registrando'), kick: R.kicker()?.phase, replaying: R.game.juice.replaying }, suoni: window.__suoni.slice(), r: R.ultimoReplay }
  })
  // timeScale va a 0 al primo frame del replay, non nell'istante in cui parte: un campione preso fra i due
  // (succede con SwiftShader, dove un frame può durare più di 150 ms) non dice niente sul blocco del tempo
  const primoFrame = video.during.find((d) => d.replaying)?.frame
  const inReplay = video.during.filter((d) => d.replaying && d.frame > primoFrame)
  console.log(`  esito ${esito} · replay visto ${JSON.stringify(visto.r)} · campioni durante la registrazione ${video.during.length}, in replay ${inReplay.length}`)
  ok('1. il video usa la stessa finestra e velocità del replay visto', video.r.from === visto.r.from && video.r.to === visto.r.to && video.r.speed === visto.r.speed)
  ok('1. durante la registrazione il tempo di gioco è fermo (timeScale 0) e i pulsanti non rispondono', inReplay.length > 0 && inReplay.every((d) => d.ts === 0 && d.blocco && d.pe === 'none'), JSON.stringify(inReplay[0] || null))
  ok('1. il tiratore è nella posa del calcio durante il video, poi torna a riposo', inReplay.every((d) => d.kick === 'kick') && video.dopo.kick !== 'kick' && !video.dopo.blocco && video.dopo.ts === 1, JSON.stringify(video.dopo))
  const conta = (arr, k) => arr.filter((x) => x === k).length
  ok('1. nel video ogni suono del tiro suona una volta: fischio, calcio, rete, boato', conta(video.suoni, 'whistle:') === 1 && video.suoni.filter((x) => /^play:kick/.test(x)).length === 1 && conta(video.suoni, 'play:net') === 1 && conta(video.suoni, 'crowd:roar') === 1, video.suoni.join(' '))
  ok('1. nel replay visto il tuffo ha suonato una volta sola', conta(visto.suoni, 'play:dive') === 1, conta(visto.suoni, 'play:dive') + ' volte')
  ok('1. il file video viene prodotto', video.file && video.size > 10000, String(video.size))
  await ctx.close()
}
// ---- 2. Chi tira? senza card × pass-and-play ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne' })
  await p.click('[data-tira-io]'); await flow(p, 'modalita')
  ok('2. Modalità: "Tira Monne · Cambia" dopo "Tira come Monne"', (await p.locator('[data-tira]').innerText()).replace(/\s+/g, ' ').trim() === 'Tira Monne · Cambia')
  await p.click('[data-tira] [data-value="__chi"]'); await flow(p, 'chiTira'); await p.click('.rg-card[data-value="giulio"]'); await flow(p, 'modalita')
  ok('2. Cambia → Chi tira? → Giulio: "Tira Giulio · Cambia"', (await p.locator('[data-tira]').innerText()).replace(/\s+/g, ' ').trim() === 'Tira Giulio · Cambia')
  await p.click('.rg-mode[data-value="passAndPlay"]'); await p.waitForSelector('[data-go]')
  ok('2. Pass-and-play apre "Chi gioca?" con Ale e Monne già scelti', (await p.evaluate(() => [...document.querySelectorAll('.rg-name--on')].map((e) => e.textContent).join(','))) === 'Ale,Monne')
  await p.click('[data-name="Giulio"]'); await p.click('[data-go]'); await flow(p, 'gioco')
  // prima il portiere (Monne) sceglie la zona di nascosto, poi il telefono passa al tiratore (Ale)
  await p.waitForSelector('.rg-zone', { timeout: 20000 })
  const pick = await p.evaluate(() => ({ hud: document.querySelector('.rg-modehud')?.textContent, menu: !document.querySelector('.rg-menubtn').hidden, musica: !document.querySelector('.rg-musicbtn').hidden }))
  ok('2. prima scelta della zona con HUD "Giro 1/3", ≡ e altoparlante visibili', /Giro 1\/3/.test(pick.hud || '') && pick.menu && pick.musica, JSON.stringify(pick))
  const sotto = await p.evaluate(() => { const b = document.querySelector('.rg-musicbtn'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === b || b.contains(e) ? 'musica' : (e?.className || e?.tagName) })
  ok('2. l\'altoparlante resta sopra l\'overlay della scelta della zona, come il ≡', sotto === 'musica', String(sotto))
  await p.click('.rg-zone'); await p.waitForSelector('[data-ok]', { timeout: 20000 })
  const hand = await p.evaluate(() => document.querySelector('.rg-panel h2')?.textContent)
  ok('2. poi il passaggio del telefono ad Ale, il primo tiratore', hand === 'Passa il telefono a Ale', String(hand))
  await p.click('[data-ok]'); await p.waitForTimeout(500)
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]'); await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  ok('2. uscendo dal pass-and-play il bordo "Sei tu" è ancora su Monne', await p.evaluate(() => [...document.querySelectorAll('.rg-card--tu')].map((c) => c.dataset.value).join()) === 'monne')
  await ctx.close()
}
// ---- 3. XP per giocatore × XP totale × Boss ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne', 'b40:v1:rigori:xp': 150, 'b40:v1:rigori:giocatori': { monne: { xp: 40, partite: 1, vittorie: 0 } } })
  const riga0 = await p.evaluate(() => document.querySelector('.rg-card[data-value="monne"] .rg-card__stat').textContent)
  ok('3. la riga sotto il volto non dichiara un livello: "40 XP · 0 vittorie"', riga0 === '40 XP · 0 vittorie', riga0)
  await p.click('[data-tira-io]'); await flow(p, 'modalita')
  ok('3. Boss sbloccato sul totale del telefono (150 XP), non sui 40 XP di Monne', await p.evaluate(() => !document.querySelector('.rg-mode[data-value="boss"]').disabled))
  await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(800)
  for (let i = 0; i < 3; i++) { await tiro(p, { x: 1.4, y: 0.4, power: 0.5, curve: 0 }, 5); await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd') || window.__rigori.flow() === 'risultato', null, { timeout: 90000 }); await p.waitForTimeout(400) }
  await flow(p, 'risultato'); await p.waitForTimeout(300)
  const ris = await p.evaluate(() => ({ testo: document.querySelector('.rg-xp')?.innerText.replace(/\s+/g, ' ').trim(), totale: window.__rigori.game.progress.xp(), monne: window.__rigori.game.progress.giocatore('monne') }))
  console.log('  risultato →', ris.testo, '· totale', ris.totale, '· monne', JSON.stringify(ris.monne))
  ok('3. il risultato mostra gli XP del telefono (150 + 15 di partecipazione)', ris.totale === 165 && (ris.testo || '').includes('165 XP'), ris.testo)
  ok('3. Monne ha 40 + 15 XP per sé e una partita in più', ris.monne?.xp === 55 && ris.monne?.partite === 2)
  await p.click('[data-value="menu"]'); await flow(p, 'chiTira')
  ok('3. la riga sotto il volto dice "55 XP · 0 vittorie"', await p.evaluate(() => document.querySelector('.rg-card[data-value="monne"] .rg-card__stat').textContent) === '55 XP · 0 vittorie')
  await ctx.close()
}
// ---- 4. musica OFF × altoparlante × Opzioni ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne' })
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(500)
  const st = async () => p.evaluate(() => ({ flag: window.__rigori.settings.music, btn: document.querySelector('.rg-musicbtn').getAttribute('aria-pressed'), musica: window.__rigori.audio.musicName, salvato: JSON.parse(localStorage.getItem('b40:v1:rigori:settings') || '{}').music }))
  ok('4. in partita: flag OFF, altoparlante spento, nessuna musica', JSON.stringify(await st()) === JSON.stringify({ flag: false, btn: 'false', musica: null, salvato: false }) || (await st()).flag === false && (await st()).btn === 'false' && (await st()).musica === null, JSON.stringify(await st()))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="opzioni"]'); await p.click('[data-value="opzioni"]'); await p.waitForSelector('[data-key="music"]')
  ok('4. la casella Musica in Opzioni è spenta', !(await p.isChecked('[data-key="music"]')))
  await p.click('[data-key="music"]'); await p.waitForTimeout(200); await p.click('[data-ok]'); await flow(p, 'gioco'); await p.waitForFunction(() => window.__rigori.audio.musicName === 'tensione', null, { timeout: 30000 }).catch(() => {})
  const a = await st(); ok('4. accesa da Opzioni: l\'altoparlante nell\'HUD si aggiorna e parte "tensione"', a.flag === true && a.btn === 'true' && a.musica === 'tensione' && a.salvato === true, JSON.stringify(a))
  await p.click('.rg-musicbtn'); await p.waitForTimeout(300)
  const c = await st(); ok('4. spenta dall\'altoparlante: flag OFF, musica ferma, salvato', c.flag === false && c.btn === 'false' && c.musica === null && c.salvato === false, JSON.stringify(c))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="opzioni"]'); await p.click('[data-value="opzioni"]'); await p.waitForSelector('[data-key="music"]')
  ok('4. Opzioni rilegge il flag spento dall\'altoparlante', !(await p.isChecked('[data-key="music"]')))
  await p.click('[data-ok]')
  await ctx.close()
}
// ---- 6. distribuzione Boss × le altre modalità ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne', 'b40:v1:rigori:xp': 150 })
  const diff = () => p.evaluate(() => ({ portiere: window.__rigori.keeper().difficulty, mira: window.__rigori.keeper().difficulty === 'boss' ? window.__rigori.MIRE.boss : window.__rigori.MIRE.normale }))
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="boss"]'); await flow(p, 'gioco'); await p.waitForTimeout(500)
  const inBoss = await diff(); ok('6. in Boss il portiere è "boss" e la mira è 25/25', inBoss.portiere === 'boss' && inBoss.mira.join() === '0.25,0.25', JSON.stringify(inBoss))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]'); await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  for (const [modo, atteso] of [['sfidaAle', 'normale'], ['skill', 'facile'], ['shootout', 'normale']]) {
    await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click(`.rg-mode[data-value="${modo}"]`); await flow(p, 'gioco'); await p.waitForTimeout(500)
    const d = await diff(); ok(`6. dopo il Boss, ${modo} riparte col portiere "${atteso}" e la mira 40/35`, d.portiere === atteso && d.mira.join() === '0.4,0.35', JSON.stringify(d))
    await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]'); await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  }
  await ctx.close()
}
// ---- 7. Manuel × classifiche salvate con "Mario" ----
{
  const oggi = '2026-09-20'
  const { p, ctx } = await apri({ 'b40:v1:rigori:board:shootout': [{ name: 'Mario', score: 130, label: 'Vinto 3–0', date: oggi }, { name: 'Monne', score: 120, label: 'Vinto 2–0', date: oggi }], 'b40:v1:rigori:board:passAndPlay': [{ name: 'Mario', score: 4, label: '3 gol · 1 parate', date: oggi }, { name: 'Manuel', score: 2, label: '2 gol · 0 parate', date: oggi }] })
  await p.click('[data-value="__classifica"]'); await p.waitForSelector('.rg-classifica, .rg-record')
  const cl = await p.evaluate(() => ({ testo: document.querySelector('.rg-panel').innerText, ls: [localStorage.getItem('b40:v1:rigori:board:shootout'), localStorage.getItem('b40:v1:rigori:board:passAndPlay')].join(' ') }))
  ok('7. in classifica non c\'è più "Mario", c\'è Manuel', !/Mario/.test(cl.testo) && /Manuel/.test(cl.testo), cl.testo.replace(/\n+/g, ' | ').slice(0, 160))
  ok('7. le righe salvate sono state rinominate in localStorage', !/Mario/.test(cl.ls))
  ok('7. il record Shootout è di Manuel', /Shootout\s*Manuel · Vinto 3–0/.test(cl.testo.replace(/\n+/g, ' ')))
  await ctx.close()
}
// ---- 8. tap ovunque per saltare × Condividi nell'esito ----
{
  const { p, ctx } = await apri({ 'b40:v1:person': 'monne' })
  await p.click('[data-tira-io]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="sfidaAle"]'); await flow(p, 'gioco'); await p.waitForTimeout(800)
  await p.evaluate(() => { window.__condivisioni = 0; const orig = navigator.share; navigator.share = async () => { window.__condivisioni++ }; navigator.canShare = () => true; window.__origShare = orig })
  await tiro(p, { x: 1.85, y: 1.5, power: 1.0, curve: 0 })
  await p.waitForSelector('.rg-esito-share', { timeout: 20000 }); await p.waitForTimeout(400) // oltre i 150 ms del ritardo di salto
  const prima = await p.evaluate(() => ({ lock: window.__rigori.esitoLocked, replay: window.__rigori.events.some((e) => e.type === 'replayEnd') }))
  await p.click('.rg-esito-share'); await p.waitForFunction(() => window.__condivisioni === 1, null, { timeout: 20000 }).catch(() => {}) // la cattura dell'immagine su SwiftShader impiega secondi
  const dopo = await p.evaluate(() => ({ lock: window.__rigori.esitoLocked, replayEnd: window.__rigori.events.some((e) => e.type === 'replayEnd'), condivisioni: window.__condivisioni }))
  ok('8. il tap su Condividi NON salta esito e replay', prima.lock && dopo.lock && !dopo.replayEnd, JSON.stringify({ prima, dopo }))
  ok('8. e condivide davvero (navigator.share chiamato una volta)', dopo.condivisioni === 1, String(dopo.condivisioni))
  await p.click('.rg-modehud', { force: true }); await p.waitForTimeout(400)
  ok('8. un tap altrove salta subito', await p.evaluate(() => !window.__rigori.esitoLocked && window.__rigori.events.some((e) => e.type === 'replayEnd')))
  await ctx.close()
}
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK incroci')
