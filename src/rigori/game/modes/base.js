import { GOAL } from '../../scene/net.js'
// Contratto delle modalità. Il controller (main.js) chiama:
//   mode.start(ctx) → mode.nextTurn(ctx) finché mode.finished; a ogni esito mode.onResult(res, ctx).
// ctx offre: role(r) per impostare 'shooter' (tira l'utente) o 'keeper' (para l'utente, tira la CPU),
//   cpuShoot({difficulty}) per il tiro della CPU, setDifficulty(d), hud(text), xp(kind), player(), score.
export const XP = { goal: 10, corner: 25, save: 15, series: 50, boss: 150 } // da prompt
export function makeMode(def) {
  // Niente spread: copierebbe i getter (shooter, keeperP) come valori fissi
  def.finished = false
  return def
}
// Zona con peso verso gli angoli, per il tiro della CPU · DA VERIFICARE: distribuzione mia
export function cpuAim({ avoidCol = null, strength = 1 } = {}) {
  const cols = [-GOAL.w * 0.348, 0, GOAL.w * 0.348], rows = [GOAL.h * 0.758, GOAL.h * 0.225]
  let col = [0, 0, 1, 1, 2, 2, 0, 2][(Math.random() * 8) | 0]
  if (avoidCol != null && Math.random() < 0.7) col = [0, 1, 2].filter((c) => c !== avoidCol)[(Math.random() * 2) | 0]
  const row = Math.random() < 0.45 ? 0 : 1
  const x = cols[col] + (Math.random() - .5) * GOAL.w * 0.082, y = rows[row] + (Math.random() - .5) * GOAL.h * 0.143
  const power = 0.65 + Math.random() * 0.4 * strength
  return { x, y, power, curve: (Math.random() - .5) * 0.5, col, row }
}
