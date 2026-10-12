import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dyadic, add, subtract, multiply, compare, toNumber, sqrtNumber } from './dyadic.mjs'

test('dyadic arithmetic preserves signs, cancellation and widely separated exponents', () => {
  assert.equal(toNumber(dyadic(-1.5)), -1.5)
  assert.equal(toNumber(dyadic(Number.MIN_VALUE)), Number.MIN_VALUE)
  assert.equal(compare(add(dyadic(1), dyadic(2 ** -1000)), dyadic(1)), 1)
  assert.equal(compare(subtract(dyadic(1), dyadic(1)), dyadic(0)), 0)
  assert.equal(toNumber(multiply(dyadic(-1.5), dyadic(2))), -3)
})

test('nearest dyadic rounding uses even significands at normal and subnormal ties', () => {
  assert.equal(toNumber({ m: (1n << 53n) + 1n, e: -53 }), 1)
  assert.equal(toNumber({ m: (1n << 53n) + 3n, e: -53 }), 1 + 2 ** -51)
  assert.equal(toNumber({ m: 1n, e: -1075 }), 0)
  assert.equal(toNumber({ m: -1n, e: -1075 }), -0)
  assert.equal(toNumber({ m: 3n, e: -1075 }), 2 * Number.MIN_VALUE)
  assert.equal(toNumber({ m: (1n << 53n) - 1n, e: -1075 }), 2 ** -1022)
  assert.equal(toNumber({ m: (1n << 52n) - 1n, e: -1074 }), 2 ** -1022 - Number.MIN_VALUE)
})

test('nearest dyadic rounding refuses exact values beyond the finite range', () => {
  assert.equal(toNumber(dyadic(Number.MAX_VALUE)), Number.MAX_VALUE)
  assert.throws(() => toNumber({ m: (1n << 54n) - 1n, e: 970 }), RangeError)
  assert.throws(() => toNumber({ m: -((1n << 54n) - 1n), e: 970 }), RangeError)
})

test('exact square roots use even significands at midpoint squares', () => {
  for (const k of [1n << 52n, (1n << 52n) + 1n]) {
    const midpoint = (2n * k + 1n) ** 2n
    const lower = Number(k) * 2 ** -52
    const upper = Number(k + 1n) * 2 ** -52
    assert.equal(sqrtNumber({ m: midpoint - 1n, e: -106 }), lower)
    assert.equal(sqrtNumber({ m: midpoint, e: -106 }), k % 2n ? upper : lower)
    assert.equal(sqrtNumber({ m: midpoint + 1n, e: -106 }), upper)
  }
})

test('exact square roots retain a sticky bit below the integer radicand', () => {
  const midpoint = ((1n << 53n) + 1n) ** 2n
  assert.equal(sqrtNumber({ m: (midpoint << 3990n) + 1n, e: -4096 }), 1 + 2 ** -52)
})

test('exact square roots round subnormal ties without underflowing the radicand', () => {
  assert.equal(sqrtNumber({ m: 0n, e: 0 }), 0)
  assert.equal(sqrtNumber({ m: 1n, e: -2150 }), 0)
  assert.equal(sqrtNumber({ m: 9n, e: -2150 }), 2 * Number.MIN_VALUE)
  assert.equal(sqrtNumber({ m: 25n, e: -2150 }), 2 * Number.MIN_VALUE)
  assert.equal(sqrtNumber({ m: 49n, e: -2150 }), 4 * Number.MIN_VALUE)
  assert.throws(() => sqrtNumber({ m: -1n, e: 0 }), RangeError)
})
