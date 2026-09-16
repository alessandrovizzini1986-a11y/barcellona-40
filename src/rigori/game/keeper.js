import * as THREE from 'three'
// Portiere: 6 zone (alto/basso × sx/centro/dx), lettura del tell, tuffi, difficoltà per modalità.
// Le probabilità sono mie scelte, marcate DA VERIFICARE; il prompt fissa solo: Boss = reattività +40% e tell quasi assenti.
//
// TIMELINE UNICA: durante un rigore il portiere non si anima da solo. La decisione (zona, ritardo di reazione,
// clip) viene presa una volta sola al calcio, dentro il record del tiro; posizione e posa sono poi una funzione
// pura del tempo trascorso dal calcio (`renderAt`). Così dal vivo e in ogni replay il tuffo è identico.
export const ZONES = ['altoSx', 'altoCentro', 'altoDx', 'bassoSx', 'bassoCentro', 'bassoDx']
export const zoneOf = (x, y) => (y > 1.15 ? 0 : 3) + (x < -1.22 ? 0 : x > 1.22 ? 2 : 1)
export const zoneCenter = (z) => ({ x: [-2.4, 0, 2.4][z % 3], y: z < 3 ? 1.75 : 0.6 })
const zoneX = (z) => [-1.9, 0, 1.9][z % 3]
// reazione: ms dal calcio all'inizio del tuffo (da prompt: 180–320 ms, più bassa in Boss) · DA VERIFICARE sul telefono
const DIFF = {
  facile:  { pCol: 0.40, tell: 0.15, pRow: 0.55, reach: 0.85, react: [0.26, 0.32] },
  normale: { pCol: 0.52, tell: 0.20, pRow: 0.62, reach: 0.95, react: [0.20, 0.28] },
  boss:    { pCol: 0.78, tell: 0.06, pRow: 0.78, reach: 1.15, react: [0.13, 0.18] }
}
// Le clip Mixamo hanno una lunga preparazione: si entra a clip già avviata e si mostra solo la parte utile.
const CLIP_START = { diveL: 0.55, diveR: 0.55, block: 0.35, catch: 0.30, high: 0.50 }
const CLIP_SPAN = 0.95 // secondi di clip mostrati, riscalati sulla finestra del tuffo
// Misurato: la clip diveL sposta i fianchi verso +x (la sinistra del portiere, che guarda +z); la zona col 0 sta a x<0
const clipFor = (zone) => {
  const col = zone % 3, row = zone < 3 ? 0 : 1
  return row === 0 && col !== 1 ? 'high' : col === 0 ? 'diveR' : col === 2 ? 'diveL' : row === 0 ? 'block' : 'catch'
}
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
  return {
    group: g, ZONES,
    get state() { return state }, get difficulty() { return difficulty }, get action() { return char.currentAction }, get playable() { return playable }, get passive() { return passive },
    setDifficulty(d) { difficulty = d; diff = DIFF[d] || DIFF.normale },
    force(zone) { forced = zone }, // QA: zona del tuffo forzata (null = IA)
    setPlayable(v) { playable = !!v },
    setPassive(v) { passive = !!v; if (passive) { state = 'passive'; driven = null; char.play('ready', { loop: true, fade: 0.3 }) } else idle() },
    // ---- decisione: una volta sola, al calcio, con il generatore del record ----
    // Ritorna la parte "portiere" del record, o null se il portiere non interviene (passivo).
    // Con il portiere giocabile la zona non è nota al calcio: resta null e la riempie il giocatore (playerDecision).
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
      return { mode: 'cpu', zone, reactionDelay, clip: clipFor(zone), startX: g.position.x }
    },
    // Tuffo del giocatore (modalità portiere): completa il record con zona e istante del gesto
    playerDecision(zone, t) { return { mode: 'player', zone, reactionDelay: t, clip: clipFor(zone), startX: g.position.x } },
    // ---- esito: calcolato una volta, al calcio (o al gesto), mai guardando dove è finita la palla ----
    evaluate({ aim, decision, contactTime }) {
      if (!decision || decision.zone == null) return null
      const c = zoneCenter(decision.zone)
      const d = Math.hypot(aim.x - c.x, aim.y - c.y)
      const corner = decision.zone % 3 !== 1 && decision.zone < 3
      // il braccio arriva col tempo: quanto prima parte il tuffo, tanto più lontano arriva
      const progress = Math.min(1, Math.max(0, contactTime - decision.reactionDelay) / 0.32 + 0.35)
      let reach = diff.reach * (corner ? 0.78 : 1) * progress
      if (aim.power > 1.0) reach *= 0.85
      if (d > reach) return null
      return { catch: aim.power < 0.8 && d < reach * 0.5, deflectX: Math.sign(aim.x - c.x || 1) * 2.2 }
    },
    // ---- esecuzione: posizione e posa sono una funzione pura di t (secondi dal calcio) ----
    // Identica dal vivo e in ogni replay. Non decide niente, non estrae numeri casuali.
    // live=false (replay, test): disegna soltanto. Gli effetti di scena con numeri casuali (polvere) non si ripetono.
    renderAt(decision, t, contactTime, live = true) {
      // t che torna indietro = nuova passata (replay): mixer da zero, così il tuffo riparte identico ogni volta
      const rewound = t < lastT - 1e-6
      lastT = t
      if (rewound) { released = null; driven = null }
      if (!decision || decision.zone == null) { if (driven) { driven = null; idle() } return }
      if (released === decision) return // dopo l'esito comanda la reazione, non più il record
      if (driven !== decision) { driven = decision; dustDone = false; state = 'diving'; char.stopAll() }
      const start = decision.reactionDelay
      // il corpo arriva nella zona esattamente all'impatto; la clip finisce poco dopo: il tuffo è sempre visibile
      const lateral = Math.max(0.18, contactTime - start)
      const window = Math.max(0.24, contactTime - start + 0.25)
      const k = THREE.MathUtils.clamp((t - start) / lateral, 0, 1)
      g.position.x = THREE.MathUtils.lerp(decision.startX ?? 0, zoneX(decision.zone), k * k * (3 - 2 * k))
      // le clip "high" non hanno direzione: specchio il modello per il lato sinistro
      char.model.scale.x = (decision.zone === 0) ? -1 : 1
      const u = THREE.MathUtils.clamp((t - start) / window, 0, 1)
      char.scrub(decision.clip, (CLIP_START[decision.clip] || 0) + u * CLIP_SPAN)
      if (live && !dustDone && t >= start) { dustDone = true; onDive?.(decision.zone, g.position) }
    },
    // Reazione dopo l'esito (fuori dalla timeline del tiro): delusione o presa
    react(result) {
      if (passive) return
      released = driven; driven = null
      if (result === 'goal') { state = 'beaten'; char.play('beaten', { fade: 0.2 }) }
      else if (result === 'save') { state = 'saved' }
      else if (state === 'diving') state = 'missed'
    },
    reset() { driven = null; released = null; lastT = 0; char.stopAll(); g.position.x = 0; char.model.scale.x = 1; if (!passive) idle(); else { state = 'passive'; char.play('ready', { loop: true, fade: 0.2 }) } },
    update(dt) { char.update(dt) }
  }
}
