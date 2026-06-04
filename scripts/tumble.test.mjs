import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cascadeTotal, simulateCascadeRTP } from './tumble.mjs'
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('cascadeTotal compounds the per-wave multiplier', () => {
  // cumMult: 1, 2, 8 -> total = 1*1 + 1*2 + 1*8 = 11
  near(cascadeTotal([{ win: 1, multiplier: 1 }, { win: 1, multiplier: 2 }, { win: 1, multiplier: 4 }]), 11)
  near(cascadeTotal([{ win: 2, multiplier: 1 }]), 2)
  near(cascadeTotal([]), 0)
})

test('simulateCascadeRTP returns convergent Monte-Carlo stats (C6: no closed form)', () => {
  const round = (i) => (i % 2 === 0 ? 0 : 2) // deterministic toy round payout
  const mc = simulateCascadeRTP(round, 10000)
  near(mc.rtp, 1)
  near(mc.hitFreq, 0.5)
  assert.ok(mc.ciHalfWidth > 0)
  assert.ok(Array.isArray(mc.ci) && mc.ci.length === 2)
})
