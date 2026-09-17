// Test del tiro: l'esito è calcolato una volta sola alla creazione del record e nessuna passata di disegno
// (live, replay 1, replay 2, passo 1/60 o 1/240) lo può cambiare; il cartello mostra sempre l'esito del record;
// il turno non avanza durante la sequenza esito + replay.
//
//   node --test tests/shot.test.js
//
// I primi due test girano su Node puro (solo la matematica del record). Gli ultimi due avviano Vite e Chromium.
import test, { after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { buildShotRecord, renderShotAt, velocitaDa, FISICA } from '../src/rigori/game/shot.js'
import { createKeeper, zoneCenter } from '../src/rigori/game/keeper.js'

// --- finti oggetti di scena: al record servono solo le ossa della matematica, non la grafica ---
const stubChar = () => ({
  group: new THREE.Group(), model: new THREE.Object3D(), mixer: { update() {} }, big: { mani: {} },
  play() {}, scrub() {}, stopAll() {}, setLean() {}, update() {}, get currentAction() { return null }
})
const stubBall = () => { const mesh = new THREE.Object3D(); return { mesh, update() {} } }
const makeKeeper = (zone) => { const k = createKeeper(stubChar(), { difficulty: 'normale' }); k.force(zone); return k }

describe('esito calcolato una volta sola', () => {
  test("nessun passo di disegno cambia l'esito (1/60 e 1/240 danno lo stesso)", () => {
    // tiro in basso a sinistra con il portiere forzato nella stessa zona: parata
    const keeper = makeKeeper(3)
    const c = zoneCenter(3)
    const rec = buildShotRecord({ aim: { x: c.x, y: c.y, power: 0.7, curve: 0 }, precision: 0, keeper, seed: 4242 })
    assert.equal(rec.outcome, 'save', 'il tiro nella zona del tuffo deve essere una parata')
    assert.equal(rec.sealed, true, 'il record è chiuso già alla creazione')
    const esiti = new Set()
    for (const passo of [1 / 60, 1 / 240]) {
      const ball = stubBall()
      for (let t = 0; t <= rec.contactTime + 1e-9; t += passo) { renderShotAt(rec, t, { ball, keeper, live: false }); esiti.add(rec.outcome) }
      renderShotAt(rec, rec.contactTime, { ball, keeper, live: false })
      esiti.add(rec.outcome)
      // All'istante dell'impatto la palla è sul punto di contatto, qualunque sia il passo di disegno.
      // La tolleranza è 0,1 mm: il campionamento è allineato a contactTime, resta solo l'errore di virgola mobile.
      const scarto = Math.hypot(ball.mesh.position.x - rec.contact.x, ball.mesh.position.y - rec.contact.y, ball.mesh.position.z - rec.contact.z)
      assert.ok(scarto < 1e-4, `a passo ${passo} la palla è a ${scarto.toExponential(2)} m dal punto d'impatto`)
    }
    assert.deepEqual([...esiti], ['save'], "l'esito non cambia mai durante il disegno")
  })

  test('50 semi diversi: esito stabile a qualunque passo e su più passate', () => {
    for (let i = 0; i < 50; i++) {
      const keeper = makeKeeper(i % 6)
      const rec = buildShotRecord({ aim: { x: -3 + (i % 7), y: 0.4 + (i % 5) * 0.45, power: 0.5 + (i % 6) * 0.12, curve: 0 }, precision: 0.5, keeper, seed: 9000 + i })
      const atteso = rec.outcome
      assert.ok(['goal', 'save', 'post', 'crossbar', 'miss'].includes(atteso), 'esito valido: ' + atteso)
      for (const passo of [1 / 60, 1 / 240, 1 / 30]) {
        const ball = stubBall()
        for (let t = 0; t <= rec.duration; t += passo) renderShotAt(rec, t, { ball, keeper, live: false })
        assert.equal(rec.outcome, atteso, `seme ${9000 + i}: esito cambiato a passo ${passo}`)
      }
    }
  })
})

describe('nessuna decisione durante il disegno', () => {
  const sorgenti = []
  const scan = (dir) => { for (const n of readdirSync(dir)) { const f = path.join(dir, n); statSync(f).isDirectory() ? scan(f) : f.endsWith('.js') && sorgenti.push(f) } }
  scan('src/rigori')
  test('nessun test di collisione fra palla e portiere fuori dal record', () => {
    // Vietati ovunque: non deve esistere alcuna rilevazione geometrica a runtime.
    const vietati = /intersectsBox|intersectsSphere|intersectSphere|containsPoint|intersectObject/
    const colpevoli = sorgenti.filter((f) => vietati.test(readFileSync(f, 'utf8')))
    assert.deepEqual(colpevoli, [], 'collisioni a runtime trovate in: ' + colpevoli.join(', '))
    // Le misure di distanza sono ammesse solo dove NON decidono l'esito: pianificazione della posa e QA.
    const ammesse = ['guantoVicino', 'pianificaTuffo', 'guantoA', 'distanzaGuanto']
    for (const f of sorgenti) {
      const testo = readFileSync(f, 'utf8')
      for (const riga of testo.split('\n')) {
        if (!/\.distanceTo\(|distanceToSquared/.test(riga)) continue
        const dentro = ammesse.some((n) => testo.slice(0, testo.indexOf(riga)).lastIndexOf(n) > testo.slice(0, testo.indexOf(riga)).lastIndexOf('renderAt'))
        assert.ok(dentro, `misura di distanza fuori dalla pianificazione, in ${f}: ${riga.trim().slice(0, 80)}`)
      }
    }
  })
  test('il disegno non misura distanze né interseca nulla', () => {
    const shot = readFileSync('src/rigori/game/shot.js', 'utf8')
    const render = shot.slice(shot.indexOf('export function renderShotAt'), shot.indexOf('// ---------------------------------------------------------------- esecuzione'))
    const keeper = readFileSync('src/rigori/game/keeper.js', 'utf8')
    const renderAt = keeper.slice(keeper.indexOf('    renderAt(decision'), keeper.indexOf('    react(result)'))
    for (const [nome, corpo] of [['renderShotAt', render], ['keeper.renderAt', renderAt]]) {
      for (const vietato of ['distanceTo', 'intersect', 'Math.random', 'outcome =']) {
        assert.ok(!corpo.includes(vietato), `${nome} contiene ${vietato}`)
      }
    }
  })
  test('renderShotAt non decide e non estrae numeri casuali', () => {
    const src = readFileSync('src/rigori/game/shot.js', 'utf8')
    const corpo = src.slice(src.indexOf('export function renderShotAt'), src.indexOf('// ---------------------------------------------------------------- esecuzione'))
    for (const vietato of ['Math.random', 'evaluate(', 'decide(', 'outcome =']) assert.ok(!corpo.includes(vietato), `renderShotAt contiene ${vietato}`)
    // l'esito viene assegnato in un punto solo: dentro sealShotRecord (non nel disegno, non nel loop)
    const seal = src.slice(src.indexOf('export function sealShotRecord'), src.indexOf('function simulateFree'))
    const assegna = /rec\.outcome\s*=(?!=)/g
    const dentro = [...seal.matchAll(assegna)].length, totale = [...src.matchAll(assegna)].length
    assert.ok(dentro >= 4, 'sealShotRecord assegna l\'esito in tutti i rami (trovati ' + dentro + ')')
    assert.equal(dentro, totale, 'rec.outcome assegnato fuori da sealShotRecord: ' + (totale - dentro) + ' volte')
  })
  test('il portiere valuta la parata solo alla chiusura del record', () => {
    const src = readFileSync('src/rigori/game/shot.js', 'utf8')
    const chiamate = [...src.matchAll(/keeper\.evaluate\(/g)].length
    assert.equal(chiamate, 1, 'keeper.evaluate chiamato una volta sola (in sealShotRecord)')
    const seal = src.slice(src.indexOf('export function sealShotRecord'), src.indexOf('function simulateFree'))
    assert.ok(seal.includes('keeper.evaluate('), 'la chiamata è dentro sealShotRecord')
  })
})

// ----------------------------------------------------------------- integrazione (Vite + Chromium)
// Il browser si avvia solo quando serve: i test puri qui sopra devono poter girare senza.
const PORT = +(process.env.RIGORI_PORT || 5178)
let server = null, browser = null, page = null
const gioco = (fn, arg) => page.evaluate(fn, arg)
async function assicuraBrowser() {
  if (page) return page
  const vivo = await fetch(`http://localhost:${PORT}/rigori/`).then((r) => r.ok).catch(() => false)
  if (!vivo) {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
    const t0 = Date.now()
    while (Date.now() - t0 < 60000) {
      if (await fetch(`http://localhost:${PORT}/rigori/`).then((r) => r.ok).catch(() => false)) break
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  const { chromium } = await import('playwright-core')
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const ctx = await browser.newContext({ viewport: { width: 380, height: 820 } })
  page = await ctx.newPage()
  await page.goto(`http://localhost:${PORT}/rigori/?noflow=1&q=bassa`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
  await page.evaluate(() => window.__rigori.kitReady)
  return page
}
after(async () => { await browser?.close(); server?.kill('SIGTERM') })

describe('cartello e turno', () => {
  test('50 tiri: il cartello dice sempre l\'esito del record, dal vivo e nei due replay', async () => {
    await assicuraBrowser()
    if (process.env.RIGORI_TRACCIA) console.error('  preparazione')
    await gioco(() => { window.__rigori.game.holdShot = true; window.__rigori.setPrecision(0.4) })
    if (process.env.RIGORI_TRACCIA) console.error('  pronto')
    const PAROLA = { goal: 'GOL', save: 'PARATA', post: 'PALO', crossbar: 'TRAVERSA', miss: 'FUORI' }
    const diversi = []
    const N = +(process.env.RIGORI_TIRI || 50) // ridotto nei giri di verifica rapida
    for (let i = 0; i < N; i++) {
      const esito = await gioco(async (i) => {
        const R = window.__rigori
        R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0
        R.ctx.forceKeeperZone(i % 6)
        R.fire({ x: -3 + (i % 7), y: 0.4 + (i % 5) * 0.45, power: 0.5 + (i % 6) * 0.12, curve: 0 }, true, 0, 7000 + i)
        const carta = () => document.querySelector('.rg-esito b')?.textContent || ''
        const attendi = (f, ms = 20000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('attesa scaduta')) } }, 16) })
        await attendi(() => R.events.some((e) => e.type === 'result'))
        const rec = R.record()
        const live = carta()
        const scadenza = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('replay non concluso in ' + ms + ' ms')), ms))
        await Promise.race([R.replay({ speed: 2 }), scadenza(20000)]); const r1 = carta()
        await Promise.race([R.replay({ speed: 2 }), scadenza(20000)]); const r2 = carta()
        return { outcome: rec.outcome, corner: rec.corner, live, r1, r2 }
      }, i)
      const atteso = esito.corner ? 'INCROCIO' : PAROLA[esito.outcome]
      if (process.env.RIGORI_TRACCIA) console.error(`  tiro ${i}: ${JSON.stringify(esito)}`)
      if (esito.live !== atteso || esito.r1 !== atteso || esito.r2 !== atteso) diversi.push({ i, atteso, ...esito })
    }
    console.log(`    cartello coerente in ${N - diversi.length}/${N} tiri`)
    assert.deepEqual(diversi, [], 'cartello diverso dall\'esito del record')
  }, { timeout: 600000 })

  test('30 parate: il guanto arriva sulla palla entro 0,15 m', async () => {
    await assicuraBrowser()
    const r = await gioco(async () => {
      const R = window.__rigori
      R.game.holdShot = true; R.setPrecision(0)
      const out = []
      const attendi = (f, ms = 20000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('scaduta')) } }, 16) })
      for (let i = 0; i < 30; i++) {
        R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0
        const zona = i % 6
        R.ctx.forceKeeperZone(zona)
        const c = { x: [-2.4, 0, 2.4][zona % 3], y: zona < 3 ? 1.75 : 0.6 }
        R.fire({ x: c.x + (i % 3 - 1) * 0.25, y: c.y + (i % 2 ? 0.12 : -0.1), power: 0.45 + (i % 7) * 0.11, curve: (i % 5 - 2) * 0.3 }, true, 0, 1200 + i)
        await attendi(() => R.events.some((e) => e.type === 'result'))
        const rec = R.record()
        out.push({ seme: rec.seed, zona, esito: rec.outcome, v0: +rec.velocita.toFixed(1), volo: +rec.contactTime.toFixed(3), d: R.distanzaGuanto() })
      }
      return out
    })
    const parate = r.filter((x) => x.esito === 'save')
    const fuori = parate.filter((x) => x.d > 0.15)
    console.log(`    ${parate.length} parate · guanto entro 0,15 m in ${parate.length - fuori.length}/${parate.length} · massimo ${Math.max(...parate.map((x) => x.d)).toFixed(4)} m`)
    assert.ok(parate.length >= 25, 'servono almeno 25 parate nel campione: ' + parate.length)
    assert.deepEqual(fuori, [], 'parate con il guanto troppo lontano dalla palla')
    // la fisica resta nelle finestre chieste
    const v = r.map((x) => x.v0), t = r.map((x) => x.volo)
    assert.ok(Math.min(...v) >= 15 && Math.max(...v) <= 30, `velocità iniziale fuori da 15–30 m/s: ${Math.min(...v)}–${Math.max(...v)}`)
    assert.ok(Math.min(...t) >= 0.4 && Math.max(...t) <= 0.75, `tempo di volo fuori da 0,4–0,75 s: ${Math.min(...t)}–${Math.max(...t)}`)
  }, { timeout: 600000 })

  test('i ruoli vengono dal turno: da portiere tira l\'altro', async () => {
    await assicuraBrowser()
    const r = await gioco(async () => {
      const R = window.__rigori
      R.game.holdShot = true; R.setPrecision(0)
      const attendi = (f, ms = 30000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('scaduta')) } }, 16) })
      const prova = async (ruolo) => {
        R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0
        R.ctx.role(ruolo)
        R.fire({ x: 1.2, y: 1.0, power: 0.8, curve: 0 }, true, 0, 4242)
        await attendi(() => R.events.some((e) => e.type === 'result'))
        const rec = R.record()
        return { ruolo, tiratore: rec.ruoli.tiratore.nome, portiere: rec.ruoli.portiere.nome, utente: rec.ruoli.tiratore.utente, sfotto: document.querySelector('.rg-esito span')?.textContent || '' }
      }
      R.setShooter('monne')
      return { tira: await prova('shooter'), para: await prova('keeper') }
    })
    console.log('    ' + JSON.stringify(r))
    assert.equal(r.tira.tiratore, 'Monne', 'nel turno "Tiri tu" tira il giocatore scelto')
    assert.equal(r.tira.portiere, 'Ale', 'e para Ale')
    assert.equal(r.tira.utente, true)
    assert.equal(r.para.tiratore, 'Ale', 'nel turno "Para tu" tira Ale')
    assert.equal(r.para.portiere, 'Monne', 'e para il giocatore scelto')
    assert.equal(r.para.utente, false)
    // lo sfottò nomina i due ruoli giusti, mai al contrario
    if (r.para.sfotto) {
      assert.ok(!/Monne (segna|ha segnato)/.test(r.para.sfotto), 'nel turno da portiere lo sfottò non può dire che segna il portiere: ' + r.para.sfotto)
    }
  }, { timeout: 300000 })

  test('il turno non cambia durante la sequenza esito + replay', async () => {
    await assicuraBrowser()
    const esito = await gioco(async () => {
      const R = window.__rigori
      R.game.holdShot = false
      R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0
      R.setPrecision(0)
      R.startMode('shootout')
      const attendi = (f, ms = 90000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout')) } }, 16) })
      await attendi(() => R.role() === 'shooter' && R.shotState() === 'idle')
      const prima = { turn: R.mode().turn, me: R.mode().me, ale: R.mode().ale }
      R.fire({ x: 1.2, y: 1.0, power: 0.8, curve: 0 }, true, 0.5)
      await attendi(() => R.events.some((e) => e.type === 'result'))
      const allEsito = { turn: R.mode().turn, hud: document.querySelector('.rg-modehud')?.textContent, locked: R.esitoLocked }
      await attendi(() => R.game.juice.replaying)
      const campioni = []
      await attendi(() => { campioni.push({ turn: R.mode()?.turn, hud: document.querySelector('.rg-modehud')?.textContent, locked: R.esitoLocked }); return !R.game.juice.replaying })
      const dopo = { turn: R.mode().turn, hud: document.querySelector('.rg-modehud')?.textContent }
      return { prima, allEsito, campioni, dopo }
    })
    assert.equal(esito.allEsito.locked, true, 'la sequenza esito+replay è bloccante')
    const turni = [...new Set(esito.campioni.map((c) => c.turn))]
    assert.deepEqual(turni, [esito.allEsito.turn], 'il turno è cambiato durante il replay: ' + JSON.stringify(turni))
    const hud = [...new Set(esito.campioni.map((c) => c.hud))]
    assert.equal(hud.length, 1, 'l\'HUD è cambiato durante il replay: ' + JSON.stringify(hud))
    assert.ok(esito.campioni.every((c) => c.locked), 'il blocco è rimasto attivo per tutto il replay')
    // l'HUD durante il replay mostra il turno del tiro, con il punteggio già aggiornato
    assert.ok(/Hai segnato|Parata di Ale|Fuori|Traversa|Palo/.test(hud[0]), 'HUD del replay: ' + hud[0])
    console.log('    HUD durante il replay:', hud[0], '· turno', turni[0])
  }, { timeout: 300000 })
})

// ------------------------------------------------------------------ partita completa, con registro
// Una partita vera (5 rigori + sudden death) giocata dal test: i tiri dell'utente sono deterministici
// (precisione 0 e zona del portiere forzata, così il test decide se segnare o farsi parare), i tiri di Ale
// restano quelli della CPU, con la sua precisione e la sua scelta d'angolo. Il registro riga per riga è
// quello richiesto in QA_REPORT.md: chi tira, chi para, esito, v0, tempo di volo, guanto e rete.
describe('partita completa', () => {
  test('5 rigori + sudden death: registro per ogni tiro', async () => {
    await assicuraBrowser()
    let esito = null
    // il pareggio a fine regolamentare dipende dai tiri della CPU: se non arriva, si rigioca
    for (let tentativo = 0; tentativo < 3 && !esito?.sudden; tentativo++) {
      esito = await gioco(async (tentativo) => {
        const R = window.__rigori
        const attendi = (f, ms = 60000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (f()) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('attesa scaduta')) } }, 16) })
        const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
        R.game.holdShot = false
        R.game.keeper.reset(); R.game.shot.reset(); R.events.length = 0
        R.setShooter('monne')
        const m = R.startMode('shootout')
        const COL = [-2.55, 0, 2.55]                 // centri delle tre colonne di zona
        const registro = []
        for (let n = 0; n < 40 && R.mode() && !R.mode().finished; n++) {
          const modo = R.mode(), ruolo = R.role()
          if (ruolo === 'idle') { await pausa(100); continue }
          const round = modo.round, sudden = modo.suddenDeath
          R.events.length = 0
          if (ruolo === 'shooter') {
            // in vantaggio si fa parare, altrimenti si segna: così la serie arriva in parità ai rigori
            const segna = modo.me <= modo.ale
            const col = n % 3, riga = n % 2                     // angolo scelto a giro, alto/basso
            const zonaPortiere = segna ? riga * 3 + (col + 2) % 3 : riga * 3 + col
            R.setPrecision(0)
            R.ctx.forceKeeperZone(zonaPortiere)
            R.fire({ x: COL[col] * (segna ? 1.02 : 1), y: riga === 0 ? 1.8 : 0.6, power: 0.55 + (n % 4) * 0.12, curve: (n % 3 - 1) * 0.35 }, true, 0, 5100 + tentativo * 100 + n)
          } else {
            // da portiere: ci si tuffa appena parte la rincorsa, come farebbe una persona (scelta cieca)
            await attendi(() => R.shotState() === 'windup' || R.shotState() === 'flying', 30000)
            R.playerDive((n % 2) * 3 + (n % 3))
          }
          await attendi(() => R.events.some((e) => e.type === 'result'))
          const rec = R.record()
          const sfotto = document.querySelector('.rg-esito span')?.textContent || ''
          await pausa(300)                                       // la rete si gonfia subito dopo il contatto
          registro.push({
            n: registro.length + 1, round, sudden, turno: ruolo === 'shooter' ? 'tu' : 'ale',
            shooterId: rec.ruoli.tiratore.id, keeperId: rec.ruoli.portiere.id, outcome: rec.outcome,
            v0: +rec.velocita.toFixed(1), volo: +rec.contactTime.toFixed(3),
            guanto: rec.outcome === 'save' ? R.distanzaGuanto() : null,
            rete: rec.outcome === 'goal' ? +(R.reteAmpiezza() ?? 0).toFixed(3) : null,
            punteggio: `${R.mode()?.me ?? 0}-${R.mode()?.ale ?? 0}`, sfotto
          })
          await attendi(() => R.events.some((e) => e.type === 'replayEnd') || !R.mode() || R.mode().finished, 90000)
        }
        const fine = R.events.find((e) => e.type === 'modeEnd')
        return { registro, sudden: m.suddenDeath, summary: fine?.summary || m.summary(), xp: R.xpLog.slice() }
      }, tentativo)
      if (!esito.sudden) console.log(`    tentativo ${tentativo + 1}: regolamentari non in parità (${esito.summary.me}–${esito.summary.ale}), si rigioca`)
    }
    const r = esito.registro
    console.log('\n| # | Round | Tira | Para | Esito | v0 m/s | Volo s | Guanto m | Rete m | Punteggio | Sfottò |')
    console.log('|---|---|---|---|---|---|---|---|---|---|---|')
    for (const x of r) console.log(`| ${x.n} | ${x.sudden ? 'SD' : x.round} | ${x.shooterId} | ${x.keeperId} | ${x.outcome} | ${x.v0} | ${x.volo} | ${x.guanto ?? '—'} | ${x.rete ?? '—'} | ${x.punteggio} | ${x.sfotto} |`)
    console.log(`    finale: ${esito.summary.me}–${esito.summary.ale}, vince ${esito.summary.winner}, round ${esito.summary.rounds}, sudden death ${esito.summary.suddenDeath}`)
    // la partita è completa e i ruoli del record seguono il turno
    assert.ok(r.length >= 10, 'la serie deve arrivare almeno ai 5 rigori per parte: ' + r.length)
    assert.equal(esito.summary.suddenDeath, true, 'la partita deve arrivare al sudden death')
    assert.ok(['me', 'ale'].includes(esito.summary.winner), 'la partita finisce con un vincitore')
    for (const x of r) {
      const atteso = x.turno === 'tu' ? { t: 'monne', p: 'ale' } : { t: 'ale', p: 'monne' }
      assert.equal(x.shooterId, atteso.t, `tiro ${x.n}: nel turno "${x.turno}" deve tirare ${atteso.t}`)
      assert.equal(x.keeperId, atteso.p, `tiro ${x.n}: nel turno "${x.turno}" deve parare ${atteso.p}`)
      assert.ok(x.v0 >= 15 && x.v0 <= 30, `tiro ${x.n}: v0 fuori finestra: ${x.v0}`)
      assert.ok(x.volo >= 0.4 && x.volo <= 0.75, `tiro ${x.n}: tempo di volo fuori finestra: ${x.volo}`)
      if (x.outcome === 'save') assert.ok(x.guanto != null && x.guanto <= 0.15, `tiro ${x.n}: guanto a ${x.guanto} m dalla palla`)
      // gonfiore atteso: 0,05 + 0,012·v_impatto, quindi 0,17 m a 10 m/s e 0,41 m a 30 m/s
      if (x.outcome === 'goal') assert.ok(x.rete >= 0.15 && x.rete <= 0.45, `tiro ${x.n}: gonfiore rete fuori scala: ${x.rete} m`)
      assert.ok(x.sfotto.length > 0, `tiro ${x.n}: sfottò mancante`)
    }
  }, { timeout: 900000 })
})
