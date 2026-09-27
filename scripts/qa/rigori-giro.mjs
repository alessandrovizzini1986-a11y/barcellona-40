// GIRO COMPLETO prima del congelamento: i quattro profili del sito, una partita per modalità ciascuno, con
// l'URL di sabato sera (?now=, letto dal sito; il gioco non ha logica di data). Si gioca come una persona:
// tocchi veri sui menu, tiri e tuffi dalla API QA. Si riportano solo le cose che non tornano.
//   node scripts/qa/rigori-giro.mjs [url]   (url senza query: la aggiunge lui)
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173/rigori/'
const url = base + '?now=2026-10-17T21:30&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const guai = [], partite = []
const nota = (m) => { console.log('  ✗ ' + m); guai.push(m) }
const PROFILI = ['ale', 'monne', 'giulio', 'manuel'], MODI = ['passAndPlay', 'shootout', 'sfidaAle', 'skill', 'boss']
const flow = (p, f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 90000 })
const stato = (p) => p.evaluate(() => ({ flow: window.__rigori.flow(), role: window.__rigori.role(), shot: window.__rigori.shotState(), lock: window.__rigori.esitoLocked, hud: document.querySelector('.rg-modehud')?.textContent || '', pick: !!document.querySelector('.rg-zone'), hand: !!document.querySelector('[data-ok]'), overlays: document.querySelectorAll('.rg-overlay').length, kick: window.__rigori.events.some((e) => e.type === 'kick') }))
// gioca una partita fino al risultato; tiri a caso fra le zone, tuffi a caso; in Sfida Ale metà tiri "farsi parare"
async function partita(p, modo, profilo) {
  const t0 = Date.now(); let tiri = 0, tuffi = 0, ultimoHud = '', fermo = 0, huds = new Set()
  while (Date.now() - t0 < 420000) {
    const s = await stato(p)
    if (s.flow === 'risultato') break
    if (s.flow !== 'gioco') { nota(`${profilo}/${modo}: uscito dal gioco senza risultato (flow ${s.flow})`); return null }
    if (s.overlays > 1) nota(`${profilo}/${modo}: ${s.overlays} overlay sovrapposti (HUD "${s.hud}")`)
    if (s.hud && !huds.has(s.hud)) huds.add(s.hud)
    if (s.pick) { await p.click('.rg-zone'); await p.waitForTimeout(250); continue }
    if (s.hand) { await p.click('[data-ok]'); await p.waitForTimeout(250); continue }
    if (s.lock) { fermo = 0; await p.waitForTimeout(600); continue }
    if (s.role === 'shooter' && s.shot === 'idle') {
      const paro = modo === 'sfidaAle' && tiri % 2 === 1
      await p.evaluate(({ paro, i }) => { const R = window.__rigori; R.events.length = 0; R.setPrecision(0); R.ctx.forceKeeperZone(paro ? 5 : null); R.fire(paro ? { x: 1.4, y: 0.4, power: 0.5, curve: 0 } : { x: [-1.85, 0, 1.85][i % 3], y: i % 2 ? 1.5 : 0.45, power: 0.85 + (i % 3) * 0.05, curve: 0 }, true, 0.5) }, { paro, i: tiri })
      tiri++; fermo = 0; await p.waitForTimeout(800); continue
    }
    if (s.role === 'keeper') {
      if (s.kick) { await p.evaluate((z) => window.__rigori.playerDive(z), tuffi % 6); tuffi++; fermo = 0; await p.waitForTimeout(800); continue }
      await p.waitForTimeout(300); fermo += 300
      if (fermo > 15000) { nota(`${profilo}/${modo}: da portiere, nessun calcio di Ale per 15 s (HUD "${s.hud}")`); return null }
      continue
    }
    await p.waitForTimeout(300); fermo += 300
    if (s.hud !== ultimoHud) { ultimoHud = s.hud; fermo = 0 }
    if (fermo > 20000) { nota(`${profilo}/${modo}: bloccato 20 s (ruolo ${s.role}, tiro ${s.shot}, HUD "${s.hud}")`); return null }
  }
  if ((await stato(p)).flow !== 'risultato') { nota(`${profilo}/${modo}: nessun risultato entro 7 minuti (${tiri} tiri)`); return null }
  await p.waitForTimeout(400)
  const r = await p.evaluate(() => { const pan = document.querySelector('.rg-panel'); return { titolo: pan?.querySelector('.rg-title')?.textContent, testo: pan?.innerText.replace(/\s+/g, ' ').trim(), xp: pan?.querySelector('.rg-xp')?.innerText.replace(/\s+/g, ' ').trim(), giallo: pan?.querySelectorAll('.rg-btn--giallo').length, classifica: !!pan?.querySelector('[data-value="classifica"]'), video: !!pan?.querySelector('[data-share-video]'), totale: window.__rigori.game.progress.xp(), overlays: document.querySelectorAll('.rg-overlay').length } })
  if (!r.titolo) nota(`${profilo}/${modo}: risultato senza titolo`)
  if (r.giallo !== 1) nota(`${profilo}/${modo}: nel risultato ${r.giallo} pulsanti gialli (ne serve 1)`)
  if (!/\+\d+ XP/.test(r.xp || '')) nota(`${profilo}/${modo}: riga XP del risultato strana: "${r.xp}"`)
  if (r.overlays !== 1) nota(`${profilo}/${modo}: ${r.overlays} overlay al risultato`)
  if (modo === 'sfidaAle' && !/gol prima delle tre parate/.test(r.titolo || '')) nota(`${profilo}/${modo}: titolo Sfida Ale "${r.titolo}"`)
  if (modo === 'sfidaAle' && /rivincita/.test(r.testo)) nota(`${profilo}/${modo}: "rivincita" in Sfida Ale`)
  if ((modo === 'shootout' || modo === 'boss') && !/(Hai vinto|Ale vince) \d+–\d+/.test(r.titolo || '')) nota(`${profilo}/${modo}: titolo "${r.titolo}"`)
  if (modo === 'skill' && !/punti/.test(r.titolo || '')) nota(`${profilo}/${modo}: titolo Skill "${r.titolo}"`)
  if (modo === 'passAndPlay' && !/^Vince /.test(r.titolo || '')) nota(`${profilo}/${modo}: titolo pass-and-play "${r.titolo}"`)
  partite.push({ profilo, modo, tiri, tuffi, s: Math.round((Date.now() - t0) / 1000), titolo: r.titolo, xp: r.xp, huds: huds.size })
  console.log(`  ${modo}: "${r.titolo}" · ${r.xp} · ${tiri} tiri, ${tuffi} tuffi, ${Math.round((Date.now() - t0) / 1000)} s`)
  return r
}
for (const profilo of PROFILI) {
  console.log(`\n== profilo ${profilo}`)
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errori = []
  p.on('pageerror', (e) => errori.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()) })
  await p.addInitScript((profilo) => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:person', JSON.stringify(profilo)); localStorage.setItem('b40:v1:rigori:xp', '150') } catch {} }, profilo)
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
  await flow(p, 'chiTira')
  const chi = await p.evaluate(() => ({ tu: [...document.querySelectorAll('.rg-card--tu')].map((c) => c.dataset.value).join(), primario: document.querySelector('[data-tira-io]')?.textContent.trim() || null, volti: document.querySelectorAll('.rg-card').length }))
  const tiratore = profilo === 'ale' ? 'manuel' : profilo
  if (profilo === 'ale' ? (chi.tu !== '' || chi.primario) : (chi.tu !== profilo || !chi.primario)) nota(`${profilo}: Chi tira? mostra ${JSON.stringify(chi)}`)
  for (const modo of MODI) {
    const s = await stato(p)
    if (s.flow !== 'chiTira') { nota(`${profilo}/${modo}: non parte da Chi tira? (flow ${s.flow})`); break }
    await p.click(profilo === 'ale' ? '.rg-card[data-value="manuel"]' : '[data-tira-io]'); await flow(p, 'modalita')
    const tira = (await p.locator('[data-tira]').innerText()).replace(/\s+/g, ' ').trim()
    const atteso = { ale: 'Manuel', monne: 'Monne', giulio: 'Giulio', manuel: 'Manuel' }[profilo]
    if (tira !== `Tira ${atteso} · Cambia`) nota(`${profilo}/${modo}: Modalità dice "${tira}"`)
    const bloccato = await p.evaluate((m) => document.querySelector(`.rg-mode[data-value="${m}"]`)?.disabled, modo)
    if (bloccato) { nota(`${profilo}/${modo}: modalità bloccata con 150 XP`); await p.click('[data-tira] [data-value="__chi"]'); await flow(p, 'chiTira'); continue }
    await p.click(`.rg-mode[data-value="${modo}"]`)
    if (modo === 'passAndPlay') { await p.waitForSelector('[data-go]'); await p.click('[data-name="Giulio"]'); await p.click('[data-go]') }
    await flow(p, 'gioco'); await p.waitForTimeout(500)
    await partita(p, modo, profilo)
    const s2 = await stato(p)
    if (s2.flow === 'risultato') { await p.click('[data-value="menu"]'); await flow(p, 'chiTira') }
    else { await p.click('.rg-menubtn').catch(() => {}); await p.waitForSelector('[data-value="esci"]', { timeout: 5000 }).catch(() => {}); await p.click('[data-value="esci"]').catch(() => {}); await flow(p, 'chiTira').catch(() => nota(`${profilo}/${modo}: non si torna a Chi tira?`)) }
    if (errori.length) { for (const e of errori.splice(0)) nota(`${profilo}/${modo}: ${e}`) }
  }
  const riga = await p.evaluate((id) => document.querySelector(`.rg-card[data-value="${id}"] .rg-card__stat`)?.textContent, tiratore)
  console.log(`  riga sotto ${tiratore}: "${riga}"`)
  if (!/\d+ XP · \d+ vittori/.test(riga || '')) nota(`${profilo}: dopo cinque partite la riga sotto ${tiratore} dice "${riga}"`)
  await ctx.close()
}
await b.close()
console.log('\nPartite giocate:', partite.length, '/', PROFILI.length * MODI.length)
if (guai.length) { console.error('\nNON TORNA:\n' + guai.join('\n')); process.exit(1) } console.log('OK giro: niente da segnalare')
