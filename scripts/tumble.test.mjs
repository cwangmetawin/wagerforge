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

test('a computed cascade total above 2^53 - 1 is refused', () => {
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

test('double totals name the inclusive safe bound and allow zero with any normal multiplier', () => {
  for (const total of [cascadeTotal, tumble.cascadeTotalAbsolute]) {
    assert.equal(total([{ win: Number.MAX_SAFE_INTEGER, multiplier: 1 }]), Number.MAX_SAFE_INTEGER)
    assert.throws(() => total([{ win: Number.MAX_SAFE_INTEGER + 1, multiplier: 1 }]), {
      name: 'RangeError', message: /2\^53 - 1 \(Number.MAX_SAFE_INTEGER\)/,
    })
    for (const multiplier of [2 ** -1022, 0.5, 1, Number.MAX_VALUE]) {
      assert.equal(total([{ win: 0, multiplier }]), 0)
    }
  }
})

const atomTotals = () => [tumble.cascadeTotalAtoms, tumble.cascadeTotalAbsoluteAtoms]

test('exact totals keep STEP separate from the MSS absolute wave ladder', () => {
  // MSS games/zeus/myRtp96MathConfig.ts:127 and gameLogic.ts loadBaseGame:671-673.
  const waves = [1, 2, 3, 5].map((multiplier) => ({ win: 100n, multiplier }))
  assert.equal(tumble.cascadeTotalAtoms(waves), 3900n)
  assert.equal(tumble.cascadeTotalAbsoluteAtoms(waves), 1100n)
  for (const total of atomTotals()) {
    assert.equal(total([]), 0n)
    assert.equal(total([{ win: 0n, multiplier: '1.5' }]), 0n)
  }
})

test('an unknown option is refused, so a misspelt rounding rule cannot change a payment', () => {
  for (const total of atomTotals()) {
    for (const options of [{ roundat: 'total' }, { mode: 'floor' }, { rounding: 'floor', round: 'total' }, { [Symbol('x')]: 1 }]) {
      assert.throws(() => total([{ win: 1n, multiplier: '1.5' }], options), TypeError)
    }
  }
})

test('exact totals default to positive half-up per wave before summation', () => {
  // MSS games/zeus/gameLogic.ts fixValue:170-171, loadBaseGame:672-673 round each wave there; its
  // integer ladder never needs a rounding mode. toFixed rounds the binary double: 0.75 * 1.5 = 1.125 is
  // exact and gives 1.13, but 0.15 * 1.5 = 0.22499999999999998 gives 0.22 where exact half-up gives 23.
  assert.equal(tumble.cascadeTotalAtoms([{ win: 75n, multiplier: '1.5' }, { win: 75n, multiplier: 1 }]), 226n)
  assert.equal(tumble.cascadeTotalAbsoluteAtoms([{ win: 75n, multiplier: '1.5' }, { win: 75n, multiplier: '1.5' }]), 226n)
  for (const total of atomTotals()) {
    assert.equal(total([{ win: 15n, multiplier: '1.5' }]), 23n)
    assert.equal(total([{ win: 1n, multiplier: '1.005' }]), 1n)
    assert.equal(total([{ win: 100n, multiplier: '1.005' }]), 101n)
    assert.equal(total([{ win: 100n, multiplier: '1.004999999999999999999' }]), 100n)
    assert.equal(total([{ win: 100n, multiplier: '1.005000000000000000001' }]), 101n)
  }
})

test('exact totals expose rounding and its location explicitly', () => {
  for (const total of atomTotals()) {
    const half = [{ win: 1n, multiplier: '0.5' }]
    assert.equal(total(half, { rounding: 'floor' }), 0n)
    assert.equal(total(half, { rounding: 'half-up' }), 1n)
    assert.equal(total(half, { rounding: 'half-even' }), 0n)
    assert.equal(total([{ win: 3n, multiplier: '0.5' }], { rounding: 'half-even' }), 2n)
    assert.equal(total([{ win: 5n, multiplier: '0.5' }], { rounding: 'half-even' }), 2n)
    assert.equal(total([{ win: 10n, multiplier: '0.49' }], { rounding: 'half-even' }), 5n)
    assert.equal(total([{ win: 10n, multiplier: '0.51' }], { rounding: 'half-even' }), 5n)
  }
  const step = [{ win: 75n, multiplier: '1.5' }, { win: 75n, multiplier: 1 }]
  const absolute = [{ win: 75n, multiplier: '1.5' }, { win: 75n, multiplier: '1.5' }]
  for (const [total, waves] of [[tumble.cascadeTotalAtoms, step], [tumble.cascadeTotalAbsoluteAtoms, absolute]]) {
    assert.equal(total(waves, { roundAt: 'total' }), 225n)
    assert.equal(total(waves, { rounding: 'floor' }), 224n)
    assert.equal(total(waves, { rounding: 'floor', roundAt: 'total' }), 225n)
    assert.equal(total(waves, { rounding: 'half-even' }), 224n)
    assert.equal(total(waves, { rounding: 'half-even', roundAt: 'total' }), 225n)
  }
  // MSS games/gates/gameLogic.ts loadBaseGame:391 applies one FINAL multiplier to all raw waves.
  // Total rounding does not resolve that multiplier; it must already be supplied for every wave.
  assert.equal(tumble.cascadeTotalAbsoluteAtoms([{ win: 1n, multiplier: 3 }, { win: 2n, multiplier: 3 }], { roundAt: 'total' }), 9n)
})

test('exact STEP factors survive zero waves and are never rounded or underflowed', () => {
  assert.equal(tumble.cascadeTotalAtoms([{ win: 0n, multiplier: '0.5' }, { win: 3n, multiplier: 3 }]), 5n)
  assert.equal(tumble.cascadeTotalAtoms([{ win: 1n, multiplier: '0.5' }, { win: 1n, multiplier: 2 }]), 2n)
  const tiny = `0.${'0'.repeat(999)}1`
  const huge = `1${'0'.repeat(1000)}`
  assert.equal(tumble.cascadeTotalAtoms([{ win: 0n, multiplier: tiny }, { win: 1n, multiplier: huge }]), 1n)
  assert.equal(tumble.cascadeTotalAbsoluteAtoms([{ win: 1n, multiplier: tiny }]), 0n)
})

test('exact totals retain atoms and decimal digits beyond double precision', () => {
  const win = 10n ** 80n + 1n
  for (const total of atomTotals()) {
    assert.equal(total([{ win, multiplier: '0001.5000' }]), (win * 3n + 1n) / 2n)
    assert.equal(total([{ win, multiplier: Number.MAX_SAFE_INTEGER }]), win * BigInt(Number.MAX_SAFE_INTEGER))
    assert.equal(total([{ win, multiplier: '9007199254740993' }]), win * 9007199254740993n)
    assert.equal(total([{ win: 10n ** 30n, multiplier: '0.000000000000000000000000000001' }]), 1n)
  }
})

test('exact totals reject wrong win types and negative atoms', () => {
  for (const total of atomTotals()) {
    for (const win of [1, 0, '1', NaN, Infinity, null, undefined, {}, true]) {
      assert.throws(() => total([{ win, multiplier: 1 }]), { name: 'TypeError', message: /win/ })
    }
    assert.throws(() => total([{ win: -1n, multiplier: 1 }]), { name: 'RangeError', message: /win/ })
  }
})

test('exact multipliers accept only positive plain decimal strings or safe integers', () => {
  for (const total of atomTotals()) {
    for (const multiplier of [NaN, Infinity, -Infinity, -1, 0, -0, 1.5, Number.MAX_SAFE_INTEGER + 1,
      '', '0', '0.000', '-1', '+1', ' 1', '1 ', '1\n', '1e2', '.5', '1.', 'NaN', 'Infinity', '1/2', '0x10']) {
      assert.throws(() => total([{ win: 0n, multiplier }]), { name: 'RangeError', message: /multiplier/ })
    }
    for (const multiplier of [1n, null, undefined, true, {}, new String('1')]) {
      assert.throws(() => total([{ win: 1n, multiplier }]), { name: 'TypeError', message: /multiplier/ })
    }
  }
})

test('exact totals validate plain options and supported rounding rules even for empty waves', () => {
  for (const total of atomTotals()) {
    for (const options of [null, [], 1, 'options', new Date()]) assert.throws(() => total([], options), TypeError)
    for (const rounding of ['ceil', '', null, 1, true]) {
      assert.throws(() => total([], { rounding }), { name: typeof rounding === 'string' ? 'RangeError' : 'TypeError', message: /rounding/ })
    }
    for (const roundAt of ['symbol', '', null, 1, true]) {
      assert.throws(() => total([], { roundAt }), { name: typeof roundAt === 'string' ? 'RangeError' : 'TypeError', message: /roundAt/ })
    }
    assert.equal(total([], Object.create(null)), 0n)
    assert.equal(total([], { rounding: undefined, roundAt: undefined }), 0n)
  }
})

test('exact totals snapshot plain wave and option data without executing input code', () => {
  for (const total of atomTotals()) {
    let runs = 0
    const trap = () => { runs++; throw new Error('input code ran') }
    const wave = { multiplier: 1 }
    Object.defineProperty(wave, 'win', { get: trap })
    const options = {}
    Object.defineProperty(options, 'rounding', { get: trap })
    const array = []
    Object.defineProperty(array, '0', { get: trap })
    for (const waves of [null, {}, 'waves', [null], [1], [[]], [,], [wave], array,
      new Proxy([], { get: trap }), [new Proxy({ win: 1n, multiplier: 1 }, { getPrototypeOf: trap })],
      [Object.create({ win: 1n, multiplier: 1 })]]) assert.throws(() => total(waves), TypeError)
    assert.throws(() => total([], options), /getter or setter/)
    assert.throws(() => total([], new Proxy({}, { getPrototypeOf: trap })), /Proxy/)
    for (const key of ['multiplier', 'roundAt']) {
      const holder = key === 'multiplier' ? { win: 1n } : {}
      Object.defineProperty(holder, key, { get: trap })
      assert.throws(() => key === 'multiplier' ? total([holder]) : total([], holder), /getter or setter/)
    }
    const waves = [Object.assign(Object.create(null), { win: 1n, multiplier: 2 })]
    waves[Symbol.iterator] = trap
    waves.map = trap
    Object.freeze(waves[0])
    Object.freeze(waves)
    assert.equal(total(waves), 2n)
    assert.equal(runs, 0)
  }
})

// Independent oracle: embed every decimal factor in one common integer lattice, without gcds.
function rationalOracle(waves, absolute, { rounding, roundAt }) {
  const factors = waves.map(({ multiplier }) => {
    const [whole, fraction = ''] = String(multiplier).split('.')
    return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)]
  })
  const grid = factors.reduce((product, [, denominator]) => product * denominator, 1n)
  const round = (units) => {
    if (rounding === 'floor') return units / grid
    const up = (2n * units + grid) / (2n * grid)
    return rounding === 'half-even' && (2n * units) % (2n * grid) === grid && up % 2n === 1n ? up - 1n : up
  }
  let numerator = 1n
  let denominator = 1n
  const awards = waves.map(({ win }, i) => {
    numerator = absolute ? factors[i][0] : numerator * factors[i][0]
    denominator = absolute ? factors[i][1] : denominator * factors[i][1]
    return win * numerator * (grid / denominator)
  })
  return roundAt === 'total' ? round(awards.reduce((sum, units) => sum + units, 0n))
    : awards.reduce((sum, units) => sum + round(units), 0n)
}

test('exact totals agree with an independent rational oracle over 10000 random wave tables', () => {
  let state = 0x25ca5cade
  const random = (bound) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state % bound
  }
  const choices = [1, 2, 3, Number.MAX_SAFE_INTEGER, '0.01', '0.5', '1.5', '2.2500',
    '1.005', '0.000000000000000001', '9007199254740993.125']
  for (let sample = 0; sample < 10000; sample++) {
    const waves = Array.from({ length: random(9) }, () => ({
      win: random(5) === 0 ? 0n : BigInt(random(10001)) + (random(2) ? 10n ** 40n : 0n),
      multiplier: choices[random(choices.length)],
    }))
    for (const [total, absolute] of [[tumble.cascadeTotalAtoms, false], [tumble.cascadeTotalAbsoluteAtoms, true]]) {
      for (const rounding of ['floor', 'half-up', 'half-even']) for (const roundAt of ['wave', 'total']) {
        const options = { rounding, roundAt }
        assert.equal(total(waves, options), rationalOracle(waves, absolute, options), `${sample}: ${absolute}, ${rounding}, ${roundAt}`)
      }
    }
  }
})
