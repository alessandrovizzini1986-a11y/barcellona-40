import { makeMode, XP } from './base.js'
// Shootout: best of 5 contro Ale, poi sudden death a oltranza. L'utente tira e para a turni alterni.
export function createShootout({ difficulty = 'normale', boss = false } = {}) {
  const m = makeMode({
    id: boss ? 'boss' : 'shootout', title: boss ? 'Boss: Ale in forma' : 'Shootout',
    me: 0, ale: 0, round: 0, turn: 'me', history: [], suddenDeath: false, winner: null,
    start(ctx) { ctx.setDifficulty(boss ? 'boss' : difficulty); this.round = 1; this.turn = 'me'; this.hud(ctx) },
    hud(ctx) { ctx.hud(`${this.suddenDeath ? 'Sudden death' : 'Rigore ' + this.round + ' di 5'} · Tu ${this.me} – ${this.ale} Ale · ${this.turn === 'me' ? 'Tiri tu' : 'Para tu'}`) },
    nextTurn(ctx) {
      if (this.finished) return
      this.hud(ctx)
      if (this.turn === 'me') ctx.role('shooter')
      else { ctx.role('keeper'); ctx.cpuShoot({ strength: boss ? 1.1 : 1 }) }
    },
    onResult(res, ctx) {
      const goal = res.result === 'goal'
      if (this.turn === 'me') { if (goal) { this.me++; ctx.xp(res.corner ? 'corner' : 'goal') } }
      else { if (goal) this.ale++; else if (res.result === 'save') ctx.xp('save') }
      this.history.push({ who: this.turn, result: res.result })
      // fine turno: dopo la coppia di tiri si valuta
      if (this.turn === 'me') { this.turn = 'ale'; return }
      this.turn = 'me'
      const left = 5 - this.round
      const decided = !this.suddenDeath && (this.me > this.ale + left || this.ale > this.me + left)
      if (decided || (this.round >= 5 && this.me !== this.ale)) return this.end(ctx)
      if (this.round >= 5) this.suddenDeath = true
      this.round++
    },
    end(ctx) {
      this.finished = true; this.winner = this.me > this.ale ? 'me' : 'ale'
      if (this.winner === 'me') { ctx.xp('series'); if (boss) ctx.xp('boss') }
      ctx.hud(this.winner === 'me' ? `Hai vinto ${this.me}–${this.ale}` : `Ale vince ${this.ale}–${this.me}`)
    },
    summary() { return { me: this.me, ale: this.ale, winner: this.winner, rounds: this.round, suddenDeath: this.suddenDeath, boss } }
  })
  return m
}
