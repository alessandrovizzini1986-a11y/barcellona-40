import { LEVELS, UNLOCKS, BOSS_LEVEL, levelFor, nextLevel } from '../data/unlocks.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
// Progressione: XP (b40:v1:rigori:xp), livelli, sblocchi, traguardi, classifica locale per modalità, equipaggiamento.
// Ascolta gli eventi del gioco (listeners): xp, kick, result, crossbar, modeStart, modeEnd. Non tocca le chiavi del sito.
export function createProgress({ save, listeners, role, shooterName, onLevelUp, onUnlock, onAchievement }) {
  let xp = save.get('xp', 0)
  const done = save.get('achievements', {})            // { id: timestamp }
  const equip = Object.assign({ pallone: 'ball:classico', celebrazione: 'celeb:salto', camera: 'cam:laterale' }, save.get('equip', {}))
  const fresh = []                                     // traguardi sbloccati dall'ultimo takeFresh()
  // stato della partita in corso (per i traguardi)
  let cur = null
  const resetCur = (id) => { cur = { id, t0: performance.now(), myGoals: 0, myShots: 0, aleGoals: 0, keeperSaves: 0, keeperStreak: 0, down02: false, lastKick: null, lastGoalCucchiaio: false, goalTimes: [] } }
  const award = (id) => { if (done[id]) return; done[id] = Date.now(); save.set('achievements', done); const a = ACHIEVEMENTS.find((x) => x.id === id); if (a) { fresh.push(a); onAchievement?.(a) } }
  const addXp = (n) => {
    const before = levelFor(xp); xp += n; save.set('xp', xp)
    const after = levelFor(xp)
    if (after.n > before.n) { onLevelUp?.(after); for (const u of UNLOCKS) if (u.level > before.n && u.level <= after.n) onUnlock?.(u) }
  }
  const isCucchiaio = (aim) => aim && aim.power < 0.55 && aim.y > 1.3 && Math.abs(aim.x) < 1.2
  const onEvent = (e) => {
    if (e.type === 'modeStart') resetCur(e.id)
    if (!cur) return
    if (e.type === 'xp') addXp(e.n)
    if (e.type === 'kick') cur.lastKick = e.aim
    if (e.type === 'crossbar') award('traversa')
    if (e.type === 'result') {
      // chi ha tirato lo dice il record dell'evento, non lo stato del turno (che intanto può essere avanzato)
      const r = e.ruoli ? (e.ruoli.tiratore.utente ? 'shooter' : 'keeper') : role()
      if (r === 'shooter') {
        cur.myShots++
        if (e.result === 'goal') {
          cur.myGoals++; cur.goalTimes.push(performance.now())
          if (e.corner) award('incrocio')
          cur.lastGoalCucchiaio = isCucchiaio(cur.lastKick); if (cur.lastGoalCucchiaio) award('cucchiaio')
          const recent = cur.goalTimes.filter((t) => performance.now() - t <= 40000); if (recent.length >= 5 && (cur.id === 'sfidaAle' || cur.id === 'skill')) award('speedrun')
        } else cur.lastGoalCucchiaio = false
      } else if (r === 'keeper') {
        if (e.result === 'goal') { cur.aleGoals++; cur.keeperStreak = 0 } else if (e.result === 'save') { cur.keeperSaves++; cur.keeperStreak++; if (cur.keeperStreak >= 3) award('muro') } else cur.keeperStreak = 0
      }
      if ((cur.id === 'shootout' || cur.id === 'boss') && cur.myGoals === 0 && cur.aleGoals >= 2) cur.down02 = true
    }
    if (e.type === 'modeEnd') {
      const s = e.summary || {}
      if (cur.id === 'shootout' || cur.id === 'boss') {
        if (s.winner === 'me') { if (cur.down02) award('rimonta'); if (s.suddenDeath && cur.lastGoalCucchiaio) award('disonesto') }
        if (cur.myGoals >= 5 && cur.myShots === 5) award('cinque')
      }
      board(cur.id, s)
      aggiornaStats(s)
      cur = null
    }
  }
  // Statistiche viste dal sito (b40:v1:rigori:stats): gol, parate, partite e record. Sola scrittura qui,
  // sola lettura di là: il gioco non tocca nessuna chiave del sito.
  const statsDefault = { gol: 0, parate: 0, partite: 0, record: 0, vittorie: 0 }
  const aggiornaStats = (s) => {
    const st = Object.assign({}, statsDefault, save.get('stats', {}))
    st.gol += cur.myGoals; st.parate += cur.keeperSaves; st.partite += 1
    if (s.winner === 'me') st.vittorie += 1
    if (cur.myGoals > st.record) st.record = cur.myGoals
    save.set('stats', st)
  }
  listeners.add(onEvent)
  // Classifica locale per modalità: b40:v1:rigori:board:<modo>, dieci voci
  const boardKey = (id) => 'board:' + id
  function board(id, s) {
    const entries = save.get(boardKey(id), [])
    const date = new Date().toISOString().slice(0, 10)
    if (id === 'passAndPlay') for (const p of s.leaderboard || []) entries.push({ name: p.name, score: p.goals + p.saves, label: `${p.goals} gol · ${p.saves} parate`, date })
    else if (id === 'shootout' || id === 'boss') entries.push({ name: shooterName(), score: (s.winner === 'me' ? 100 : 0) + s.me * 10 - s.ale, label: `${s.winner === 'me' ? 'Vinto' : 'Perso'} ${s.me}–${s.ale}`, date })
    else if (id === 'sfidaAle') entries.push({ name: shooterName(), score: s.goals, label: `${s.goals} gol`, date })
    else if (id === 'skill') entries.push({ name: shooterName(), score: s.score, label: `${s.score} punti`, date })
    entries.sort((a, b) => b.score - a.score); save.set(boardKey(id), entries.slice(0, 10))
  }
  const unlocked = (id) => { const u = UNLOCKS.find((x) => x.id === id); return !!u && levelFor(xp).n >= u.level }
  return {
    xp: () => xp,
    level: () => levelFor(xp),
    next: () => nextLevel(xp),
    bossUnlocked: () => levelFor(xp).n >= BOSS_LEVEL,
    unlocked,
    equipped: (kind) => equip[kind],
    setEquip(kind, id) { if (!unlocked(id)) return false; equip[kind] = id; save.set('equip', equip); return true },
    board: (id) => save.get(boardKey(id), []),
    stats: () => Object.assign({}, statsDefault, save.get('stats', {})),
    takeFresh() { const out = fresh.slice(); fresh.length = 0; return out },
    summaryForUi() {
      const lv = levelFor(xp)
      return {
        level: lv, xp, next: nextLevel(xp), levels: LEVELS,
        unlocks: UNLOCKS.map((u) => ({ ...u, unlocked: lv.n >= u.level, rule: `Livello ${u.level}`, equipped: equip[u.kind] === u.id })),
        achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: !!done[a.id] }))
      }
    },
    dispose() { listeners.delete(onEvent) }
  }
}
