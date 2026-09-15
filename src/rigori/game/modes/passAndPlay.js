import { makeMode } from './base.js'
// Pass-and-play: 2–4 persone sullo stesso telefono. In ogni turno chi para sceglie una zona di nascosto,
// poi passa il telefono a chi tira. Gol = punto al tiratore, parata = punto al portiere.
// DA VERIFICARE: 3 giri per giocatore, scelta mia.
export function createPassAndPlay({ names = ['Ale', 'Monne'], rounds = 3 } = {}) {
  const players = names.map((n) => ({ name: n, goals: 0, saves: 0 }))
  return makeMode({
    id: 'passAndPlay', title: 'Pass-and-play', players, rounds, round: 1, i: 0, keeperZone: null, phase: 'pick', // pick → shoot
    get shooter() { return players[this.i] }, get keeperP() { return players[(this.i + 1) % players.length] },
    start(ctx) { ctx.setDifficulty('normale'); this.round = 1; this.i = 0; this.phase = 'pick' },
    hud(ctx) { ctx.hud(`Giro ${this.round}/${this.rounds} · ${this.shooter.name} tira, ${this.keeperP.name} para`) },
    nextTurn(ctx) {
      if (this.finished) return
      this.hud(ctx)
      if (this.phase === 'pick') {
        ctx.role('idle')
        ctx.pickZone({ who: this.keeperP.name, hidden: true }).then((zone) => { this.keeperZone = zone; this.phase = 'shoot'; ctx.handoff(this.shooter.name).then(() => this.nextTurn(ctx)) })
      } else { ctx.forceKeeperZone(this.keeperZone); ctx.role('shooter') }
    },
    onResult(res, ctx) {
      if (res.result === 'goal') { this.shooter.goals++; ctx.xp(res.corner ? 'corner' : 'goal') }
      else if (res.result === 'save') { this.keeperP.saves++; ctx.xp('save') }
      ctx.forceKeeperZone(null); this.phase = 'pick'
      this.i++; if (this.i >= players.length) { this.i = 0; this.round++ }
      if (this.round > this.rounds) { this.finished = true; ctx.hud('Classifica di serata') }
    },
    leaderboard() { return [...players].map((p) => ({ ...p, points: p.goals + p.saves })).sort((a, b) => b.points - a.points) },
    summary() { return { leaderboard: this.leaderboard(), rounds: this.rounds } }
  })
}
