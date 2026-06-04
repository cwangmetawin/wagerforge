import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rtpFromOutcomes, monteCarlo, requiredN, validateRtp, crashSurvival, crashEV } from './rtp.mjs'
import { fairFloat } from './fair-rng.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('rtpFromOutcomes: fair double-or-nothing', () => {
  const r = rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }])
  near(r.rtp, 1); near(r.houseEdge, 0); near(r.hitFreq, 0.5); near(r.variance, 1); near(r.sd, 1)
})

test('rtpFromOutcomes: a 96% RTP game', () => {
  const r = rtpFromOutcomes([{ p: 0.9, payout: 0 }, { p: 0.1, payout: 9.6 }])
  near(r.rtp, 0.96); near(r.houseEdge, 0.04); near(r.hitFreq, 0.1)
})

test('monteCarlo: deterministic sample array gives exact stats', () => {
  const mc = monteCarlo((i) => (i % 2 === 0 ? 0 : 2), 10000)
  near(mc.rtp, 1); near(mc.hitFreq, 0.5); near(mc.variance, 1); near(mc.sd, 1)
  near(mc.ciHalfWidth, 1.96 * 1 / Math.sqrt(10000))
})

test('monteCarlo: seeded fair-rng sample is reproducible and near true RTP', () => {
  const sample = (i) => (fairFloat('srv', 'cli', i) < 0.5 ? 0 : 2)
  const a = monteCarlo(sample, 20000)
  const b = monteCarlo(sample, 20000)
  assert.equal(a.rtp, b.rtp)
  assert.ok(a.rtp > 0.9 && a.rtp < 1.1, `rtp ${a.rtp}`)
})

test('requiredN: CI-half-width formula', () => {
  assert.equal(requiredN(3, 0.01), 345744)
  assert.equal(requiredN(1, 0.01), 38416)
  assert.throws(() => requiredN(3, 0))
})

test('validateRtp: passes only when within CI AND converged (C4)', () => {
  const sample = (i) => (fairFloat('srv', 'cli', i) < 0.5 ? 0 : 2)
  const ok = validateRtp(sample, 1.0, { n: 50000, tolerance: 0.05 })
  assert.equal(ok.pass, true)
  assert.equal(ok.withinCi, true)
  assert.equal(ok.converged, true)
  const tooFew = validateRtp(sample, 1.0, { n: 100, tolerance: 0.001 })
  assert.equal(tooFew.converged, false)
  assert.equal(tooFew.pass, false)
})

test('crash closed forms: constant edge', () => {
  near(crashSurvival(2, 0.01), 0.495)
  near(crashSurvival(0.5, 0.01), 1)
  near(crashEV(0.04), 0.96)
})

test('rtpFromOutcomes rejects probabilities that do not sum to 1', () => {
  assert.throws(() => rtpFromOutcomes([{ p: 0.5, payout: 2 }]), /sum to 1/)
  assert.throws(() => rtpFromOutcomes([{ p: 0.3, payout: 0 }, { p: 0.3, payout: 2 }]), /sum to 1/)
})

test('monteCarlo rejects n<=0 or non-integer', () => {
  assert.throws(() => monteCarlo(() => 1, 0))
  assert.throws(() => monteCarlo(() => 1, 1.5))
})

test('monteCarlo z parameter widens the CI (99% vs 95%)', () => {
  const a = monteCarlo((i) => (i % 2 ? 2 : 0), 10000)
  const b = monteCarlo((i) => (i % 2 ? 2 : 0), 10000, { z: 2.576 })
  assert.ok(b.ciHalfWidth > a.ciHalfWidth)
})
