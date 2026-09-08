// Gamification: XP calcolato (mai salvato), livelli, badge
import { missionsFor, levels, badgeDefs, stopById } from './data.js'
import { store } from './store.js'
import { now, BIRTHDAY } from './time.js'

export function xpFor(person) {
  const done = new Set(store.missions)
  return missionsFor(person).filter((m) => done.has(m.id)).reduce((a, m) => a + m.xp, 0)
}
export function maxXpFor(person) { return missionsFor(person).reduce((a, m) => a + m.xp, 0) }
export function doneCountFor(person) { const d = new Set(store.missions); return missionsFor(person).filter((m) => d.has(m.id)).length }

export function levelFor(xp) {
  let cur = levels[0], next = null
  for (let i = 0; i < levels.length; i++) { if (xp >= levels[i].min) { cur = levels[i]; next = levels[i + 1] || null } }
  return { current: cur, next, toNext: next ? next.min - xp : 0 }
}

export function badgeStatus(person, d = now()) {
  const done = new Set(store.missions)
  const mine = missionsFor(person)
  const byDay = {}
  for (const m of mine) { const s = m.stopId ? stopById(m.stopId) : null; if (!s) continue; (byDay[s.dayKey] ||= []).push(m) }
  const trencadis = Object.values(byDay).some((arr) => arr.length && arr.every((m) => done.has(m.id)))
  const state = {
    b_trencadis: trencadis,
    b_festeggiato: person === 'ale' && d >= BIRTHDAY,
    b_baigorri: mine.some((m) => m.id === 'm12') && done.has('m12')
  }
  return badgeDefs.map((b) => ({ ...b, unlocked: !!state[b.id], applies: b.id !== 'b_festeggiato' || person === 'ale' }))
}

export function summaryFor(person) {
  return { person, xp: xpFor(person), done: [...store.missions] }
}
