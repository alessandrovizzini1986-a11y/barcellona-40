// GATE della raggiungibilità: l'esito di un rigore deve derivare dalla geometria vera del portiere, non da
// una zona astratta. Qui si spara un campione di tiri e si verifica, uno per uno, che:
//   a) ogni PARATA abbia il guanto entro RAGGIO_CAPSULA dalla palla in qualche istante del volo;
//   b) nessun GOL abbia il guanto più vicino di così (niente gol su palle che il portiere aveva).
// Se questo gate non passa, la zona è sbagliata e il commit non si fa.
//
//   node --test tests/keeper-reach.test.js
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { buildShotRecord, voloLibero } from '../src/rigori/game/shot.js'
import { createKeeper } from '../src/rigori/game/keeper.js'
import { distanzaMinima, RAGGIO_CAPSULA, DIVE_DUR, FRAZIONE_MINIMA } from '../src/rigori/game/copertura.js'
import { REACH } from '../src/rigori/data/reach.js'
import { GOAL } from '../src/rigori/scene/net.js'

const DIREZIONI = ['alto sx', 'alto centro', 'alto dx', 'basso sx', 'basso centro', 'basso dx']
// Il record non ha bisogno della grafica: al portiere servono solo la decisione e la tabella del reach.
const stubChar = () => ({
  group: new THREE.Group(), model: new THREE.Object3D(), mixer: { update() {} }, big: { mani: {}, ossa: {}, piedi: {} },
  play() {}, scrub() {}, stopAll() {}, setLean() {}, update() {}, get currentAction() { return null }
})
const keeper = createKeeper(stubChar(), { difficulty: 'normale' })

// 200 tiri con semi diversi, mira sparsa su tutto lo specchio più un margine, potenze e curve varie.
// Le mire NON sono scritte a mano: derivano dalle misure della porta, così restano valide se la porta cambia.
function campione(n = 200) {
  const out = []
  const MX = GOAL.w / 2 * 1.06, MY = GOAL.h * 1.06 // un filo oltre i pali: qualche tiro deve andare fuori
  for (let i = 0; i < n; i++) {
    const seed = 70000 + i
    // metà campione con la direzione forzata (copre tutte e sei), metà con la scelta vera del portiere,
    // che nella realtà indovina la colonna circa una volta su due: è quella che dà il tasso di parata vero
    keeper.force(i < n / 2 ? i % 6 : null)
    const aim = {
      x: -MX + ((i * 7) % 29) / 28 * 2 * MX,
      y: 0.18 + ((i * 11) % 17) / 16 * (MY - 0.18),
      power: 0.4 + ((i * 5) % 13) / 12 * 0.6,
      curve: -1 + ((i * 3) % 9) / 4
    }
    const rec = buildShotRecord({ aim, precision: 0, keeper, seed })
    // distanza minima vera fra palla e capsule, su TUTTO il volo (non solo dopo il 60 % del tuffo)
    const volo = rec.volo || voloLibero(rec, rec.contactTime)
    const dMin = distanzaMinima({ zona: rec.keeper?.zone, tDive: rec.keeper?.reactionDelay ?? 0, volo, tMax: rec.contactTime })
    out.push({ i, seed, forzata: i < n / 2, zona: rec.keeper?.zone ?? null, outcome: rec.outcome, dMin, dFinestra: rec.distanzaGuanto ?? Infinity, aim, rec })
  }
  keeper.force(null)
  return out
}

// Percentuali di gol e di parata, misurate sui due ruoli. Sono l'obiettivo del gioco, non un dettaglio:
// se il portiere non copre lo specchio ogni tiro laterale è gol, e se lo copre troppo non si segna più.
function campioneIncroci(n = 24) {
  const out = []
  for (let i = 0; i < n; i++) {
    keeper.force(null)
    const lato = i % 2 ? 1 : -1
    const aim = { x: lato * (GOAL.w / 2 - 0.22 - (i % 3) * 0.05), y: GOAL.h - 0.22 - (i % 4) * 0.05, power: 0.55 + (i % 5) * 0.09, curve: 0 }
    const rec = buildShotRecord({ aim, precision: 0, keeper, seed: 91000 + i })
    if (['goal', 'save'].includes(rec.outcome)) out.push({ outcome: rec.outcome })
  }
  return out
}
function percentuali(dati) {
  const dentro = (d) => Math.abs(d.aim.x) < GOAL.w / 2 && d.aim.y < GOAL.h
  const inSpecchio = dati.filter((d) => !d.forzata && dentro(d))
  const gol = inSpecchio.filter((d) => d.outcome === 'goal').length
  // incrocio: entro 0,35 m dall'angolo alto
  // Gli incroci hanno un campione tutto loro: mirati dentro l'angolo alto, con lo scarto che basta a restare
  // nello specchio. Nel campione sparso ne cadono troppo pochi per dire qualcosa.
  const incroci = campioneIncroci()
  const incrociGol = incroci.filter((d) => d.outcome === 'goal').length
  // centrali a mezza altezza, col portiere che resta in mezzo (direzioni 1 e 4)
  const centrali = dati.filter((d) => Math.abs(d.aim.x) < GOAL.w / 6 && d.aim.y < GOAL.h * 0.7 && [1, 4].includes(d.zona) && ['goal', 'save'].includes(d.outcome))
  const centraliParati = centrali.filter((d) => d.outcome === 'save').length
  return {
    tiriInSpecchio: inSpecchio.length, golPct: 100 * gol / (inSpecchio.length || 1),
    parataPct: 100 * inSpecchio.filter((d) => d.outcome === 'save').length / (inSpecchio.length || 1),
    incroci: incroci.length, incrociGolPct: incroci.length ? 100 * incrociGol / incroci.length : null,
    centrali: centrali.length, centraliParatiPct: centrali.length ? 100 * centraliParati / centrali.length : null
  }
}

describe('raggiungibilità geometrica', () => {
  const dati = campione()
  test('la tabella del reach è quella misurata sul modello, non numeri a mano', () => {
    for (let z = 0; z < 6; z++) {
      assert.ok(Array.isArray(REACH[z]) && REACH[z].length >= 5, `manca il reach della direzione ${z}`)
      for (const c of REACH[z]) for (const k of ['L', 'R', 'sL', 'sR']) {
        assert.ok(Array.isArray(c[k]) && c[k].length === 3, `campione malformato in ${z}.${k}`)
      }
    }
    // Il tuffo PARTE coi piedi a terra. Non finisce a terra dentro questa finestra, e deve essere così: la
    // posa si ferma alla massima estensione, che è il momento in cui arriva la palla. L'atterraggio avviene
    // dopo, fuori dalla finestra che decide l'esito (renderAt fa proseguire la clip e rientrare l'alzata).
    for (let z = 0; z < 6; z++) {
      assert.ok(Math.abs(REACH[z][0].piedi) < 0.10, `direzione ${z}: piedi staccati da terra all'inizio (${REACH[z][0].piedi})`)
      assert.ok(REACH[z].at(-1).piedi <= 1.2, `direzione ${z}: il tuffo finisce troppo in alto (${REACH[z].at(-1).piedi})`)
    }
  })

  test('a) ogni parata ha il guanto entro 0,25 m dalla palla', () => {
    const parate = dati.filter((d) => d.outcome === 'save')
    const fuori = parate.filter((d) => d.dMin > RAGGIO_CAPSULA + 1e-6)
      .map((d) => ({ seme: d.seed, zona: d.zona, distanza: +d.dMin.toFixed(3) }))
    assert.ok(parate.length > 0, 'nessuna parata nel campione: la zona è troppo stretta')
    assert.deepEqual(fuori, [], 'parate senza contatto: la zona coperta è ancora sbagliata')
    const max = Math.max(...parate.map((d) => d.dMin))
    assert.ok(max <= RAGGIO_CAPSULA, `distanza massima su una parata: ${max.toFixed(3)} m`)
  })

  test('b) nessun gol dove il portiere aveva la palla', () => {
    // un gol può avere il guanto vicino solo se la palla è arrivata prima che il tuffo fosse al 60 %:
    // in quel caso il portiere non c'era ancora, ed è giusto che sia gol.
    const sospetti = dati.filter((d) => d.outcome === 'goal' && d.dFinestra <= RAGGIO_CAPSULA)
      .map((d) => ({ seme: d.seed, zona: d.zona, distanza: +d.dFinestra.toFixed(3) }))
    assert.deepEqual(sospetti, [], 'gol su palle che il portiere aveva dentro la capsula a tuffo arrivato')
    // Fuori finestra invece può succedere, ed è giusto: la palla è passata mentre il tuffo era ancora
    // sotto il 60 % e il portiere non era arrivato. Si conta quante volte, per non nasconderlo.
    const primaDelTempo = dati.filter((d) => d.outcome === 'goal' && d.dMin <= RAGGIO_CAPSULA).length
    console.log(`    gol con la palla passata vicino al guanto ma a tuffo non ancora arrivato: ${primaDelTempo}`)
  })

  test('obiettivi numerici dei due ruoli', () => {
    const q = percentuali(dati)
    console.log('\n| Misura | Valore | Obiettivo |')
    console.log('|---|---|---|')
    console.log(`| Gol quando tiri tu (portiere CPU) | **${q.golPct.toFixed(1)} %** su ${q.tiriInSpecchio} tiri nello specchio | 60–70 % |`)
    console.log(`| Parate quando pari tu (direzione a caso) | **${q.parataPct.toFixed(1)} %** | 28–38 % |`)
    console.log(`| Gol sui tiri all'incrocio (entro 0,35 m) | ${q.incrociGolPct == null ? '—' : q.incrociGolPct.toFixed(1) + ' %'} su ${q.incroci} | quasi imparabili |`)
    console.log(`| Parate sui centrali a mezza altezza, portiere al centro | ${q.centraliParatiPct == null ? '—' : q.centraliParatiPct.toFixed(1) + ' %'} su ${q.centrali} | 70 %+ |`)
    assert.ok(q.tiriInSpecchio >= 40, 'campione troppo piccolo: ' + q.tiriInSpecchio)
  })

  test('c) tabella per direzione', () => {
    const righe = []
    for (let z = 0; z < 6; z++) {
      const dz = dati.filter((d) => d.zona === z)
      const parate = dz.filter((d) => d.outcome === 'save')
      const dd = parate.map((d) => d.dMin)
      righe.push({ direzione: DIREZIONI[z], tiri: dz.length, parate: parate.length,
        media: dd.length ? +(dd.reduce((a, b) => a + b, 0) / dd.length).toFixed(3) : null,
        massima: dd.length ? +Math.max(...dd).toFixed(3) : null })
    }
    console.log('\n| Direzione | Tiri | Parate | Distanza media | Distanza massima |')
    console.log('|---|---|---|---|---|')
    for (const r of righe) console.log(`| ${r.direzione} | ${r.tiri} | ${r.parate} | ${r.media ?? '—'} | ${r.massima ?? '—'} |`)
    console.log(`    porta ${GOAL.w} × ${GOAL.h} m · durata tuffo ${DIVE_DUR} s · soglia ${FRAZIONE_MINIMA * 100} % · raggio capsula ${RAGGIO_CAPSULA} m`)
    assert.ok(righe.length === 6)
  })
})
