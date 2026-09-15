import { makeMode } from './base.js'
// Sfida Ale: tiri infiniti; quanti gol prima che Ale ne pari tre.
export function createSfidaAle({ difficulty = 'normale' } = {}) {
  return makeMode({
    id: 'sfidaAle', title: 'Sfida Ale', goals: 0, saves: 0, shots: 0, best: 0,
    start(ctx) { ctx.setDifficulty(difficulty); this.hud(ctx) },
    hud(ctx) { ctx.hud(`Gol ${this.goals} · Parate di Ale ${this.saves}/3`) },
    nextTurn(ctx) { if (!this.finished) { this.hud(ctx); ctx.role('shooter') } },
    onResult(res, ctx) {
      this.shots++
      if (res.result === 'goal') { this.goals++; ctx.xp(res.corner ? 'corner' : 'goal') }
      else if (res.result === 'save') this.saves++
      if (this.saves >= 3) { this.finished = true; ctx.hud(`Fine: ${this.goals} gol in ${this.shots} tiri`) }
    },
    summary() { return { goals: this.goals, shots: this.shots, saves: this.saves } }
  })
}
