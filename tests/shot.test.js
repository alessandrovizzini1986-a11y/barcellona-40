// Test del tiro: l'esito è calcolato una volta sola alla creazione del record e nessuna passata di disegno
// (live, replay 1, replay 2, passo 1/60 o 1/240) lo può cambiare; il cartello mostra sempre l'esito del record;
// il turno non avanza durante la sequenza esito + replay.
//
//   node --test tests/shot.test.js
//
// I primi due test girano su Node puro (solo la matematica del record). Gli ultimi due avviano Vite e Chromium.
import test, { before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { buildShotRecord, renderShotAt, flightTimeFor } from '../src/rigori/game/shot.js'
import { createKeeper, zoneCenter } from '../src/rigori/game/keeper.js'

// --- finti oggetti di scena: al record servono solo le ossa della matematica, non la grafica ---
const stubChar = () => ({
  group: new THREE.Group(), model: new THREE.Object3D(),
  play() {}, scrub() {}, stopAll() {}, update() {}, get currentAction() { return null }
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
      for (let t = 0; t <= rec.flightTime + 1e-9; t += passo) { renderShotAt(rec, t, { ball, keeper, live: false }); esiti.add(rec.outcome) }
      renderShotAt(rec, rec.flightTime, { ball, keeper, live: false })
      esiti.add(rec.outcome)
      // alla fine del volo guidato la palla è sempre sul punto di contatto, qualunque sia il passo
      assert.ok(Math.abs(ball.mesh.position.x - rec.contact.x) < 1e-9, 'stessa posizione finale a passo ' + passo)
      assert.ok(Math.abs(ball.mesh.position.y - rec.contact.y) < 1e-9)
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
    const vietati = /intersectsBox|intersectsSphere|intersectSphere|containsPoint|\.distanceTo\(/
    const colpevoli = sorgenti.filter((f) => vietati.test(readFileSync(f, 'utf8')))
    assert.deepEqual(colpevoli, [], 'collisioni a runtime trovate in: ' + colpevoli.join(', '))
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
const PORT = 5178
let server = null, browser = null, page = null
const gioco = (fn, arg) => page.evaluate(fn, arg)

before(async () => {
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  const t0 = Date.now()
  while (Date.now() - t0 < 60000) {
    try { const r = await fetch(`http://localhost:${PORT}/rigori/`); if (r.ok) break } catch { /* non ancora pronto */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  const { chromium } = await import('playwright-core')
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const ctx = await browser.newContext({ viewport: { width: 380, height: 820 } })
  page = await ctx.newPage()
  await page.goto(`http://localhost:${PORT}/rigori/?noflow=1&q=bassa`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
  await gioco(() => window.__rigori.kitReady)
}, { timeout: 120000 })

after(async () => { await browser?.close(); server?.kill('SIGTERM') })

describe('cartello e turno', () => {
  test('50 tiri: il cartello dice sempre l\'esito del record, dal vivo e nei due replay', async () => {
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

  test('il turno non cambia durante la sequenza esito + replay', async () => {
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
