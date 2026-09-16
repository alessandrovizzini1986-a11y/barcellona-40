import { makeMode } from './base.js'
import { zoneCenter } from '../keeper.js'
// Skill: bersagli negli angoli, all'incrocio e sulla traversa; 30 s a tempo. Il portiere resta fermo.
// Punti: angolo alto 3, angolo basso 2, centro 1; centro del bersaglio entro 0,7 m · DA VERIFICARE: punteggi miei.
const TARGETS = [{ zone: 0, pts: 3 }, { zone: 2, pts: 3 }, { zone: 3, pts: 2 }, { zone: 5, pts: 2 }, { zone: 1, pts: 1 }]
export function createSkill({ seconds = 30 } = {}) {
  return makeMode({
    id: 'skill', title: 'Skill', score: 0, shots: 0, hits: 0, timeLeft: seconds, target: null, timerOn: false,
    start(ctx) { ctx.setDifficulty('facile'); ctx.keeperPassive(true); this.timeLeft = seconds; this.timerOn = true; this.pick(ctx) },
    pick(ctx) { const t = TARGETS[(Math.random() * TARGETS.length) | 0]; this.target = { ...t, ...zoneCenter(t.zone) }; ctx.showTarget(this.target) },
    hud(ctx) { ctx.hud(`${Math.ceil(this.timeLeft)} s · ${this.score} punti · bersaglio ${this.target.pts}`) },
    nextTurn(ctx) { if (!this.finished) { this.hud(ctx); ctx.role('shooter') } },
    tick(dt, ctx) { if (!this.timerOn) return; this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.timerOn = false; this.finished = true; ctx.showTarget(null); ctx.keeperPassive(false); ctx.hud(`Tempo! ${this.score} punti`) } else this.hud(ctx) },
    onResult(res, ctx) {
      this.shots++
      if (res.result === 'goal' && res.point && Math.hypot(res.point.x - this.target.x, res.point.y - this.target.y) < 0.7) { this.hits++; this.score += this.target.pts; ctx.xp(this.target.zone < 3 && this.target.zone !== 1 ? 'corner' : 'goal') }
      if (!this.finished) this.pick(ctx); else ctx.hud(`Tempo! ${this.score} punti`) // il tiro partito allo scadere conta: l'HUD lo mostra
    },
    summary() { return { score: this.score, shots: this.shots, hits: this.hits } }
  })
}
