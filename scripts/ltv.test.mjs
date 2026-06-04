import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ltv, ltvCacRatio, maxAcquisitionSpend } from './ltv.mjs'
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('ltv = monthly margin / churn (geometric sum)', () => {
  near(ltv({ monthlyMargin: 50, churnRate: 0.1 }), 500)
  assert.throws(() => ltv({ monthlyMargin: 50, churnRate: 0 }), /churn/)
  assert.throws(() => ltv({ monthlyMargin: 50, churnRate: 1.5 }), /churn/)
})

test('ltvCacRatio = ltv / cac', () => {
  near(ltvCacRatio(500, 250), 2)
  assert.throws(() => ltvCacRatio(500, 0), /cac/)
})

test('maxAcquisitionSpend holds a target LTV:CAC', () => {
  near(maxAcquisitionSpend({ ltvValue: 600 }), 200) // default 3:1
  near(maxAcquisitionSpend({ ltvValue: 600, targetRatio: 4 }), 150)
})
