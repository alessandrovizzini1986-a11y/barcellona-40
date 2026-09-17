import { makeMode, XP } from './base.js'
// Shootout: best of 5 contro Ale, poi sudden death a oltranza. L'utente tira e para a turni alterni.
export function createShootout({ difficulty = 'normale', boss = false } = {}) {
  const m = makeMode({
    id: boss ? 'boss' : 'shootout', title: boss ? 'Boss: Ale in forma' : 'Shootout',
    me: 0, ale: 0, round: 0, turn: 'me', avanza: false, history: [], suddenDeath: false, winner: null,
    start(ctx) { ctx.setDifficulty(boss ? 'boss' : difficulty); this.round = 1; this.turn = 'me'; this.avanza = false; this.hud(ctx) },
    intestazione() { return this.suddenDeath ? 'Sudden death' : 'Rigore ' + this.round + ' di 5' },
    hud(ctx) { ctx.hud(`${this.intestazione()} · Tu ${this.me} – ${this.ale} Ale · ${this.turn === 'me' ? 'Tiri tu' : 'Para tu'}`) },
    // HUD durante esito e replay: punteggio già aggiornato e che cosa è appena successo, nel turno DEL TIRO
    hudEsito(ctx, res) {
      // i nomi arrivano dal record del tiro: nel turno da portiere il tiratore è l'altro
      const t = res.ruoli?.tiratore?.nome || 'Chi tira', p = res.ruoli?.portiere?.nome || 'Il portiere'
      const cosa = res.result === 'goal' ? `Gol di ${t}` : res.result === 'save' ? `Parata di ${p}`
        : res.result === 'miss' ? `${t} fuori` : res.result === 'crossbar' ? 'Traversa' : 'Palo'
      ctx.hud(`${this.intestazione()} · Tu ${this.me} – ${this.ale} Ale · ${cosa}`)
    },
    nextTurn(ctx) {
      if (this.finished) return
      // il turno avanza qui, a replay finito: durante esito e replay resta quello del tiro appena visto
      if (this.avanza) { this.avanza = false; this.passaTurno(ctx); if (this.finished) return }
      this.hud(ctx)
      if (this.turn === 'me') ctx.role('shooter')
      else { ctx.role('keeper'); ctx.cpuShoot({ strength: boss ? 1.1 : 1 }) }
    },
    onResult(res, ctx) {
      const goal = res.result === 'goal'
      if (this.turn === 'me') { if (goal) { this.me++; ctx.xp(res.corner ? 'corner' : 'goal') } }
      else { if (goal) this.ale++; else if (res.result === 'save') ctx.xp('save') }
      this.history.push({ who: this.turn, result: res.result })
      this.hudEsito(ctx, res)
      this.avanza = true
    },
    passaTurno(ctx) {
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
