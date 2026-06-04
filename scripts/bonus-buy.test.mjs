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
