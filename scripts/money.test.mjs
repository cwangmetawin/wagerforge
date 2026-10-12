import { test } from 'node:test'
import assert from 'node:assert/strict'

const loadMoney = () => import('./money.mjs')

test('toAtoms parses the shortest Number spelling without rounding', async () => {
  const { toAtoms } = await loadMoney()
  for (const [amount, decimals, atoms] of [[0.29, 2, 29n], [0.3, 1, 3n], [0.1, 1, 1n], [0.2, 1, 2n], [1e-7, 8, 10n], [1.23e21, 0, 1230000000000000000000n]]) {
    assert.equal(toAtoms(amount, decimals), atoms)
  }
  assert.equal(toAtoms(-0, 18), 0n)
  assert.throws(() => toAtoms(0.1 + 0.2, 1), RangeError)
})

test('toAtoms supports exact plain strings and 18-decimal crypto units', async () => {
  const { toAtoms } = await loadMoney()
  assert.equal(toAtoms('12.34', 2), 1234n)
  assert.equal(toAtoms('00012.3400', 2), 1234n)
  assert.equal(toAtoms('0.000000000000000001', 18), 1n)
  assert.equal(toAtoms('9007199254740993.123456789012345678', 18), 9007199254740993123456789012345678n)
  assert.equal(toAtoms('1', 18), 1000000000000000000n)
  assert.equal(toAtoms('0.000', 0), 0n)
  assert.equal(toAtoms('42', 0), 42n)
})

test('toAtoms refuses values finer than the grid instead of rounding', async () => {
  const { toAtoms } = await loadMoney()
  for (const amount of [0.001, '0.001', '1.2301']) assert.throws(() => toAtoms(amount, 2), RangeError)
  assert.throws(() => toAtoms('0.0000000000000000001', 18), RangeError)
  assert.throws(() => toAtoms(1.5, 0), RangeError)
})

test('toAtoms refuses non-money inputs and non-plain decimal strings', async () => {
  const { toAtoms } = await loadMoney()
  for (const amount of [-1, NaN, Infinity, -Infinity, undefined, null, true, 1n, {}, [], '', ' ', ' 1', '1 ', '-1', '+1', '.1', '1.', '1e2', '0x10', '1_000', 'NaN', 'Infinity']) {
    assert.throws(() => toAtoms(amount, 2), RangeError)
  }
})

test('toAtoms bounds numeric exponents like the production parser', async () => {
  const { toAtoms } = await loadMoney()
  assert.equal(toAtoms(1e300, 0), 10n ** 300n)
  for (const amount of [1e301, Number.MAX_VALUE, 1e-301, Number.MIN_VALUE]) {
    assert.throws(() => toAtoms(amount, 18), RangeError)
  }
})

test('money helpers reject invalid precision on every boundary', async () => {
  const { toAtoms, fromAtoms } = await loadMoney()
  for (const decimals of [-1, 19, 1.5, NaN, Infinity, undefined, null, '2', 2n]) {
    assert.throws(() => toAtoms(1, decimals), RangeError)
    assert.throws(() => fromAtoms(1n, decimals), RangeError)
  }
})

test('fromAtoms builds canonical decimal strings directly from digits', async () => {
  const { fromAtoms, toAtoms } = await loadMoney()
  for (const [atoms, decimals, expected] of [[0n, 18, '0'], [1234n, 2, '12.34'], [1230n, 2, '12.3'], [100n, 2, '1'], [1n, 18, '0.000000000000000001'], [42n, 0, '42'], [9007199254740993123456789012345678n, 18, '9007199254740993.123456789012345678']]) {
    assert.equal(fromAtoms(atoms, decimals), expected)
    assert.equal(toAtoms(fromAtoms(atoms, decimals), decimals), atoms)
  }
})

test('fromAtoms refuses non-BigInt and negative atoms', async () => {
  const { fromAtoms } = await loadMoney()
  for (const atoms of [1, '1', NaN, undefined, null, {}, true]) assert.throws(() => fromAtoms(atoms, 2), TypeError)
  assert.throws(() => fromAtoms(-1n, 2), RangeError)
})

test('assertAtoms distinguishes wrong types from invalid ranges', async () => {
  const { assertAtoms } = await loadMoney()
  assert.equal(assertAtoms(1n), 1n)
  assert.equal(assertAtoms(0n, { allowZero: true }), 0n)
  assert.equal(assertAtoms(10n ** 30n, { allowZero: false }), 10n ** 30n)
  assert.throws(() => assertAtoms(0n), RangeError)
  assert.throws(() => assertAtoms(-1n, { allowZero: true }), RangeError)
  for (const atoms of [1, '1', NaN, undefined, null, {}, true]) assert.throws(() => assertAtoms(atoms), TypeError)
})

test('a Number with more than 15 significant digits is refused: the parser may already have changed it', async () => {
  const { toAtoms } = await loadMoney()
  for (const [amount, decimals] of [[0.1 + 0.2, 17], [9007199254740993, 0], [123456789.12345678, 8], [0.12345678901234568, 18]]) {
    assert.throws(() => toAtoms(amount, decimals), /significant digits/)
  }
  assert.equal(toAtoms('123456789.12345678', 8), 12345678912345678n)
  assert.equal(toAtoms(123456789.123456, 6), 123456789123456n)
  assert.equal(toAtoms(0.3, 17), 30000000000000000n)
})
