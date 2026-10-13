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

test('LTV discounts future margins with the first margin at t=0', () => {
  near(ltv({ monthlyMargin: 50, churnRate: 0.1, discountRate: 0.05 }), 350)
  assert.equal(ltv({ monthlyMargin: 50, churnRate: 0.1, discountRate: 0 }), 500)
  assert.equal(ltv({ monthlyMargin: 50, churnRate: 1, discountRate: 0.5 }), 50)
  assert.ok(ltv({ monthlyMargin: 50, churnRate: 0.1, discountRate: 1 }) < 500)
})

test('M4: LTV cannot propagate NaN or infinity or turn infinite CAC into zero', () => {
  assert.throws(() => ltv({ monthlyMargin: NaN, churnRate: 0.1 }), { name: 'RangeError', message: /monthlyMargin/ })
  assert.throws(() => ltv({ monthlyMargin: 50, churnRate: Infinity }), { name: 'RangeError', message: /churnRate/ })
  assert.throws(() => ltvCacRatio(500, Infinity), { name: 'RangeError', message: /cac/ })
})

test('LTV functions validate finite numeric fields and documented domains', () => {
  const cases = [
    [ltv, { monthlyMargin: 50, churnRate: 0.1, discountRate: 0 }],
    [maxAcquisitionSpend, { ltvValue: 600, targetRatio: 3 }],
  ]
  for (const [call, valid] of cases) {
    for (const args of [undefined, null, [], 1]) assert.throws(() => call(args), TypeError)
    for (const field of Object.keys(valid)) {
      const optional = ['discountRate', 'targetRatio'].includes(field)
      for (const value of [NaN, Infinity, -Infinity, '1', null, 1n, ...(optional ? [] : [undefined])]) {
        assert.throws(() => call({ ...valid, [field]: value }), {
          name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: new RegExp(field),
        })
      }
    }
  }
  for (const ltvValue of [NaN, Infinity, -Infinity, '500', null, undefined]) {
    assert.throws(() => ltvCacRatio(ltvValue, 250), { name: typeof ltvValue === 'number' ? 'RangeError' : 'TypeError', message: /ltvValue/ })
  }
  for (const cac of [0, -1, NaN, Infinity, -Infinity, '250', null, undefined]) {
    assert.throws(() => ltvCacRatio(500, cac), { name: typeof cac === 'number' ? 'RangeError' : 'TypeError', message: /cac/ })
  }
  for (const churnRate of [0, -1, 1.5]) assert.throws(() => ltv({ monthlyMargin: 50, churnRate }), /churnRate/)
  assert.throws(() => ltv({ monthlyMargin: 50, churnRate: 0.1, discountRate: -1 }), /discountRate/)
  for (const targetRatio of [0, -1]) assert.throws(() => maxAcquisitionSpend({ ltvValue: 600, targetRatio }), /targetRatio/)
})

test('LTV preserves signed finite margins and values for loss-making players', () => {
  assert.equal(ltv({ monthlyMargin: -50, churnRate: 0.1 }), -500)
  assert.equal(ltv({ monthlyMargin: 0, churnRate: 0.1 }), 0)
  assert.equal(ltvCacRatio(-500, 250), -2)
  assert.equal(maxAcquisitionSpend({ ltvValue: -600 }), -200)
})

test('LTV handles large finite discount rates and rejects unrepresentable results', () => {
  assert.equal(ltv({ monthlyMargin: 50, churnRate: 0.1, discountRate: Number.MAX_VALUE }), 50)
  assert.throws(() => ltv({ monthlyMargin: Number.MAX_VALUE, churnRate: 0.1 }), RangeError)
  assert.throws(() => ltvCacRatio(Number.MAX_VALUE, Number.MIN_VALUE), RangeError)
  assert.throws(() => maxAcquisitionSpend({ ltvValue: Number.MAX_VALUE, targetRatio: Number.MIN_VALUE }), RangeError)
})

test('LTV preserves representable quotients at tiny finite churn rates', () => {
  const tiny = Number.MIN_VALUE
  assert.equal(ltv({ monthlyMargin: tiny, churnRate: tiny }), 1)
  assert.equal(ltv({ monthlyMargin: 0, churnRate: tiny }), 0)
  assert.equal(ltv({ monthlyMargin: tiny, churnRate: tiny, discountRate: tiny }), 0.5)
})
