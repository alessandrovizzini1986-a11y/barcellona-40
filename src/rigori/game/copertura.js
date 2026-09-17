import * as THREE from 'three'
import { REACH, RAGGIO_CAPSULA } from '../data/reach.js'
// ZONA COPERTA DAL PORTIERE: deriva SOLO dalla geometria misurata sul modello (data/reach.js), mai da numeri
// scritti a mano. Per ogni direzione di tuffo la tabella dice dove stanno guanti e spalle a ogni istante del
// tuffo; la zona coperta è l'unione delle capsule di raggio RAGGIO_CAPSULA lungo braccia, busto e gambe.
//
// Un tiro è parato SOLO SE, mentre il tuffo è già almeno al 60 %, la palla passa dentro quella capsula.
// Niente probabilità, niente bonus di difficoltà, niente eccezioni: se il guanto non ci arriva è gol.
export { RAGGIO_CAPSULA }
// Durata del tuffo, costante: il portiere arriva a t_dive + DIVE_DUR. È QUI che si tara la difficoltà,
// insieme a reactionDelay: la zona coperta non si allarga mai. A 0,45 s il tuffo arrivava al 60 % troppo
// tardi rispetto a un volo di 0,41-0,74 s e le parate erano lo 0,6 %.
export const DIVE_DUR = 0.30
export const FRAZIONE_MINIMA = 0.6  // prima di così il tuffo è troppo indietro perché il guanto conti

const _p = new THREE.Vector3(), _ab = new THREE.Vector3(), _ap = new THREE.Vector3()

// Posa misurata a un avanzamento qualsiasi: interpolazione lineare fra i campioni della tabella
// I segmenti con cui il portiere può toccare la palla: il braccio, il busto e la gamba, per lato.
// Sono parti vere del modello, misurate: non è un allargamento della zona, è il resto del corpo.
const CHIAVI = ['L', 'R', 'sL', 'sR', 'aL', 'aR', 'fL', 'fR']
export const SEGMENTI = [['L', 'sL'], ['R', 'sR'], ['sL', 'aL'], ['sR', 'aR'], ['aL', 'fL'], ['aR', 'fR']]
const nuovaPosa = () => Object.fromEntries(CHIAVI.map((k) => [k, new THREE.Vector3()]))
export function posaReach(zona, u, out = nuovaPosa()) {
  const c = REACH[zona]; if (!c) return null
  const x = THREE.MathUtils.clamp(u, 0, 1) * (c.length - 1)
  const i = Math.min(c.length - 2, Math.floor(x)), f = x - i
  for (const k of CHIAVI) {
    const a = c[i][k], b = c[i + 1][k]
    out[k].set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f)
  }
  return out
}
// Altezza del piede più basso a un dato avanzamento (serve ai controlli "piedi a terra")
export function piediA(zona, u) {
  const c = REACH[zona]; if (!c) return 0
  const x = THREE.MathUtils.clamp(u, 0, 1) * (c.length - 1)
  const i = Math.min(c.length - 2, Math.floor(x)), f = x - i
  return c[i].piedi + (c[i + 1].piedi - c[i].piedi) * f
}
// Distanza di un punto dal segmento a→b (la capsula è questo, più il raggio)
export function distanzaSegmento(p, a, b, out = null) {
  _ab.copy(b).sub(a); _ap.copy(p).sub(a)
  const l2 = _ab.lengthSq()
  const t = l2 < 1e-9 ? 0 : THREE.MathUtils.clamp(_ap.dot(_ab) / l2, 0, 1)
  _p.copy(a).addScaledVector(_ab, t)
  if (out) out.copy(_p)
  return _p.distanceTo(p)
}
// Passaggio più vicino fra la palla in volo libero e le capsule della direzione scelta.
// `volo` = { punti: Vector3[], dt }: il volo campionato PRIMA di sapere l'esito.
// Ritorna sempre la misura, anche quando non è parata: serve ai controlli (un gol non deve avere il guanto
// più vicino di RAGGIO_CAPSULA, e una parata non può averlo più lontano).
export function verificaParata({ zona, tDive, volo, tMax }) {
  const fuori = { parata: false, distanza: Infinity, t: 0, guanto: null, punto: null, capsula: null, u: 0 }
  if (zona == null || !REACH[zona] || !volo?.punti?.length) return fuori
  const posa = posaReach(zona, 0)
  const tMin = tDive + FRAZIONE_MINIMA * DIVE_DUR
  let best = fuori
  for (let i = 0; i < volo.punti.length; i++) {
    const t = i * volo.dt
    if (t < tMin) continue
    if (tMax != null && t > tMax + 1e-9) break
    const u = THREE.MathUtils.clamp((t - tDive) / DIVE_DUR, 0, 1)
    posaReach(zona, u, posa)
    const palla = volo.punti[i]
    for (const [a, b] of SEGMENTI) {
      const sulCorpo = new THREE.Vector3()
      const d = distanzaSegmento(palla, posa[a], posa[b], sulCorpo)
      if (d < best.distanza) best = { parata: false, distanza: d, t, guanto: a, punto: palla.clone(), capsula: sulCorpo, u }
    }
  }
  best.parata = best.distanza <= RAGGIO_CAPSULA
  return best
}
// Stessa misura senza il vincolo di tempo: quanto vicino ci è andato il guanto in tutto il volo.
// Serve al controllo (b): nessun gol dove il portiere aveva davvero la palla.
export function distanzaMinima({ zona, tDive, volo, tMax }) {
  if (zona == null || !REACH[zona] || !volo?.punti?.length) return Infinity
  const posa = posaReach(zona, 0)
  let min = Infinity
  for (let i = 0; i < volo.punti.length; i++) {
    const t = i * volo.dt
    if (tMax != null && t > tMax + 1e-9) break
    const u = THREE.MathUtils.clamp((t - tDive) / DIVE_DUR, 0, 1)
    posaReach(zona, u, posa)
    for (const [a, b] of SEGMENTI) {
      const d = distanzaSegmento(volo.punti[i], posa[a], posa[b])
      if (d < min) min = d
    }
  }
  return min
}
