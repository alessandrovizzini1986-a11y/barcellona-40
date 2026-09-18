// GENERATO da scripts/qa/rigori-calibra.mjs — non scrivere questi numeri a mano.
// Spostamento fisso della radice del portiere per ogni direzione di tuffo, in metri:
//   y  di quanto la radice si stacca da terra (solo tuffi; parte e finisce coi piedi a terra, culmine a 4/5).
// Lo spostamento laterale NON sta qui: lo calcola keeper.js dalla larghezza della porta, così resta simmetrico.
// Non dipendono dal tiro: sono una proprietà della direzione, identica a ogni rigore. Raggio capsula 0.25 m.
export const TUFFI = {
  0: { y: 0.5 },   // alto sx
  1: { y: 0 },   // alto centro
  2: { y: 0.5 },   // alto dx
  3: { y: 0.5 },   // basso sx
  4: { y: 0 },   // basso centro
  5: { y: 0.5 }   // basso dx
}
