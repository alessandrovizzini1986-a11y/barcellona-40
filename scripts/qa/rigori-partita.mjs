// QA partita completa: Shootout di 5 rigori + sudden death, con il registro di ogni tiro
// (chi tira, chi para, esito, velocità iniziale, tempo di volo, distanza guanto-palla, gonfiore della rete, sfottò).
//   node scripts/qa/rigori-partita.mjs [url]
// I tiri dell'utente li decide il test (precisione 0 e zona del portiere forzata) così la serie arriva in parità
// al quinto rigore e si vede il sudden death; i tiri di Ale restano quelli della CPU, con la sua mira e il suo scarto.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1&q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
await p.evaluate(() => window.__rigori.kitReady)

const COL = [-2.55, 0, 2.55]                               // centri delle tre colonne di zona
const stato = () => p.evaluate(() => {
  const R = window.__rigori, m = R.mode()
  return { role: R.role(), shot: R.shotState(), locked: R.esitoLocked, replay: !!R.game.juice.replaying, mode: m && { round: m.round, me: m.me, ale: m.ale, sudden: m.suddenDeath, finished: m.finished } }
})
const attendi = async (f, ms, che) => { const t0 = Date.now(); for (;;) { const s = await stato(); if (f(s)) return s; if (Date.now() - t0 > ms) throw new Error('attesa scaduta: ' + che); await p.waitForTimeout(120) } }

async function partita(tentativo) {
  const reg = []
  await p.evaluate(() => { const R = window.__rigori; R.game.holdShot = false; R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0; R.setShooter('monne'); R.startMode('shootout') })
  for (let n = 0; n < 40; n++) {
    let s = await stato()
    if (!s.mode || s.mode.finished) break
    if (s.role === 'idle') { await p.waitForTimeout(150); n--; continue }
    const round = s.mode.round, sudden = s.mode.sudden, ruolo = s.role
    await p.evaluate(() => { window.__rigori.events.length = 0; window.__rigori.reteRiposo() }) // la misura della rete riparte da zero a ogni tiro
    if (ruolo === 'shooter') {
      // in vantaggio ci si fa parare, altrimenti si segna: così la serie arriva in parità al quinto rigore
      const segna = s.mode.me <= s.mode.ale
      const col = n % 3, riga = n % 2
      const zona = segna ? riga * 3 + (col + 2) % 3 : riga * 3 + col
      await p.evaluate(({ aim, zona, seme }) => { const R = window.__rigori; R.setPrecision(0); R.ctx.forceKeeperZone(zona); R.fire(aim, true, 0, seme) },
        { aim: { x: COL[col], y: riga === 0 ? 1.8 : 0.6, power: 0.55 + (n % 4) * 0.12, curve: (n % 3 - 1) * 0.35 }, zona, seme: 5100 + tentativo * 100 + n })
    } else {
      // da portiere ci si tuffa alla rincorsa, alla cieca, come farebbe una persona
      await attendi((x) => x.shot === 'windup' || x.shot === 'flying', 40000, 'tiro di Ale')
      await p.evaluate((z) => window.__rigori.playerDive(z), (n % 2) * 3 + (n % 3))
    }
    const dati = await p.waitForFunction(() => {
      const R = window.__rigori
      if (!R.events.some((e) => e.type === 'result')) return null
      const rec = R.record()
      return { outcome: rec.outcome, v0: +rec.velocita.toFixed(1), volo: +rec.contactTime.toFixed(3), vImpatto: +rec.vImpatto.toFixed(1),
        shooterId: rec.ruoli.tiratore.id, keeperId: rec.ruoli.portiere.id, guanto: rec.outcome === 'save' ? R.distanzaGuanto() : null,
        sfotto: document.querySelector('.rg-esito span')?.textContent || '' }
    }, null, { timeout: 60000, polling: 100 }).then((h) => h.jsonValue())
    // la rete si gonfia quando la palla la raggiunge, cioè dopo l'esito (e al rallentatore dura di più)
    let rete = null
    if (dati.outcome === 'goal') rete = await p.waitForFunction(() => { const a = window.__rigori.reteAmpiezza(); return a > 0 ? +a.toFixed(3) : null }, null, { timeout: 20000, polling: 100 }).then((h) => h.jsonValue())
    const dopo = await stato()
    const riga = { n: reg.length + 1, round, sudden, turno: ruolo === 'shooter' ? 'tu' : 'ale', ...dati, rete, punteggio: `${dopo.mode?.me ?? 0}-${dopo.mode?.ale ?? 0}` }
    reg.push(riga)
    console.log(`| ${riga.n} | ${sudden ? 'SD' : round} | ${riga.shooterId} | ${riga.keeperId} | ${riga.outcome} | ${riga.v0} | ${riga.volo} | ${riga.vImpatto} | ${riga.guanto ?? '—'} | ${riga.rete ?? '—'} | ${riga.punteggio} | ${riga.sfotto} |`)
    await attendi((x) => !x.mode || x.mode.finished || (!x.locked && !x.replay && x.shot === 'idle'), 90000, 'fine replay')
  }
  const fine = await p.evaluate(() => window.__rigori.events.find((e) => e.type === 'modeEnd')?.summary || null)
  return { reg, fine }
}

let out = null
for (let t = 0; t < 3 && !out?.fine?.suddenDeath; t++) {
  if (t) console.log(`\n--- i tiri della CPU non hanno portato la serie in parità: si rigioca (tentativo ${t + 1})`)
  console.log('\n| # | Round | Tira | Para | Esito | v0 m/s | Volo s | v impatto | Guanto m | Rete m | Punteggio | Sfottò |')
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|')
  out = await partita(t)
}
const { reg, fine } = out
console.log(`\nFinale: Tu ${fine?.me} – ${fine?.ale} Ale · vince ${fine?.winner === 'me' ? 'il giocatore' : 'Ale'} · round ${fine?.rounds} · sudden death ${fine?.suddenDeath}`)
// controlli sul registro
const guai = []
for (const x of reg) {
  const atteso = x.turno === 'tu' ? { t: 'monne', p: 'ale' } : { t: 'ale', p: 'monne' }
  if (x.shooterId !== atteso.t || x.keeperId !== atteso.p) guai.push(`tiro ${x.n}: ruoli ${x.shooterId}/${x.keeperId}, attesi ${atteso.t}/${atteso.p}`)
  if (!(x.v0 >= 15 && x.v0 <= 30)) guai.push(`tiro ${x.n}: v0 ${x.v0} fuori da 15–30 m/s`)
  if (!(x.volo >= 0.4 && x.volo <= 0.75)) guai.push(`tiro ${x.n}: volo ${x.volo} s fuori da 0,40–0,75 s`)
  if (x.outcome === 'save' && !(x.guanto != null && x.guanto <= 0.15)) guai.push(`tiro ${x.n}: guanto a ${x.guanto} m dalla palla`)
  if (x.outcome === 'goal' && !(x.rete >= 0.15 && x.rete <= 0.45)) guai.push(`tiro ${x.n}: gonfiore rete ${x.rete} m fuori scala`)
  if (!x.sfotto) guai.push(`tiro ${x.n}: sfottò mancante`)
}
if (reg.length < 10) guai.push('la serie non è arrivata ai 5 rigori per parte: ' + reg.length + ' tiri')
if (!fine?.suddenDeath) guai.push('la partita non è arrivata al sudden death in tre tentativi')
await b.close()
if (errors.length) console.error('ERRORI DI PAGINA:\n' + errors.join('\n'))
if (guai.length || errors.length) { console.error('GUAI:\n' + guai.join('\n')); process.exit(1) }
console.log('OK partita completa')
