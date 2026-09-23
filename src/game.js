// Gamification: XP calcolato (mai salvato), livelli, badge
import { missionsFor, levels, badgeDefs, stopById, missionByStop, missions } from './data.js'
import { rigoriXp } from './rigoriLink.js'
import { store } from './store.js'
import { now, BIRTHDAY } from './time.js'
import { evento } from './stats.js'

export function xpFor(person) {
  const done = new Set(store.missions)
  return missionsFor(person).filter((m) => done.has(m.id)).reduce((a, m) => a + m.xp, 0) + xpRigoriBonus()
}
// XP guadagnati nel gioco dei rigori: si sommano al totale del profilo, ma SOLO in lettura.
// Il gioco scrive in b40:v1:rigori:xp, il sito non ci scrive mai e non salva il totale sommato da nessuna parte.
// Vale 1 XP del sito ogni 20 XP del gioco, e al massimo 50: il gioco non deve poter scavalcare le missioni vere.
export const RIGORI_DIVISORE = 20, RIGORI_MAX = 50
export function xpRigoriBonus() { return Math.min(RIGORI_MAX, Math.floor(rigoriXp() / RIGORI_DIVISORE)) }
export function maxXpFor(person) { return missionsFor(person).reduce((a, m) => a + m.xp, 0) + RIGORI_MAX }
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

// Tappa e missione collegata sono uno stato solo. Restituisce la missione toccata (se la persona
// ne fa parte) e se il suo stato è cambiato davvero, così chi chiama mostra toast e coriandoli
// solo alle transizioni reali.
export function setStopDone(stopId, on, person = store.person) {
  store.setDone(stopId, on)
  const m = missionByStop(stopId)
  if (!m || (person && !m.people.includes(person))) return { mission: null, changed: false }
  const was = store.isMissionDone(m.id)
  store.setMission(m.id, on)
  if (on && was !== true) evento('missione-completata')
  return { mission: m, changed: was !== !!on }
}
export function setMissionDone(missionId, on) {
  const m = missions.find((x) => x.id === missionId)
  if (!m) return { mission: null, changed: false }
  const was = store.isMissionDone(m.id)
  store.setMission(m.id, on)
  if (m.stopId) store.setDone(m.stopId, on)
  if (on && was !== true) evento('missione-completata')
  return { mission: m, changed: was !== !!on }
}
