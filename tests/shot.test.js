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
      for (let t = 0; t <= (rec.tRisoluzione ?? rec.contactTime) + 1e-9; t += passo) { renderShotAt(rec, t, { ball, keeper, live: false }); esiti.add(rec.outcome) }
      // L'istante che conta è quello in cui l'esito si risolve: sulla parata è il contatto con la capsula
      // del portiere (prima della linea), altrimenti l'arrivo sulla porta.
      const tRis = rec.tRisoluzione ?? rec.contactTime
      const atteso = rec.outcome === 'save' ? rec.puntoGuanto : rec.contact
      renderShotAt(rec, tRis, { ball, keeper, live: false })
      esiti.add(rec.outcome)
      // La tolleranza è 0,1 mm: il campionamento è allineato a tRisoluzione, resta l'errore di virgola mobile.
      const scarto = Math.hypot(ball.mesh.position.x - atteso.x, ball.mesh.position.y - atteso.y, ball.mesh.position.z - atteso.z)
      assert.ok(scarto < 1e-4, `a passo ${passo} la palla è a ${scarto.toExponential(2)} m dal punto di risoluzione`)
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
    // Le misure di distanza sono ammesse solo dove NON decidono l'esito durante il disegno: sono la ricerca
    // del punto di contatto (a record ancora aperto), la pianificazione della posa e i ganci di QA.
    // Ogni misura deve stare dentro una di queste funzioni, riconosciuta risalendo all'intestazione più vicina.
    const ammesse = new Set(['guantoVicino', 'guantoA', 'distanzaGuanto', 'passaggioPiuVicino', 'distanzaSegmento', 'verificaParata', 'distanzaMinima'])
    const misure = []
    for (const f of sorgenti) {
      let dentro = '(modulo)'
      for (const riga of readFileSync(f, 'utf8').split('\n')) {
        const m = riga.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/) ||
          riga.match(/^\s*(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|function)/) ||
          riga.match(/^\s*(\w+)\s*\([^)]*\)\s*\{\s*$/) || riga.match(/^\s*(\w+):\s*\(/)
        if (m && !['for', 'if', 'while', 'switch', 'catch', 'return'].includes(m[1])) dentro = m[1]
        if (/\.distanceTo\(|distanceToSquared/.test(riga)) misure.push({ f, dentro, riga: riga.trim().slice(0, 80) })
      }
    }
    const fuori = misure.filter((x) => !ammesse.has(x.dentro))
    assert.deepEqual(fuori, [], 'misure di distanza fuori dalla pianificazione: ' + JSON.stringify(fuori))
    assert.ok(misure.length >= 3, 'le misure ammesse ci sono ancora tutte (trovate ' + misure.length + ')')
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
  test('la parata si decide una volta sola, dalla geometria, alla chiusura del record', () => {
    const src = readFileSync('src/rigori/game/shot.js', 'utf8')
    const chiamate = [...src.matchAll(/verificaParata\(/g)].length
    assert.equal(chiamate, 1, 'verificaParata chiamata una volta sola (in sealShotRecord)')
    const seal = src.slice(src.indexOf('export function sealShotRecord'), src.indexOf('function simulateFree'))
    assert.ok(seal.includes('verificaParata('), 'la chiamata è dentro sealShotRecord')
    // la posa non si corregge più: niente spostamenti del corpo verso la palla
    const keeper = readFileSync('src/rigori/game/keeper.js', 'utf8')
    for (const vietato of ['pianificaTuffo', 'decision.offset', 'SPOSTAMENTO_MAX']) {
      assert.ok(!keeper.includes(vietato), 'keeper.js contiene ancora la correzione della posa: ' + vietato)
    }
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
  await pronto()
  return page
}
// Vite può ricaricare la pagina una volta sola, quando al primo avvio riottimizza le dipendenze: il contesto
// viene distrutto e i test successivi troverebbero __rigori non ancora pronto. Prima di ogni test in browser
// si aspetta che il gioco sia pronto, invece di dare per scontato che il contesto sia ancora quello di prima.
async function pronto() {
  await page.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
  await page.evaluate(() => window.__rigori.kitReady)
}
after(async () => { await browser?.close(); server?.kill('SIGTERM') })

describe('cartello e turno', () => {
  test('50 tiri: il cartello dice sempre l\'esito del record, dal vivo e nei due replay', async () => {
    await assicuraBrowser(); await pronto()
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

  test('le parate hanno contatto vero: guanto o corpo entro 0,25 m', async () => {
    await assicuraBrowser(); await pronto()
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
    const fuori = parate.filter((x) => x.d > 0.25)
    // Dopo il passaggio alla raggiungibilità geometrica il portiere para MOLTO meno: non c'è più nessuna
    // zona astratta, solo le capsule misurate sul modello. Quello che conta è che ogni parata sia vera.
    console.log(`    ${parate.length} parate su ${r.length} tiri · contatto entro 0,25 m in ${parate.length - fuori.length}/${parate.length}` + (parate.length ? ` · massimo ${Math.max(...parate.map((x) => x.d)).toFixed(4)} m` : ''))
    assert.deepEqual(fuori, [], 'parate senza contatto vero')
    // la fisica resta nelle finestre chieste
    const v = r.map((x) => x.v0), t = r.map((x) => x.volo)
    assert.ok(Math.min(...v) >= 15 && Math.max(...v) <= 30, `velocità iniziale fuori da 15–30 m/s: ${Math.min(...v)}–${Math.max(...v)}`)
    assert.ok(Math.min(...t) >= 0.4 && Math.max(...t) <= 0.75, `tempo di volo fuori da 0,4–0,75 s: ${Math.min(...t)}–${Math.max(...t)}`)
  }, { timeout: 600000 })

  test('i ruoli vengono dal turno: da portiere tira l\'altro', async () => {
    await assicuraBrowser(); await pronto()
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
    await assicuraBrowser(); await pronto()
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
    // l'HUD nomina chi ha tirato e chi ha parato, presi dal record: "Gol di Monne", "Parata di Ale", ...
    assert.ok(/Gol di \S+|Parata di \S+|\S+ fuori|Traversa|Palo/.test(hud[0]), 'HUD del replay: ' + hud[0])
    console.log('    HUD durante il replay:', hud[0], '· turno', turni[0])
  }, { timeout: 300000 })
})

