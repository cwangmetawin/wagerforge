import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bonusBuyCost, rtpParity, decomposeJackpotRtp } from './bonus-buy.mjs'
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('bonusBuyCost = E[feature]/buyVariantRTP', () => {
  near(bonusBuyCost({ expectedFeaturePayout: 10, buyVariantRTP: 0.96 }), 10 / 0.96)
  assert.throws(() => bonusBuyCost({ expectedFeaturePayout: 10, buyVariantRTP: 0 }), /buyVariantRTP/)
})

test('rtpParity flags below-base buy variants', () => {
  assert.equal(rtpParity({ buyVariantRTP: 0.96, baseRTP: 0.96 }).parity, true)
  near(rtpParity({ buyVariantRTP: 0.96, baseRTP: 0.96 }).gap, 0)
  assert.equal(rtpParity({ buyVariantRTP: 0.95, baseRTP: 0.96 }).parity, false)
})

test('decomposeJackpotRtp: advertised = base + meter slice (seed excluded)', () => {
  const d = decomposeJackpotRtp({ baseRTP: 0.92, jackpotMeterRTP: 0.04 })
  near(d.advertisedRTP, 0.96)
  near(d.jackpotContributionRTP, 0.04)
  near(d.baseRTP, 0.92)
})

test('M4: bonusBuyCost rejects infinite payouts and infinite variant RTP', () => {
  assert.throws(() => bonusBuyCost({ expectedFeaturePayout: Infinity, buyVariantRTP: 0.96 }), { name: 'RangeError', message: /expectedFeaturePayout/ })
  assert.throws(() => bonusBuyCost({ expectedFeaturePayout: 10, buyVariantRTP: Infinity }), { name: 'RangeError', message: /buyVariantRTP/ })
})

test('M4: RTP parity cannot be certified from infinite RTP', () => {
  assert.throws(() => rtpParity({ buyVariantRTP: Infinity, baseRTP: 0.96 }), { name: 'RangeError', message: /buyVariantRTP/ })
})

test('M4: jackpot components reject implicit string concatenation', () => {
  assert.throws(() => decomposeJackpotRtp({ baseRTP: 0.92, jackpotMeterRTP: '0.04' }), { name: 'TypeError', message: /jackpotMeterRTP/ })
})

test('bonus-buy functions validate numeric domains and input objects', () => {
  const cases = [
    [bonusBuyCost, { expectedFeaturePayout: 10, buyVariantRTP: 0.96 }],
    [rtpParity, { buyVariantRTP: 0.96, baseRTP: 0.96, tol: 1e-9 }],
    [decomposeJackpotRtp, { baseRTP: 0.92, jackpotMeterRTP: 0.04 }],
  ]
  for (const [call, valid] of cases) {
    for (const args of [undefined, null, [], 1]) assert.throws(() => call(args), TypeError)
    for (const field of Object.keys(valid)) {
      for (const value of [-1, NaN, Infinity, -Infinity, '0.96', null, 1n, ...(field === 'tol' ? [] : [undefined])]) {
        assert.throws(() => call({ ...valid, [field]: value }), {
          name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: new RegExp(field),
        })
      }
    }
  }
  assert.throws(() => rtpParity({ buyVariantRTP: 0, baseRTP: 0.96 }), /buyVariantRTP/)
  assert.equal(bonusBuyCost({ expectedFeaturePayout: 0, buyVariantRTP: 0.96 }), 0)
  assert.equal(decomposeJackpotRtp({ baseRTP: 0, jackpotMeterRTP: 0 }).advertisedRTP, 0)
})

test('RTP parity is an explicit product-policy comparison with tolerance', () => {
  assert.equal(rtpParity({ buyVariantRTP: 0.95, baseRTP: 0.96, tol: 0.01 }).parity, true)
  assert.equal(rtpParity({ buyVariantRTP: 0.95, baseRTP: 0.96, tol: 0 }).parity, false)
})

test('bonus-buy arithmetic overflow fails closed', () => {
  assert.throws(() => bonusBuyCost({ expectedFeaturePayout: Number.MAX_VALUE, buyVariantRTP: Number.MIN_VALUE }), RangeError)
  assert.throws(() => decomposeJackpotRtp({ baseRTP: Number.MAX_VALUE, jackpotMeterRTP: Number.MAX_VALUE }), RangeError)
})
