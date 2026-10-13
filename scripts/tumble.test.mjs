import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cascadeTotal, simulateCascadeRTP } from './tumble.mjs'
import * as tumble from './tumble.mjs'
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

test('absolute cascade multipliers apply only to their own wave', () => {
  const waves = [1, 2, 3, 5].map((multiplier) => ({ win: 1, multiplier }))
  assert.equal(tumble.cascadeTotalAbsolute(waves), 11)
  assert.equal(cascadeTotal(waves), 39)
  assert.equal(tumble.cascadeTotalAbsolute([{ win: 2, multiplier: 3 }]), 6)
  assert.equal(tumble.cascadeTotalAbsolute([]), 0)
})

test('cascade modes validate array shape and wave objects', () => {
  for (const total of [cascadeTotal, tumble.cascadeTotalAbsolute]) {
    for (const waves of [null, {}, 'waves', [null], [1], [[]]]) {
      assert.throws(() => total(waves), { name: 'TypeError', message: /wave/ })
    }
  }
})

test('cascade modes reject invalid win and multiplier before arithmetic', () => {
  for (const total of [cascadeTotal, tumble.cascadeTotalAbsolute]) {
    for (const field of ['win', 'multiplier']) {
      for (const value of [NaN, Infinity, -Infinity, '1', null, undefined, 1n, -1]) {
        assert.throws(() => total([{ win: 1, multiplier: 1, [field]: value }]), {
          name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: new RegExp(field),
        })
      }
    }
    assert.throws(() => total([{ win: 1, multiplier: 0 }]), RangeError)
    assert.equal(total([{ win: 0, multiplier: 1 }]), 0)
    assert.equal(total([{ win: 2, multiplier: 0.5 }]), 1)
  }
})

test('cascade modes reject overflowing payouts and running multipliers', () => {
  const max = Number.MAX_VALUE
  assert.throws(() => cascadeTotal([{ win: 0, multiplier: max }, { win: 0, multiplier: 2 }]), RangeError)
  for (const total of [cascadeTotal, tumble.cascadeTotalAbsolute]) {
    assert.throws(() => total([{ win: max, multiplier: 2 }]), RangeError)
    assert.throws(() => total([{ win: max, multiplier: 1 }, { win: max, multiplier: 1 }]), RangeError)
  }
})

test('simulateCascadeRTP delegates sample variance, z and sample validation', () => {
  const result = simulateCascadeRTP((i) => i % 2 ? 2 : 0, 2, { z: 1 })
  assert.equal(result.variance, 2)
  near(result.ciHalfWidth, 1)
  assert.throws(() => simulateCascadeRTP(() => 1, 1), /n/)
  assert.throws(() => simulateCascadeRTP(() => Infinity, 2), /sample/)
  assert.throws(() => simulateCascadeRTP(() => 1, 2, { z: 0 }), /z/)
})

test('cascade totals read each wave by index and refuse a getter before it runs', () => {
  let reads = 0
  const wave = { multiplier: 1 }
  Object.defineProperty(wave, 'win', { enumerable: true, get: () => (++reads === 1 ? 1 : 1000) })
  assert.throws(() => cascadeTotal([wave]), /getter or setter/)
  assert.equal(reads, 0)
  const waves = [{ win: 1, multiplier: 2 }, { win: 1, multiplier: 3 }]
  waves[Symbol.iterator] = function* () { yield { win: 0, multiplier: 1 } }
  assert.equal(cascadeTotal(waves), 2 + 6)
  assert.throws(() => cascadeTotal(new Proxy(waves, {})), /plain array/)
})

test('a cascade total a double cannot hold exactly is refused, never rounded silently', () => {
  const waves = [9007199254740991, 1, 1, 1].map((win) => ({ win, multiplier: 1 }))
  assert.throws(() => tumble.cascadeTotal(waves), RangeError)
  assert.throws(() => tumble.cascadeTotalAbsolute(waves), RangeError)
})

test('a running multiplier or wave award that underflows is refused, never returned as zero', () => {
  // The exact STEP product returns to 1 by the last wave, but 2^-1200 underflows to 0 on the way.
  const steps = [2 ** -600, 2 ** -600, 2 ** 600, 2 ** 600].map((multiplier, i) => ({ win: i === 3 ? 1 : 0, multiplier }))
  assert.throws(() => tumble.cascadeTotal(steps), RangeError)
  assert.throws(() => tumble.cascadeTotalAbsolute([{ win: 2 ** -600, multiplier: 2 ** -600 }]), RangeError)
  assert.equal(tumble.cascadeTotalAbsolute([{ win: 0, multiplier: 2 ** -600 }]), 0)
})
