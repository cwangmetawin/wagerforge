import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rtpFromOutcomes, monteCarlo, requiredN, validateRtp, crashSurvival, crashEV } from './rtp.mjs'
import * as rtp from './rtp.mjs'
import { fairFloat } from './fair-rng.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

const oracleView = new DataView(new ArrayBuffer(8))
const bitsOf = (x) => {
  oracleView.setFloat64(0, x)
  return oracleView.getBigUint64(0)
}
const fromBits = (bits) => {
  oracleView.setBigUint64(0, bits)
  return oracleView.getFloat64(0)
}

// The oracle compares exact distances; it never computes the expected rounded double.
const exact = (x) => {
  const bits = bitsOf(x)
  const biased = Number((bits >> 52n) & 0x7ffn)
  const fraction = bits & 0xfffffffffffffn
  const magnitude = biased === 0 ? fraction : fraction + 0x10000000000000n
  return { n: bits >> 63n ? -magnitude : magnitude, e: magnitude === 0n ? 0 : biased === 0 ? -1074 : biased - 1075 }
}
const sumExact = (a, b) => {
  if (a.n === 0n) return b
  if (b.n === 0n) return a
  const e = Math.min(a.e, b.e)
  return { n: (a.n << BigInt(a.e - e)) + (b.n << BigInt(b.e - e)), e }
}
const negateExact = (x) => ({ n: -x.n, e: x.e })
const subtractExact = (a, b) => sumExact(a, negateExact(b))
const productExact = (a, b) => ({ n: a.n * b.n, e: a.e + b.e })
const compareExact = (a, b) => {
  const difference = subtractExact(a, b).n
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}
const distanceExact = (a, b) => {
  const difference = subtractExact(a, b)
  return { n: difference.n < 0n ? -difference.n : difference.n, e: difference.e }
}
const adjacent = (x, direction) => {
  if (x === 0) return direction * Number.MIN_VALUE
  const step = (x > 0) === (direction > 0) ? 1n : -1n
  return fromBits(bitsOf(x) + step)
}
const evenSignificand = (x) => (bitsOf(x) & 1n) === 0n

const nearestExact = (actual, value, label) => {
  assert.ok(Number.isFinite(actual), `${label}: finite result required`)
  const distance = distanceExact(exact(actual), value)
  for (const direction of [-1, 1]) {
    const neighbour = adjacent(actual, direction)
    if (!Number.isFinite(neighbour)) continue
    const order = compareExact(distance, distanceExact(exact(neighbour), value))
    assert.ok(order < 0 || order === 0 && evenSignificand(actual), `${label}: ${actual} loses to neighbouring ${neighbour}`)
  }
}

// Squared midpoints locate sqrt(value) without rounding either the square root or variance.
const nearestSqrtExact = (actual, value, label) => {
  assert.ok(Number.isFinite(actual) && actual >= 0, `${label}: finite non-negative result required`)
  for (const direction of [-1, 1]) {
    const neighbour = adjacent(actual, direction)
    if (neighbour < 0 || !Number.isFinite(neighbour)) continue
    const sum = sumExact(exact(actual), exact(neighbour))
    const midpoint = { n: sum.n, e: sum.e - 1 }
    const order = compareExact(value, productExact(midpoint, midpoint))
    assert.ok(order * direction < 0 || order === 0 && evenSignificand(actual), `${label}: ${actual} crosses midpoint to ${neighbour}`)
  }
}

const exactTable = (table) => {
  const rows = table.map(({ p, payout }) => ({ p: exact(p), payout: exact(payout) }))
  const zero = exact(0)
  const rtp = rows.reduce((total, row) => sumExact(total, productExact(row.p, row.payout)), zero)
  const houseEdge = subtractExact(exact(1), rtp)
  const hitFreq = rows.reduce((total, row) => row.payout.n > 0n ? sumExact(total, row.p) : total, zero)
  const variance = rows.reduce((total, row) => {
    const deviation = subtractExact(row.payout, rtp)
    return sumExact(total, productExact(row.p, productExact(deviation, deviation)))
  }, zero)
  return { rtp, houseEdge, hitFreq, variance }
}
const correctlyRoundedTable = (table, label) => {
  const actual = rtpFromOutcomes(table)
  const expected = exactTable(table)
  for (const key of ['rtp', 'houseEdge', 'hitFreq', 'variance']) nearestExact(actual[key], expected[key], `${label} ${key}`)
  nearestSqrtExact(actual.sd, expected.variance, `${label} sd`)
}

test('rtpFromOutcomes keeps the exact sum through every row order', () => {
  const table = [{ p: 0.5, payout: 2 }, { p: 2 ** -54, payout: 2 }, { p: 2 ** -54, payout: 2 }, { p: 0.5 - 2 ** -53, payout: 0 }]
  const visit = (prefix, remaining) => {
    if (!remaining.length) {
      assert.equal(rtpFromOutcomes(prefix).rtp, 1 + 2 ** -52)
      correctlyRoundedTable(prefix, 'row permutation')
      return
    }
    for (let i = 0; i < remaining.length; i++) visit([...prefix, remaining[i]], remaining.filter((_, j) => i !== j))
  }
  visit([], table)
})

test('rtpFromOutcomes rounds subnormal sums once, including ties to even', () => {
  const minimum = Number.MIN_VALUE
  assert.equal(rtpFromOutcomes([{ p: 0.5, payout: minimum }, { p: 0.5, payout: minimum }]).rtp, minimum)
  for (const [multiplier, sd] of [[1, 0], [3, 2], [5, 2], [7, 4]]) {
    const table = [{ p: 0.5, payout: multiplier * minimum }, { p: 0.5, payout: 0 }]
    assert.equal(rtpFromOutcomes(table).sd, sd * minimum)
    correctlyRoundedTable(table, 'subnormal midpoint')
  }
})

test('rtpFromOutcomes computes house edge and sd from exact values before rounding', () => {
  correctlyRoundedTable([{ p: 0.5, payout: 1 }, { p: 0.5, payout: 1 + 2 ** -52 }], 'mean midpoint')
  correctlyRoundedTable([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2e-200 }], 'variance underflow')
  correctlyRoundedTable([{ p: 1 - 2 ** -30, payout: 1 }], 'deficient probability sum')
  const minimum = rtpFromOutcomes([{ p: 1, payout: 1 }, { p: Number.MIN_VALUE, payout: 1 }])
  assert.deepEqual(minimum, { rtp: 1, houseEdge: -Number.MIN_VALUE, hitFreq: 1, variance: 0, sd: Number.MIN_VALUE })
})

test('rtpFromOutcomes checks the exact probability tolerance boundary', () => {
  const table = (p) => [{ p: 0.5, payout: 0 }, { p: 0.5, payout: 0 }, { p, payout: 0 }]
  assert.doesNotThrow(() => rtpFromOutcomes(table(1e-9)))
  assert.doesNotThrow(() => rtpFromOutcomes(table(adjacent(1e-9, -1))))
  assert.throws(() => rtpFromOutcomes(table(adjacent(1e-9, 1))), /sum to 1/)
  assert.throws(() => rtpFromOutcomes([...table(1e-9), { p: Number.MIN_VALUE, payout: 0 }]), /sum to 1/)
})

test('rtpFromOutcomes rejects an exact result above MAX_VALUE even when it would round down', () => {
  correctlyRoundedTable([{ p: 1, payout: Number.MAX_VALUE }], 'finite maximum')
  assert.throws(() => rtpFromOutcomes([{ p: 1, payout: Number.MAX_VALUE }, { p: Number.MIN_VALUE, payout: Number.MAX_VALUE }]), RangeError)
})

test('rtpFromOutcomes is correctly rounded for 10,000 seeded tables', () => {
  let state = 0x6d2b79f5
  const random = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }
  const payoutFor = (profile) => {
    if (random() % 8 === 0) return 0
    const fraction = BigInt(random() & 0xfffff) << 32n | BigInt(random())
    if (profile === 3) return fromBits(fraction)
    const exponent = profile === 0 ? random() % 31 - 10
      : profile === 1 ? random() % 601 - 100
        : profile === 2 ? random() % 503 - 1022
          : random() % 1523 - 1022
    return fromBits(BigInt(exponent + 1023) << 52n | fraction)
  }
  for (let i = 0; i < 10000; i++) {
    const count = random() % 20 + 1
    const cuts = [0, 2 ** 20]
    for (let j = 1; j < count; j++) cuts.push(random() % (2 ** 20 + 1))
    cuts.sort((a, b) => a - b)
    const profile = i % 5
    const table = Array.from({ length: count }, (_, j) => ({ p: (cuts[j + 1] - cuts[j]) / 2 ** 20, payout: payoutFor(profile) }))
    if (count > 1 && i % 3 !== 0) {
      const row = table.find(({ p }) => p > 0 && p < 1)
      if (row) row.p += i % 3 === 1 ? 2 ** -32 : -(2 ** -32)
    }
    correctlyRoundedTable(table, `seeded table ${i}`)
  }
})

test('rtpFromOutcomes: fair double-or-nothing', () => {
  const r = rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }])
  near(r.rtp, 1)
  near(r.houseEdge, 0)
  near(r.hitFreq, 0.5)
  near(r.variance, 1)
  near(r.sd, 1)
})

test('rtpFromOutcomes: a 96% RTP game', () => {
  const r = rtpFromOutcomes([{ p: 0.9, payout: 0 }, { p: 0.1, payout: 9.6 }])
  near(r.rtp, 0.96)
  near(r.houseEdge, 0.04)
  near(r.hitFreq, 0.1)
})

test('enumerated variance is population variance, including losses and zero-probability outcomes', () => {
  assert.equal(rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }]).variance, 1)
  assert.equal(rtpFromOutcomes([{ p: 1, payout: 1 }, { p: 0, payout: Number.MAX_VALUE }]).variance, 0)
})

test('monteCarlo: deterministic sample array gives exact stats', () => {
  const mc = monteCarlo((i) => (i % 2 === 0 ? 0 : 2), 10000)
  const variance = 10000 / 9999 // Sample variance estimates an unknown population variance.
  near(mc.rtp, 1)
  near(mc.hitFreq, 0.5)
  near(mc.variance, variance)
  near(mc.sd, Math.sqrt(variance))
  near(mc.ciHalfWidth, 1.96 * Math.sqrt(variance) / Math.sqrt(10000))
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

test('validateRtp: passes when equivalent AND converged (C4)', () => {
  const sample = (i) => (fairFloat('srv', 'cli', i) < 0.5 ? 0 : 2)
  const ok = validateRtp(sample, 1.0, { n: 50000, tolerance: 0.05, modelSd: 1 })
  assert.equal(ok.pass, true)
  assert.equal(ok.withinCi, true)
  assert.equal(ok.converged, true)
  assert.equal(ok.equivalent, true)
  assert.equal(ok.reason, 'pass')
  const tooFew = validateRtp(sample, 1.0, { n: 100, tolerance: 0.001, modelSd: 1 })
  assert.equal(tooFew.converged, false)
  assert.equal(tooFew.pass, false)
  assert.equal(tooFew.reason, 'not_converged')
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

const invalidNumbers = [NaN, Infinity, -Infinity, '1', null, undefined, 1n]
const rejectsNumbers = (call, field, values = invalidNumbers) => {
  for (const value of values) {
    assert.throws(() => call(value), {
      name: typeof value === 'number' ? 'RangeError' : 'TypeError',
      message: new RegExp(field),
    })
  }
}
const alternating = (i) => (i % 2 ? 2 : 0)

test('M1: Welford preserves variance under a large location shift', () => {
  const mc = monteCarlo((i) => 1e8 + (i % 2), 10000)
  near(mc.rtp, 1e8 + 0.5)
  near(mc.variance, 0.25 * 10000 / 9999)
  near(mc.sd, Math.sqrt(0.25 * 10000 / 9999))
  near(mc.ciHalfWidth, 1.96 * mc.sd / 100)
  assert.ok(mc.ci[0] < mc.rtp && mc.ci[1] > mc.rtp)
})

test('M2: one sample cannot certify RTP', () => {
  assert.throws(() => validateRtp(() => 2, 2, { n: 1, tolerance: 1e-6 }), /n/)
})

test('M2: a zero z cannot certify RTP', () => {
  assert.throws(() => validateRtp(alternating, 1, { n: 2, tolerance: 0.001, z: 0 }), /z/)
})

test('M2: zero observed variance needs an explicit zero-variance model', () => {
  const opts = { n: 20, tolerance: 0.01 }
  const observed = validateRtp(() => 2, 2, opts)
  assert.equal(observed.pass, false)
  assert.equal(observed.equivalent, true)
  assert.equal(observed.reason, 'zero_variance')
  assert.equal(validateRtp(() => 2, 2, { ...opts, modelSd: 1 }).reason, 'zero_variance')
  const proven = validateRtp(() => 2, 2, { ...opts, modelSd: 0 })
  assert.equal(proven.pass, true)
  assert.equal(proven.reason, 'pass')
})

test('M3: a target inside the CI is not an equivalence certificate', () => {
  const result = validateRtp(alternating, 0.9875, { n: 10000, tolerance: 0.02, modelSd: 1 })
  assert.equal(result.pass, false)
  assert.equal(result.withinCi, true)
  assert.equal(result.converged, true)
  assert.equal(result.equivalent, false)
  assert.equal(result.reason, 'not_equivalent')
})

test('M3: withinCi is informational and equivalence includes its boundary', () => {
  const result = validateRtp(alternating, 0.97, { n: 10000, tolerance: 0.06, modelSd: 1 })
  assert.equal(result.withinCi, false)
  assert.equal(result.equivalent, true)
  assert.equal(result.pass, true)
  // The comparison is inclusive, and the distance includes the mean's rounding bound: a tolerance
  // equal to that distance passes, one equal to the bare half-width does not.
  const { ciHalfWidth, meanError } = monteCarlo(alternating, 2)
  const edge = (ciHalfWidth + meanError) * (1 + 2 * Number.EPSILON)
  assert.equal(validateRtp(alternating, 1, { n: 2, tolerance: edge, modelSd: 1 }).pass, true)
  assert.equal(validateRtp(alternating, 1, { n: 2, tolerance: ciHalfWidth, modelSd: 1 }).pass, false)
})

test('a rare jackpot the sample never saw cannot certify RTP without a variance bound', () => {
  // Pays 2^20 with probability 2^-20, otherwise 0.95 or 0.97: true RTP ~1.96, yet 10,000 draws
  // usually miss the jackpot and look like a tight 0.96.
  const jackpot = (i) => (fairFloat('rare', 'jackpot', i) < 2 ** -20 ? 2 ** 20 : i % 2 ? 0.97 : 0.95)
  const opts = { n: 10000, tolerance: 0.001 }
  const unbounded = validateRtp(jackpot, 0.96, opts)
  assert.equal(unbounded.equivalent, true)
  assert.equal(unbounded.converged, false)
  assert.equal(unbounded.pass, false)
  assert.equal(unbounded.reason, 'variance_bound_required')
  assert.equal(validateRtp(jackpot, 0.96, { ...opts, maxPayout: 2 ** 20 }).reason, 'not_converged')
  assert.equal(validateRtp(jackpot, 0.96, { ...opts, modelSd: 1024 }).reason, 'not_converged')
})

test('maxPayout bounds the sd by Popoviciu (sd <= maxPayout / 2) and must hold for every sample', () => {
  const opts = { tolerance: 0.05, z: 1.96 }
  // A fair 0/2 coin: maxPayout 2 bounds sd by 1, so requiredN(1, 0.05) = 1537 <= 4000 samples.
  assert.equal(validateRtp(alternating, 1, { ...opts, n: 4000, maxPayout: 2 }).pass, true)
  // A looser bound (maxPayout 4, sd <= 2) needs requiredN(2, 0.05) = 6147: the CI is already narrow
  // enough, but the declared tail could still be unsampled.
  const loose = validateRtp(alternating, 1, { ...opts, n: 4000, maxPayout: 4 })
  assert.ok(loose.ciHalfWidth <= 0.05)
  assert.equal(loose.reason, 'not_converged')
  assert.throws(() => validateRtp(alternating, 1, { ...opts, n: 10, maxPayout: 1 }), /maxPayout/)
  assert.throws(() => validateRtp(() => -1, 1, { ...opts, n: 10, maxPayout: 2 }), /maxPayout/)
})

test('the rarest paying event must be expected at least 30 times before RTP can pass', () => {
  // Pays 100 once every 1000 rounds, 0.9 otherwise: RTP 0.9991, sd ~3.13.
  const rare = (i) => (i % 1000 === 0 ? 100 : 0.9)
  const opts = { tolerance: 0.1, modelSd: 3.14 }
  assert.equal(validateRtp(rare, 0.9991, { ...opts, n: 10000 }).pass, true)
  const floor = { ...opts, minEventProbability: 0.001 }
  assert.equal(validateRtp(rare, 0.9991, { ...floor, n: 10000 }).reason, 'not_converged')
  assert.equal(validateRtp(rare, 0.9991, { ...floor, n: 30000 }).pass, true)
  for (const p of [0, -0.1, 1.5, NaN]) assert.throws(() => validateRtp(rare, 1, { ...floor, n: 10, minEventProbability: p }), RangeError)
  assert.throws(() => validateRtp(rare, 1, { ...floor, n: 10, minEventProbability: '0.1' }), TypeError)
})

test('validateRtp requires enough samples for the supplied modelSd', () => {
  const sample = (i) => (i % 2 ? 0.01 : 0)
  const opts = { tolerance: 0.1, z: 1, modelSd: 1 }
  const short = validateRtp(sample, 0.005, { ...opts, n: 99 })
  assert.equal(short.equivalent, true)
  assert.equal(short.converged, false)
  assert.equal(short.pass, false)
  assert.equal(short.reason, 'not_converged')
  assert.equal(validateRtp(sample, 0.005, { ...opts, n: 100 }).pass, true)
})

test('M4: outcome probabilities reject negative, over-one and NaN values', () => {
  assert.throws(() => rtpFromOutcomes([{ p: -1, payout: 0 }, { p: 2, payout: 1 }]), { name: 'RangeError', message: /p/ })
  rejectsNumbers((p) => rtpFromOutcomes([{ p, payout: 1 }]), 'p')
})

test('rtpFromOutcomes validates shape, payout and probability sum tolerance', () => {
  for (const outcomes of [null, {}, 'outcomes', [null], [1]]) {
    assert.throws(() => rtpFromOutcomes(outcomes), TypeError)
  }
  assert.throws(() => rtpFromOutcomes([]), { name: 'RangeError', message: /non-empty/ })
  rejectsNumbers((payout) => rtpFromOutcomes([{ p: 1, payout }]), 'payout')
  assert.throws(() => rtpFromOutcomes([{ p: 1, payout: -1 }]), RangeError)
  assert.doesNotThrow(() => rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5 - 5e-10, payout: 2 }]))
  assert.throws(() => rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5 - 2e-9, payout: 2 }]), /sum to 1/)
  const result = rtpFromOutcomes([{ p: 0.2, payout: 0 }, { p: 0.3, payout: 1 }, { p: 0.5, payout: 4 }])
  near(result.rtp, 2.3)
  near(result.variance, 3.01)
  near(result.sd, Math.sqrt(3.01))
})

test('M4: monteCarlo rejects non-finite and non-number samples', () => {
  rejectsNumbers((sample) => monteCarlo(() => sample, 2), 'sample')
})

test('monteCarlo validates functions, safe n and positive finite z before sampling', () => {
  let calls = 0
  const sample = () => {
    calls++
    return 1
  }
  rejectsNumbers((n) => monteCarlo(sample, n), 'n')
  for (const n of [0, 1, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => monteCarlo(sample, n), { name: 'RangeError', message: /n/ })
  }
  rejectsNumbers((z) => monteCarlo(sample, 2, { z }), 'z', invalidNumbers.filter((v) => v !== undefined))
  for (const z of [0, -1]) assert.throws(() => monteCarlo(sample, 2, { z }), RangeError)
  assert.equal(calls, 0)
  assert.throws(() => monteCarlo(null, 2), { name: 'TypeError', message: /sampleFn/ })
  for (const opts of [null, [], 1]) assert.throws(() => monteCarlo(sample, 2, opts), TypeError)
})

test('M4: requiredN rejects infinite tolerance', () => {
  assert.throws(() => requiredN(1, Infinity), { name: 'RangeError', message: /tolerance/ })
})

test('requiredN validates sd, tolerance and z domains', () => {
  rejectsNumbers((sd) => requiredN(sd, 0.01), 'sdPerSpin')
  rejectsNumbers((tol) => requiredN(1, tol), 'tolerance')
  rejectsNumbers((z) => requiredN(1, 0.01, z), 'z', invalidNumbers.filter((v) => v !== undefined))
  for (const z of [0, -1]) assert.throws(() => requiredN(1, 0.01, z), RangeError)
  assert.throws(() => requiredN(-1, 0.01), RangeError)
  assert.throws(() => requiredN(1, -1), RangeError)
  assert.equal(requiredN(0, 0.01), 1)
})

test('validateRtp validates target, tolerance and modelSd before sampling', () => {
  let calls = 0
  const sample = () => {
    calls++
    return 1
  }
  const opts = { n: 2, tolerance: 0.1 }
  rejectsNumbers((target) => validateRtp(sample, target, opts), 'targetRtp')
  rejectsNumbers((tolerance) => validateRtp(sample, 1, { ...opts, tolerance }), 'tolerance')
  rejectsNumbers((modelSd) => validateRtp(sample, 1, { ...opts, modelSd }), 'modelSd', invalidNumbers.filter((v) => v !== undefined))
  rejectsNumbers((maxPayout) => validateRtp(sample, 1, { ...opts, maxPayout }), 'maxPayout', invalidNumbers.filter((v) => v !== undefined))
  assert.throws(() => validateRtp(sample, 1, { ...opts, maxPayout: -1 }), RangeError)
  for (const tolerance of [0, -1]) assert.throws(() => validateRtp(sample, 1, { ...opts, tolerance }), RangeError)
  assert.throws(() => validateRtp(sample, 1, { ...opts, modelSd: -1 }), RangeError)
  for (const invalid of [null, [], 1]) assert.throws(() => validateRtp(sample, 1, invalid), TypeError)
  assert.equal(calls, 0)
})

test('M5: crash survival includes the instabust atom at exactly one', () => {
  assert.equal(crashSurvival(1, 0.04), 1)
  assert.equal(crashSurvival(Number.MIN_VALUE, 0.04), 1)
  near(crashSurvival(1.01, 0.04), 0.96 / 1.01)
})

test('M5: crash cash-out RTP excludes target one and accounts for payout caps', () => {
  assert.equal(rtp.crashTargetRTP(2, 0.04), 0.96)
  assert.equal(rtp.crashTargetRTP(2, 0.04, { capMultiplier: Infinity }), 0.96)
  assert.equal(rtp.crashTargetRTP(2, 0.04, { capMultiplier: 2 }), 0.96)
  assert.equal(rtp.crashTargetRTP(10, 0.04, { capMultiplier: 5 }), 0.48)
  assert.equal(rtp.crashTargetRTP(2, 0.04, { capMultiplier: 0 }), 0)
  for (const target of [1, 0.5, 0, -1]) assert.throws(() => rtp.crashTargetRTP(target, 0.04), /target.*1/)
})

test('crash functions validate house edge, survival x, target and cap', () => {
  for (const call of [(h) => crashSurvival(2, h), crashEV, (h) => rtp.crashTargetRTP(2, h)]) {
    rejectsNumbers(call, 'houseEdge')
    for (const h of [-1, 1, 2]) assert.throws(() => call(h), RangeError)
  }
  rejectsNumbers((x) => crashSurvival(x, 0.04), 'x')
  for (const x of [0, -1]) assert.throws(() => crashSurvival(x, 0.04), RangeError)
  rejectsNumbers((target) => rtp.crashTargetRTP(target, 0.04), 'target')
  for (const capMultiplier of [NaN, -Infinity, -1, '2', null]) {
    assert.throws(() => rtp.crashTargetRTP(2, 0.04, { capMultiplier }), {
      name: typeof capMultiplier === 'number' ? 'RangeError' : 'TypeError', message: /capMultiplier/,
    })
  }
  for (const opts of [null, [], 1]) assert.throws(() => rtp.crashTargetRTP(2, 0.04, opts), TypeError)
})

test('RTP arithmetic overflow fails closed', () => {
  assert.throws(() => rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5, payout: Number.MAX_VALUE }]), RangeError)
  assert.throws(() => monteCarlo((i) => i ? -Number.MAX_VALUE : Number.MAX_VALUE, 2), RangeError)
  assert.throws(() => requiredN(Number.MAX_VALUE, 1), RangeError)
})

test('a PASS allows for rounding in the running mean: a tolerance finer than double precision cannot pass', () => {
  // Equal numbers of 1 and the next double up: the exact mean is 1 + 2^-53, the running mean rounds to 1.
  const result = validateRtp((i) => (i % 2 === 0 ? 1 : 1 + 2 ** -52), 1, { n: 1000, tolerance: 1e-17, modelSd: 2 ** -53 })
  assert.equal(result.pass, false)
  assert.equal(result.reason, 'not_equivalent')
  assert.ok(result.meanError > 0)
})

test('sample sizes are exact: the true ratio is rounded up, never a rounded one', () => {
  // z*sd = 2 + 2^-52 - 2^-104 exactly, so (z*sd/1)^2 > 4 and five samples are needed; floating point says 4.
  assert.equal(requiredN(2 - 2 ** -52, 1, 1 + 2 ** -52), 5)
  assert.equal(validateRtp((i) => (i % 2 ? 0.01 : 0), 0.005, { n: 4, tolerance: 1, z: 1 + 2 ** -52, modelSd: 2 - 2 ** -52 }).reason, 'not_converged')
  // No intermediate overflow: (2 * 1e308 / 1e308)^2 = 4.
  assert.equal(requiredN(1e308, 1e308, 2), 4)
  assert.equal(requiredN(1, 0.01, 3), 90000)
  // The double nearest 30/33 is below it, so 33 rounds expect fewer than 30 hits: 34 are needed.
  const rare = (n) => validateRtp(() => 1, 1, { n, tolerance: 0.1, modelSd: 0, minEventProbability: 30 / 33 })
  assert.equal(rare(33).reason, 'not_converged')
  assert.equal(rare(34).pass, true)
})

test('a declared zero model sd that the sample contradicts throws, like a sample outside maxPayout', () => {
  assert.throws(() => validateRtp((i) => (i % 2 === 0 ? 0 : 2), 1, { n: 2, tolerance: 2, modelSd: 0 }), RangeError)
})

test('modelSd 0 is refused whenever the sample varies, even when the computed variance rounds to 0', () => {
  assert.throws(() => validateRtp((i) => (i ? 1e-200 : 0), 5e-201, { n: 2, tolerance: 1e-200, modelSd: 0 }), RangeError)
  assert.throws(() => validateRtp((i) => (i ? 1 : 1 - 2 ** -53), 1, { n: 2, tolerance: 0.1, modelSd: 0 }), RangeError)
  assert.equal(validateRtp(() => 1, 1, { n: 2, tolerance: 0.1, modelSd: 0 }).pass, true)
})

test('rtpFromOutcomes reads its input by index and refuses a getter before it runs', () => {
  let reads = 0
  const outcome = { p: 1 }
  Object.defineProperty(outcome, 'payout', { enumerable: true, get: () => ++reads })
  assert.throws(() => rtpFromOutcomes([outcome]), /getter or setter/)
  assert.equal(reads, 0)
  const table = [{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }]
  table[Symbol.iterator] = function* () { yield { p: 1, payout: 0 } }
  assert.equal(rtpFromOutcomes(table).rtp, 1)
})

// A getter is code: this one would swap the iterator of every array before the sums run.
test('a getter in the table cannot swap built-in iterators and change the sums', () => {
  const original = Array.prototype[Symbol.iterator]
  const outcome = { p: 1 }
  Object.defineProperty(outcome, 'payout', { enumerable: true, get() { Array.prototype[Symbol.iterator] = function* () { yield { p: 1, payout: 700 } }; return 1 } })
  let result
  try {
    result = rtpFromOutcomes([outcome])
  } catch (error) {
    result = error
  } finally {
    Array.prototype[Symbol.iterator] = original
  }
  assert.ok(result instanceof TypeError && /getter or setter/.test(result.message), JSON.stringify(result))
})

test('rtpFromOutcomes refuses a Proxy table, which could hide outcomes behind a plausible length', () => {
  assert.throws(() => rtpFromOutcomes(new Proxy([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }], {})), /plain array/)
})

test('requiredN never rounds a sample size above 2^53 down', () => {
  // (94906265.74)^2 rounds up to 9007199276711497, which is odd; the nearest double is one below it.
  assert.ok(BigInt(requiredN(94906265.74, 1, 1)) >= 9007199276711497n)
  // ceil(1 / 3e-10 ** 2) is 11111111111111111259 exactly; the nearest double is 603 below it.
  assert.ok(BigInt(requiredN(1, 3e-10, 1)) >= 11111111111111111259n)
})

test('requiredN above 2^53 returns the least double at or above the exact count', () => {
  // 120000001^2 = 14400000240000001 exactly; doubles there are 2 apart, so the answer is ...002.
  assert.equal(requiredN(120000001, 1, 1), 14400000240000002)
})
