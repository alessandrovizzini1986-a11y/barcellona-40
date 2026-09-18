import * as THREE from 'three'
import { DIVE_DUR } from './copertura.js'
import { GOAL } from '../scene/net.js'
import { TUFFI } from '../data/tuffi.js'
// Portiere: 6 zone (alto/basso × sx/centro/dx), lettura del tell, tuffi, difficoltà per modalità.
//
// TIMELINE UNICA: durante un rigore il portiere non si anima da solo. La decisione (zona, ritardo di reazione,
// clip) viene presa una volta sola al calcio, dentro il record del tiro; posizione e posa sono poi una funzione
// pura del tempo trascorso dal calcio (`renderAt`). Così dal vivo e in ogni replay il tuffo è identico.
//
// LA POSA NON INSEGUE LA PALLA. Per ogni direzione la posa è sempre la stessa: clip, durata fissa (DIVE_DUR)
// e, per le due direzioni alte laterali, un arco verticale fisso. Dove arrivano i guanti lungo quella posa è
// misurato dal modello una volta per tutte (`data/reach.js`) e da lì nasce la zona coperta: l'esito è parata
// solo se la palla passa dentro quella zona e il tuffo è già almeno al 60 %. Se il guanto non ci arriva, è gol,
// e non c'è nulla da aggiustare a runtime.
export const ZONES = ['altoSx', 'altoCentro', 'altoDx', 'bassoSx', 'bassoCentro', 'bassoDx']
// Le sei direzioni escono dalle misure della porta, non da numeri scritti a mano: tre settori orizzontali
// larghi GOAL.w/3 (1,53 m con la porta in scala) e due fasce d'altezza. Se la porta cambia, cambiano da sole.
const COL = GOAL.w / 6            // mezzo settore: il confine fra centro e laterali
export const zoneOf = (x, y) => (y > GOAL.h * 0.47 ? 0 : 3) + (x < -COL ? 0 : x > COL ? 2 : 1)
export const zoneCenter = (z) => ({ x: [-GOAL.w / 3, 0, GOAL.w / 3][z % 3], y: GOAL.h * (z < 3 ? 0.72 : 0.25) })
// reazione: secondi dal calcio all'inizio del tuffo (da prompt: 0,18–0,32 s, più bassa in Boss)
const DIFF = {
  facile:  { pCol: 0.40, tell: 0.15, pRow: 0.55, reach: 0.85, react: [0.26, 0.32] },
  normale: { pCol: 0.52, tell: 0.20, pRow: 0.62, reach: 0.95, react: [0.22, 0.30] },
  boss:    { pCol: 0.78, tell: 0.06, pRow: 0.78, reach: 1.15, react: [0.18, 0.24] }
}
// Le clip Mixamo hanno una lunga preparazione: si entra a clip già avviata e si mostra solo la parte utile.
const CLIP_START = { diveL: 0.55, diveR: 0.55, block: 0.35, catch: 0.30, high: 0.50 }
const CLIP_SPAN = 0.60 // quanto della clip si mostra: si ferma alla massima estensione, non fino a terra.
// Con 0,95 il tuffo proseguiva verso il suolo proprio mentre arrivava la palla e le mani cadevano: le parate
// col tuffo giusto erano il 15 %, con 0,60 sono il 34 %. L'atterraggio lo fa react(), dopo l'esito.
// DURATA DEL TUFFO: costante, non più stirata fino all'impatto. Il portiere parte a t_dive e arriva a
// t_dive + DIVE_DUR, punto. Se la palla passa prima, non c'è. La difficoltà si tara qui e su reactionDelay,
// mai allargando la zona coperta (vedi data/reach.js).
export { DIVE_DUR }
// Misurato clip per clip, mani in coordinate mondo lungo tutta la posa:
//   keeperIdle |x| 0,33  y 0,52-0,59      ready |x| 1,55  y 0,57-0,65
//   block      |x| 1,36  y 0,09-0,57      catch |x| 0,41  y 0,31-0,59
//   high       |x| 0,46  y 0,48-1,77      diveL |x| 2,17  y 0,39-1,06
// Da qui la scelta: ai lati solo diveL arriva davvero in fondo, specchiata per il lato destro. Al centro
// `high` copre la fascia alta fino a 1,77 e `block` quella bassa, più larga di `catch`.
const posaPerZona = (zone) => {
  const col = zone % 3, row = zone < 3 ? 0 : 1
  if (col === 1) return { clip: row === 0 ? 'high' : 'block', mirror: 1 }
  return { clip: 'diveL', mirror: col === 0 ? 1 : -1 }
}
// SPOSTAMENTO DELLA RADICE PER DIREZIONE, calibrato una volta sola e salvato in data/tuffi.js.
// Le clip Mixamo non sono state fatte per questa porta: il tuffo laterale butta le mani a |x| 2,29 m (il
// settore laterale sta a 1,53) e a fine tuffo le fa scendere a y 0,26-0,41, mentre la palla passa più in alto.
// Per ogni direzione si sposta la radice di una quantità FISSA, la stessa a ogni tiro, che non guarda dove va
// il tiro: sulla X per non superare il settore, sulla Y (solo nei tuffi) per incontrare la palla dove passa.
// La calibrazione la fa scripts/qa/rigori-calibra.mjs misurando, non a occhio.
const CULMINE = 0.8 // il culmine cade a 4/5 del tuffo: è lì che arriva la palla
const profilo = (u) => { const x = THREE.MathUtils.clamp(u, 0, 1); const k = x <= CULMINE ? x / CULMINE : 1 - (x - CULMINE) / (1 - CULMINE); return k * k * (3 - 2 * k) }
export const alzataA = (zone, u) => (TUFFI[zone]?.y || 0) * profilo(u)
// Il rientro NON è tarato a mano: è la differenza fra dove la clip porta le mani (misurata, 2,29 m dal
// centro) e dove sta il centro del settore laterale (GOAL.w/3). Così è simmetrico per costruzione e segue
// la porta: se la porta cambia larghezza, il tuffo si riposiziona da solo, senza ricalibrare niente.
const ALLUNGO_CLIP = 2.29
export const rientroDi = (zone, u = 1) => {
  const col = zone % 3
  if (col === 1) return 0
  return (ALLUNGO_CLIP - GOAL.w / 3) * (col === 0 ? 1 : -1) * THREE.MathUtils.clamp(u, 0, 1)
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3()
export function createKeeper(char, { difficulty = 'normale', onDive } = {}) {
  const g = char.group
  g.position.set(0, 0, 0.55) // sulla linea, un passo avanti, rivolto verso il dischetto (+z)
  let state = 'idle', forced = null, diff = DIFF[difficulty] || DIFF.normale
  let playable = false, passive = false
  let driven = null          // decisione in corso di esecuzione (dal record del tiro)
  let released = null        // decisione a cui l'esito ha tolto il controllo (esultanza/delusione)
  let dustDone = false, lastT = 0
  const idle = () => { state = 'idle'; driven = null; char.play('keeperIdle', { loop: true, fade: 0.3 }) }
  idle()
  // Posizione del corpo a un dato istante del tuffo, senza lo spostamento correttivo
  // Lo spostamento laterale NON viene aggiunto a mano: la clip del tuffo lo porta già con sé, e sommarlo
  // sposterebbe il portiere il doppio. Il corpo parte da dove sta e ci pensa la correzione misurata.
  // Avanzamento del tuffo: u = 0 al via, 1 a tuffo concluso. Durata fissa, indipendente dal tiro.
  const avanzamento = (decision, t) => THREE.MathUtils.clamp((t - decision.reactionDelay) / DIVE_DUR, 0, 1)
  // Applica posa e posizione a un istante. La posa è SOLO funzione della direzione e di u: nessuna
  // correzione verso la palla, nessun inseguimento. Se il guanto non ci arriva, l'esito è gol.
  const posaA = (decision, t) => {
    const u = avanzamento(decision, t)
    g.position.set((decision.startX ?? 0) + rientroDi(decision.zone, u), alzataA(decision.zone, u), 0.55)
    char.model.scale.x = decision.mirror ?? 1
    char.scrub(decision.clip, (CLIP_START[decision.clip] || 0) + u * CLIP_SPAN)
    char.mixer.update(0)
    g.updateMatrixWorld(true)
  }
  // Guanto più vicino a un punto, in coordinate mondo
  const guantoVicino = (punto, out = new THREE.Vector3()) => {
    const mani = char.big?.mani || {}
    let best = null, bestD = Infinity
    for (const lato of ['Left', 'Right']) {
      const m = mani[lato]; if (!m) continue
      m.getWorldPosition(_v)
      const d = _v.distanceTo(punto)
      if (d < bestD) { bestD = d; best = lato; out.copy(_v) }
    }
    return best ? { lato: best, pos: out, distanza: bestD } : null
  }
  return {
    group: g, ZONES,
    get state() { return state }, get difficulty() { return difficulty }, get action() { return char.currentAction },
    get playable() { return playable }, get passive() { return passive },
    setDifficulty(d) { difficulty = d; diff = DIFF[d] || DIFF.normale },
    force(zone) { forced = zone }, // QA: zona del tuffo forzata (null = IA)
    setPlayable(v) { playable = !!v },
    setPassive(v) { passive = !!v; if (passive) { state = 'passive'; driven = null; char.play('ready', { loop: true, fade: 0.3 }) } else idle() },
    // ---- decisione: una volta sola, al calcio, con il generatore del record ----
    decide({ aim, timingPerfect = false, rnd }) {
      if (passive) return null
      const real = zoneOf(aim.x, aim.y)
      const reactionDelay = diff.react[0] + rnd() * (diff.react[1] - diff.react[0])
      if (playable) return { mode: 'player', zone: null, reactionDelay: null, clip: null, startX: g.position.x }
      let zone
      if (forced != null) zone = forced
      else {
        const pCol = Math.min(0.95, diff.pCol + (timingPerfect ? diff.tell * 0.5 : diff.tell))
        const realCol = real % 3, realRow = real < 3 ? 0 : 1
        const col = rnd() < pCol ? realCol : [0, 1, 2].filter((c) => c !== realCol)[(rnd() * 2) | 0]
        const row = rnd() < diff.pRow ? realRow : 1 - realRow
        zone = row * 3 + col
      }
      return { mode: 'cpu', zone, reactionDelay, ...posaPerZona(zone), startX: g.position.x }
    },
    playerDecision(zone, t) { return { mode: 'player', zone, reactionDelay: t, ...posaPerZona(zone), startX: g.position.x } },
    // Dove sta il guanto a un istante qualsiasi, con lo spostamento applicato (serve ai test)
    // Dove sta il guanto a un istante qualsiasi (QA e misura del reach)
    guantoA(decision, t, contactTime, punto) {
      if (!decision || decision.zone == null) return null
      const salva = { pos: g.position.clone(), scala: char.model.scale.x, lastT, driven, released }
      driven = null; released = null; lastT = 0
      this.renderAt(decision, t, contactTime, false)
      char.mixer.update(0); g.updateMatrixWorld(true)
      const trovato = guantoVicino(punto || _w.set(0, 0, 0))
      g.position.copy(salva.pos); char.model.scale.x = salva.scala
      lastT = salva.lastT; driven = salva.driven; released = salva.released
      return trovato ? trovato.pos.clone() : null
    },
    // ---- esecuzione: posizione e posa sono una funzione pura di t (secondi dal calcio) ----
    renderAt(decision, t, contactTime, live = true) {
      const rewound = t < lastT - 1e-6
      lastT = t
      if (rewound) { released = null; driven = null }
      if (!decision || decision.zone == null) { if (driven) { driven = null; idle() } return }
      if (released === decision) return // dopo l'esito comanda la reazione, non più il record
      if (driven !== decision) { driven = decision; dustDone = false; state = 'diving'; char.stopAll() }
      const start = decision.reactionDelay
      const u = avanzamento(decision, t)
      // ATTERRAGGIO: finito il tuffo la clip prosegue fino a terra e l'alzata rientra. Sta FUORI dalla
      // finestra che decide l'esito (u resta a 1 lì dentro), quindi non cambia la zona coperta: serve solo
      // perché a replay finito il portiere non resti sospeso a mezz'aria.
      const dopo = Math.max(0, t - (start + DIVE_DUR))
      const caduta = THREE.MathUtils.clamp(1 - dopo / 0.30, 0, 1)
      // La radice si muove solo lungo l'arco verticale della direzione (zero per le direzioni basse):
      // nessuno spostamento verso la palla, nessuna correzione. La posa è quella della direzione, sempre.
      g.position.set((decision.startX ?? 0) + rientroDi(decision.zone, u), alzataA(decision.zone, u) * caduta, 0.55)
      char.model.scale.x = decision.mirror ?? 1
      char.setLean(0)
      char.scrub(decision.clip, (CLIP_START[decision.clip] || 0) + u * CLIP_SPAN + Math.min(0.5, dopo))
      if (live && !dustDone && t >= start) { dustDone = true; onDive?.(decision.zone, g.position) }
    },
    react(result) {
      if (passive) return
      released = driven; driven = null
      if (result === 'goal') { state = 'beaten'; char.play('beaten', { fade: 0.2 }) }
      else if (result === 'save') { state = 'saved' }
      else if (state === 'diving') state = 'missed'
    },
    reset() { driven = null; released = null; lastT = 0; char.stopAll(); g.position.set(0, 0, 0.55); char.model.scale.x = 1; char.setLean(0); if (!passive) idle(); else { state = 'passive'; char.play('ready', { loop: true, fade: 0.2 }) } },
    update(dt) { char.update(dt) }
  }
}
