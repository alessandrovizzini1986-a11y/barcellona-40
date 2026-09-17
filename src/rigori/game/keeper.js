import * as THREE from 'three'
// Portiere: 6 zone (alto/basso × sx/centro/dx), lettura del tell, tuffi, difficoltà per modalità.
//
// TIMELINE UNICA: durante un rigore il portiere non si anima da solo. La decisione (zona, ritardo di reazione,
// clip) viene presa una volta sola al calcio, dentro il record del tiro; posizione e posa sono poi una funzione
// pura del tempo trascorso dal calcio (`renderAt`). Così dal vivo e in ogni replay il tuffo è identico.
//
// LA POSA SI ADATTA ALLA PALLA. L'esito lo decide `evaluate` (portata del tuffo contro punto d'impatto). Poi
// `pianificaTuffo` misura dove finirebbe il guanto e aggiunge uno spostamento del corpo perché, all'istante
// dell'impatto, il guanto sia SULLA palla quando è parata e lontano quando non lo è. Mai il contrario.
export const ZONES = ['altoSx', 'altoCentro', 'altoDx', 'bassoSx', 'bassoCentro', 'bassoDx']
export const zoneOf = (x, y) => (y > 1.15 ? 0 : 3) + (x < -1.22 ? 0 : x > 1.22 ? 2 : 1)
export const zoneCenter = (z) => ({ x: [-2.4, 0, 2.4][z % 3], y: z < 3 ? 1.75 : 0.6 })
export const RAGGIO_GUANTO = 0.15 // quanto vicino deve stare il guanto alla palla su una parata
const SPOSTAMENTO_MAX = 2.8       // quanto può allungarsi il corpo oltre l'animazione, in metri: un tuffo in volo
// reazione: secondi dal calcio all'inizio del tuffo (da prompt: 0,18–0,32 s, più bassa in Boss)
const DIFF = {
  facile:  { pCol: 0.40, tell: 0.15, pRow: 0.55, reach: 0.85, react: [0.26, 0.32] },
  normale: { pCol: 0.52, tell: 0.20, pRow: 0.62, reach: 0.95, react: [0.22, 0.30] },
  boss:    { pCol: 0.78, tell: 0.06, pRow: 0.78, reach: 1.15, react: [0.18, 0.24] }
}
// Le clip Mixamo hanno una lunga preparazione: si entra a clip già avviata e si mostra solo la parte utile.
const CLIP_START = { diveL: 0.55, diveR: 0.55, block: 0.35, catch: 0.30, high: 0.50 }
const CLIP_SPAN = 0.95 // secondi di clip mostrati, riscalati sulla finestra del tuffo
// Misurato clip per clip (guanto a fine tuffo, corpo al centro): diveL porta le mani a x ≈ -2,28, diveR solo
// a +1,77, high e block restano sotto x = 1,2. Quindi per tutti e quattro gli angoli si usa diveL, specchiata
// per il lato destro: è l'unica che arriva davvero in fondo. Al centro restano high (alto) e catch (basso).
const posaPerZona = (zone) => {
  const col = zone % 3, row = zone < 3 ? 0 : 1
  if (col === 1) return { clip: row === 0 ? 'high' : 'catch', mirror: 1 }
  return { clip: 'diveL', mirror: col === 0 ? 1 : -1 }
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3()
const zonaPunto = (z) => { const c = zoneCenter(z); return _w.set(c.x, c.y, 0.3) }
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
  const baseA = (decision, t, contactTime) => {
    const start = decision.reactionDelay
    const durata = Math.max(0.12, contactTime - start)
    const k = THREE.MathUtils.clamp((t - start) / durata, 0, 1)
    return { k: k * k * (3 - 2 * k), x: decision.startX ?? 0 }
  }
  // Applica posa e posizione a un istante, senza correzione: serve a misurare dove finisce il guanto
  const posaA = (decision, t, contactTime) => {
    const { x } = baseA(decision, t, contactTime)
    g.position.set(x, 0, 0.55)
    char.model.scale.x = decision.mirror ?? 1
    const window = Math.max(0.24, contactTime - decision.reactionDelay + 0.25)
    const u = THREE.MathUtils.clamp((t - decision.reactionDelay) / window, 0, 1)
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
      if (playable) return { mode: 'player', zone: null, reactionDelay: null, clip: null, startX: g.position.x, offset: null }
      let zone
      if (forced != null) zone = forced
      else {
        const pCol = Math.min(0.95, diff.pCol + (timingPerfect ? diff.tell * 0.5 : diff.tell))
        const realCol = real % 3, realRow = real < 3 ? 0 : 1
        const col = rnd() < pCol ? realCol : [0, 1, 2].filter((c) => c !== realCol)[(rnd() * 2) | 0]
        const row = rnd() < diff.pRow ? realRow : 1 - realRow
        zone = row * 3 + col
      }
      return { mode: 'cpu', zone, reactionDelay, ...posaPerZona(zone), startX: g.position.x, offset: null }
    },
    playerDecision(zone, t) { return { mode: 'player', zone, reactionDelay: t, ...posaPerZona(zone), startX: g.position.x, offset: null } },
    // ---- esito: calcolato una volta, mai guardando dove è finita la palla nel disegno ----
    evaluate({ aim, decision, contactTime, punto }) {
      if (!decision || decision.zone == null) return null
      const c = zoneCenter(decision.zone)
      const px = punto ? punto.x : aim.x, py = punto ? punto.y : aim.y
      const d = Math.hypot(px - c.x, py - c.y)
      const corner = decision.zone % 3 !== 1 && decision.zone < 3
      // il braccio arriva col tempo: quanto prima parte il tuffo, tanto più lontano arriva
      const progress = Math.min(1, Math.max(0, contactTime - decision.reactionDelay) / 0.32 + 0.35)
      let reach = diff.reach * (corner ? 0.78 : 1) * progress
      if (aim.power > 1.0) reach *= 0.85
      if (d > reach) return null
      return { catch: aim.power < 0.8 && d < reach * 0.5, distanza: d, guanto: null }
    },
    // ---- la posa insegue la palla: spostamento del corpo perché il guanto arrivi (o resti lontano) ----
    // Ritorna la posizione mondo del guanto all'istante dell'impatto, con lo spostamento applicato.
    pianificaTuffo(decision, punto, contactTime, { prende = true } = {}) {
      const salva = { pos: g.position.clone(), scala: char.model.scale.x, lastT, driven, released }
      decision.offset = null
      // Si raffina con la STESSA funzione di disegno: così l'inclinazione del busto e ogni altro effetto
      // della posa sono già dentro la misura, e il guanto finisce davvero dove deve.
      let trovato = null
      for (let i = 0; i < 3; i++) {
        driven = null; released = null; lastT = 0
        this.renderAt(decision, contactTime, contactTime, false)
        char.mixer.update(0); g.updateMatrixWorld(true)
        trovato = guantoVicino(punto)
        if (!trovato) break
        const manca = _v.copy(punto).sub(trovato.pos)
        const o = decision.offset || { x: 0, y: 0, z: 0 }
        if (prende) {
          const off = new THREE.Vector3(o.x + manca.x, o.y + manca.y, o.z + manca.z)
          if (off.length() > SPOSTAMENTO_MAX) off.setLength(SPOSTAMENTO_MAX)
          decision.offset = { x: off.x, y: off.y, z: off.z }
        } else {
          // non è parata: il corpo si scosta quel tanto che basta perché la palla non lo attraversi
          if (trovato.distanza >= 0.32) break
          const via = _v.copy(trovato.pos).sub(punto).setLength(0.32 - trovato.distanza)
          decision.offset = { x: o.x + via.x, y: o.y + via.y, z: o.z + via.z }
          break
        }
        if (manca.length() < 0.01) break
      }
      decision.guanto = trovato?.lato || null
      let finale = punto.clone()
      if (trovato) {
        driven = null; released = null; lastT = 0
        this.renderAt(decision, contactTime, contactTime, false)
        char.mixer.update(0); g.updateMatrixWorld(true)
        const ultimo = guantoVicino(punto)
        if (ultimo) finale = ultimo.pos.clone()
      }
      g.position.copy(salva.pos); char.model.scale.x = salva.scala
      lastT = salva.lastT; driven = salva.driven; released = salva.released
      return finale
    },
    // Dove finirebbero le mani a un dato istante SENZA correzione: serve a capire dove passa la parata
    guantoNaturale(decision, t, contactTime, verso) {
      if (!decision || decision.zone == null) return null
      const salva = { pos: g.position.clone(), scala: char.model.scale.x, off: decision.offset }
      decision.offset = null
      posaA(decision, t, contactTime)
      const trovato = guantoVicino(verso || zonaPunto(decision.zone))
      g.position.copy(salva.pos); char.model.scale.x = salva.scala; decision.offset = salva.off
      return trovato ? trovato.pos.clone() : null
    },
    // Dove sta il guanto a un istante qualsiasi, con lo spostamento applicato (serve ai test)
    guantoA(decision, t, contactTime, punto) {
      if (!decision || decision.zone == null) return null
      const salva = { pos: g.position.clone(), scala: char.model.scale.x }
      this.renderAt(decision, t, contactTime, false)
      char.mixer.update(0); g.updateMatrixWorld(true)
      const trovato = guantoVicino(punto || _w.set(0, 0, 0))
      g.position.copy(salva.pos); char.model.scale.x = salva.scala
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
      const { k, x } = baseA(decision, t, contactTime)
      const o = decision.offset
      g.position.set(x + (o ? o.x * k : 0), o ? o.y * k : 0, 0.55 + (o ? o.z * k : 0))
      char.model.scale.x = decision.mirror ?? 1
      // il busto si piega verso la palla: l'allungo si legge anche quando lo spostamento è piccolo
      char.setLean(o ? THREE.MathUtils.clamp(-o.x * 0.8, -1, 1) * k : 0)
      const window = Math.max(0.24, contactTime - start + 0.25)
      const u = THREE.MathUtils.clamp((t - start) / window, 0, 1)
      char.scrub(decision.clip, (CLIP_START[decision.clip] || 0) + u * CLIP_SPAN)
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
