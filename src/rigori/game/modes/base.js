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
// Dove tira Ale: distribuzione [centro basso/mezza altezza, laterali bassi], il resto va in alto.
//   normale 40 / 35 / 25: al tavolo, con una reazione vicina a 0,25 s, lo Shootout si vince il 33-50 %.
//   boss    25 / 25 / 50: Ale al 75 % (i tiri alti non si parano nemmeno indovinando). Prima il Boss si
//   distingueva solo per la reattività del portiere; così i due gradini di difficoltà sono veri.
// Le capsule del portiere (reach.js) non si toccano: si cambia solo dove va la palla.
export const MIRE = { normale: [0.40, 0.35], boss: [0.25, 0.25] }
export function cpuAim({ avoidCol = null, strength = 1, mix = MIRE.normale } = {}) {
  const [pCentro, pLaterali] = mix
  const cols = [-GOAL.w * 0.348, 0, GOAL.w * 0.348]
  const r = Math.random()
  let col, row, y
  if (r < pCentro) { col = 1; row = 1; y = GOAL.h * (0.22 + Math.random() * 0.33) }            // centro, da basso a mezza altezza
  else if (r < pCentro + pLaterali) { col = Math.random() < 0.5 ? 0 : 2; row = 1; y = GOAL.h * (0.225 + (Math.random() - .5) * 0.143) } // laterali bassi
  else { col = (Math.random() * 3) | 0; row = 0; y = GOAL.h * (0.758 + (Math.random() - .5) * 0.143) }                     // alti
  // se l'utente si è già tuffato durante la rincorsa, 7 volte su 10 Ale cambia colonna
  if (avoidCol != null && Math.random() < 0.7) col = [0, 1, 2].filter((c) => c !== avoidCol)[(Math.random() * 2) | 0]
  const x = cols[col] + (Math.random() - .5) * GOAL.w * 0.082
  const power = 0.65 + Math.random() * 0.4 * strength
  return { x, y, power, curve: (Math.random() - .5) * 0.5, col, row }
}
