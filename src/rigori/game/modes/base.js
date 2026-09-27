import { GOAL } from '../../scene/net.js'
// Contratto delle modalità. Il controller (main.js) chiama:
//   mode.start(ctx) → mode.nextTurn(ctx) finché mode.finished; a ogni esito mode.onResult(res, ctx).
// ctx offre: role(r) per impostare 'shooter' (tira l'utente) o 'keeper' (para l'utente, tira la CPU),
//   cpuShoot({difficulty}) per il tiro della CPU, setDifficulty(d), hud(text), xp(kind), player(), score.
// XP. `tiro` è la partecipazione: ogni tiro dell'utente vale qualcosa, così una partita intera non
// finisce mai con "+0 XP". Gli altri valori sono quelli del prompt originale.
export const XP = { tiro: 5, goal: 10, corner: 25, save: 15, series: 50, boss: 150 }
export function makeMode(def) {
  // Niente spread: copierebbe i getter (shooter, keeperP) come valori fissi
  def.finished = false
  return def
}
// Dove tira Ale (blocco 3): 40 % al centro, basso o a mezza altezza · 35 % laterali bassi · 25 % alti.
// Prima pesava gli angoli (6 volte su 8 ai lati, 45 % in alto) e i tiri alti non si parano nemmeno
// indovinando: Ale segnava il 72-85 %. Le capsule del portiere (reach.js) non si toccano: si cambia dove va la palla.
export function cpuAim({ avoidCol = null, strength = 1 } = {}) {
  const cols = [-GOAL.w * 0.348, 0, GOAL.w * 0.348]
  const r = Math.random()
  let col, row, y
  if (r < 0.40) { col = 1; row = 1; y = GOAL.h * (0.22 + Math.random() * 0.33) }            // centro, da basso a mezza altezza
  else if (r < 0.75) { col = Math.random() < 0.5 ? 0 : 2; row = 1; y = GOAL.h * (0.225 + (Math.random() - .5) * 0.143) } // laterali bassi
  else { col = (Math.random() * 3) | 0; row = 0; y = GOAL.h * (0.758 + (Math.random() - .5) * 0.143) }                     // alti
  // se l'utente si è già tuffato durante la rincorsa, 7 volte su 10 Ale cambia colonna
  if (avoidCol != null && Math.random() < 0.7) col = [0, 1, 2].filter((c) => c !== avoidCol)[(Math.random() * 2) | 0]
  const x = cols[col] + (Math.random() - .5) * GOAL.w * 0.082
  const power = 0.65 + Math.random() * 0.4 * strength
  return { x, y, power, curve: (Math.random() - .5) * 0.5, col, row }
}
