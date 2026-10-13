import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sessionExceeded, lossLimitBlocks, depositLimitBlocks } from './responsible-gaming.mjs'

test('RG: session limit enforced on the SERVER clock (C13)', () => {
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 59 * 60000, limitMs: 60 * 60000 }), false)
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 61 * 60000, limitMs: 60 * 60000 }), true)
  assert.throws(() => sessionExceeded({ sessionStartMs: 5000, nowMs: 1000, limitMs: 1000 }), /monotonic/)
})

test('RG: loss and deposit limits block at the boundary', () => {
  assert.equal(lossLimitBlocks({ lossSoFar: 90n, betAmount: 10n, lossLimit: 100n }), false)
  assert.equal(lossLimitBlocks({ lossSoFar: 95n, betAmount: 10n, lossLimit: 100n }), true)
  assert.equal(depositLimitBlocks({ depositedSoFar: 0n, amount: 100n, depositLimit: 100n }), false)
  assert.equal(depositLimitBlocks({ depositedSoFar: 50n, amount: 60n, depositLimit: 100n }), true)
})

test('RG: session limit blocks at the exact boundary (>=)', () => {
  assert.equal(sessionExceeded({ sessionStartMs: 0, nowMs: 60 * 60000, limitMs: 60 * 60000 }), true)
})

test('D5: exact decimal loss and deposit caps allow 0.1 plus 0.2 at 0.3', async () => {
  const { toAtoms } = await import('./money.mjs')
  const first = toAtoms(0.1, 1)
  const second = toAtoms(0.2, 1)
  const cap = toAtoms(0.3, 1)
  assert.equal(depositLimitBlocks({ depositedSoFar: first, amount: second, depositLimit: cap }), false)
  assert.equal(lossLimitBlocks({ lossSoFar: first, betAmount: second, lossLimit: cap }), false)
  assert.equal(depositLimitBlocks({ depositedSoFar: cap, amount: 1n, depositLimit: cap }), true)
  assert.equal(lossLimitBlocks({ lossSoFar: cap, betAmount: 1n, lossLimit: cap }), true)
})

test('D5: invalid or missing session inputs throw instead of allowing play', () => {
  const valid = { sessionStartMs: 0, nowMs: 10, limitMs: 20 }
  for (const field of Object.keys(valid)) for (const value of [NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, undefined, null, '10', 10n]) {
    assert.throws(() => sessionExceeded({ ...valid, [field]: value }))
  }
  assert.throws(() => sessionExceeded({ ...valid, limitMs: 0 }), RangeError)
  assert.throws(() => sessionExceeded({}), TypeError)
})

test('session times remain exact at the largest safe integer', () => {
  assert.equal(sessionExceeded({ sessionStartMs: Number.MAX_SAFE_INTEGER - 1, nowMs: Number.MAX_SAFE_INTEGER, limitMs: 1 }), true)
  assert.equal(sessionExceeded({ sessionStartMs: 0, nowMs: Number.MAX_SAFE_INTEGER, limitMs: Number.MAX_SAFE_INTEGER }), true)
  assert.equal(sessionExceeded({ sessionStartMs: 0, nowMs: 0, limitMs: 1 }), false)
})

test('D5: every loss and deposit amount rejects NaN, missing, and non-BigInt inputs', () => {
  for (const [check, valid] of [[lossLimitBlocks, { lossSoFar: 1n, betAmount: 1n, lossLimit: 3n }], [depositLimitBlocks, { depositedSoFar: 1n, amount: 1n, depositLimit: 3n }]]) {
    for (const field of Object.keys(valid)) for (const value of [NaN, undefined, null, Infinity, 1, '1', {}, true]) {
      assert.throws(() => check({ ...valid, [field]: value }), TypeError)
    }
    for (const field of Object.keys(valid)) assert.throws(() => check({ ...valid, [field]: -1n }), RangeError)
    assert.throws(() => check({}), TypeError)
  }
})

test('zero caps allow zero and block a single atom; crypto caps exceed Number precision', () => {
  const cap = 10n ** 30n
  for (const [check, prior, next, limit] of [[lossLimitBlocks, 'lossSoFar', 'betAmount', 'lossLimit'], [depositLimitBlocks, 'depositedSoFar', 'amount', 'depositLimit']]) {
    assert.equal(check({ [prior]: 0n, [next]: 0n, [limit]: 0n }), false)
    assert.equal(check({ [prior]: 0n, [next]: 1n, [limit]: 0n }), true)
    assert.equal(check({ [prior]: cap - 1n, [next]: 1n, [limit]: cap }), false)
    assert.equal(check({ [prior]: cap, [next]: 1n, [limit]: cap }), true)
  }
})
