// Test della mira della CPU: la distribuzione normale è 40/35/25, quella del Boss 25/25/50, e in Boss metà
// dei tiri va in alto. Math.random viene sostituito con un generatore a seme per avere numeri ripetibili.
//
//   node --test tests/mire.test.js
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { cpuAim, MIRE } from '../src/rigori/game/modes/base.js'
import { makeRng } from '../src/rigori/core/rng.js'
import { GOAL } from '../src/rigori/scene/net.js'

const conta = (mix, n = 4000) => {
  const orig = Math.random; Math.random = makeRng(2026)
  const c = { centro: 0, laterali: 0, alti: 0 }
  try { for (let i = 0; i < n; i++) { const a = cpuAim({ mix }); if (a.row === 0) c.alti++; else if (a.col === 1) c.centro++; else c.laterali++ } }
  finally { Math.random = orig }
  return { centro: c.centro / n, laterali: c.laterali / n, alti: c.alti / n }
}
const vicino = (v, atteso) => assert.ok(Math.abs(v - atteso) < 0.03, `${(v * 100).toFixed(1)} % contro ${atteso * 100} %`)

describe('dove tira Ale', () => {
  test('normale: 40 % centro, 35 % laterali bassi, 25 % alti', () => {
    const d = conta(MIRE.normale); vicino(d.centro, 0.40); vicino(d.laterali, 0.35); vicino(d.alti, 0.25)
  })
  test('senza parametro vale la distribuzione normale', () => {
    const orig = Math.random; Math.random = makeRng(7); const a = cpuAim(); Math.random = makeRng(7); const b = cpuAim({ mix: MIRE.normale }); Math.random = orig
    assert.deepEqual(a, b)
  })
  test('boss: 25 % centro, 25 % laterali bassi, 50 % alti', () => {
    const d = conta(MIRE.boss); vicino(d.centro, 0.25); vicino(d.laterali, 0.25); vicino(d.alti, 0.50)
  })
  test('i tiri alti stanno sotto la traversa e quelli bassi sotto mezza porta', () => {
    const orig = Math.random; Math.random = makeRng(99)
    try {
      for (let i = 0; i < 2000; i++) {
        const a = cpuAim({ mix: MIRE.boss })
        assert.ok(a.y > 0 && a.y < GOAL.h, `y ${a.y}`)
        if (a.row === 0) assert.ok(a.y > GOAL.h * 0.6, `alto a y ${a.y}`); else assert.ok(a.y < GOAL.h * 0.6, `basso a y ${a.y}`)
        assert.ok(Math.abs(a.x) < GOAL.w / 2, `x ${a.x}`)
      }
    } finally { Math.random = orig }
  })
})
