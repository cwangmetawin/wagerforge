import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bonusBreakEvenWR, bonusExpectedCost, isEvPositive } from './bonus.mjs'
import { sessionExceeded, lossLimitBlocks, depositLimitBlocks } from './responsible-gaming.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('bonus: C3-correct expected cost (house edge OFFSETS the give-away)', () => {
  const cost = bonusExpectedCost({ bonus: 100, wageringMultiple: 30, houseEdge: 0.04 })
  near(cost, -20)
  assert.notEqual(cost, 220)
})

test('bonus: break-even wagering multiple = 1/edge', () => {
  near(bonusBreakEvenWR(0.04), 25)
  near(bonusExpectedCost({ bonus: 100, wageringMultiple: 25, houseEdge: 0.04 }), 0)
})

test('bonus: EV-positive iff wagering >= break-even', () => {
  assert.equal(isEvPositive({ wageringMultiple: 30, houseEdge: 0.04 }), true)
  assert.equal(isEvPositive({ wageringMultiple: 20, houseEdge: 0.04 }), false)
})

test('RG: session limit enforced on the SERVER clock (C13)', () => {
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 59 * 60000, limitMs: 60 * 60000 }), false)
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 61 * 60000, limitMs: 60 * 60000 }), true)
  assert.throws(() => sessionExceeded({ sessionStartMs: 5000, nowMs: 1000, limitMs: 1000 }), /monotonic/)
})

test('RG: loss and deposit limits block at the boundary', () => {
  assert.equal(lossLimitBlocks({ lossSoFar: 90, betAmount: 10, lossLimit: 100 }), false)
  assert.equal(lossLimitBlocks({ lossSoFar: 95, betAmount: 10, lossLimit: 100 }), true)
  assert.equal(depositLimitBlocks({ depositedSoFar: 0, amount: 100, depositLimit: 100 }), false)
  assert.equal(depositLimitBlocks({ depositedSoFar: 50, amount: 60, depositLimit: 100 }), true)
})

test('bonus: EV-neutral at exactly break-even is NOT positive', () => {
  assert.equal(isEvPositive({ wageringMultiple: 25, houseEdge: 0.04 }), false) // cost == 0
})

test('bonus: input validation throws', () => {
  assert.throws(() => bonusExpectedCost({ bonus: -1, wageringMultiple: 30, houseEdge: 0.04 }), /bad args/)
  assert.throws(() => bonusBreakEvenWR(0), /houseEdge/)
})

test('bonus: zero house edge means full give-away (no offset)', () => {
  near(bonusExpectedCost({ bonus: 100, wageringMultiple: 30, houseEdge: 0 }), 100)
})

test('RG: session limit blocks at the exact boundary (>=)', () => {
  assert.equal(sessionExceeded({ sessionStartMs: 0, nowMs: 60 * 60000, limitMs: 60 * 60000 }), true)
})
