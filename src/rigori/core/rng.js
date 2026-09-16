// Generatore pseudocasuale con seme (mulberry32): stesso seme → stessa sequenza.
// Serve al tiro deterministico: tutto ciò che è casuale in un rigore viene estratto qui, una volta sola,
// al momento del calcio. Live e replay leggono poi lo stesso record, senza estrarre altri numeri.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Seme nuovo per il prossimo tiro. È l'unico punto in cui il tiro usa Math.random.
export const newSeed = () => (Math.random() * 0xFFFFFFFF) >>> 0
