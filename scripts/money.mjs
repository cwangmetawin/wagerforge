// 18 decimals cover crypto base units such as wei, which exceed 2^53: Number cannot hold them.
function assertDecimals(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError('decimals must be an integer from 0 to 18')
  }
}

export function assertAtoms(atoms, { allowZero = false } = {}) {
  if (typeof atoms !== 'bigint') throw new TypeError('atoms must be a BigInt')
  if (atoms < 0n || (!allowZero && atoms === 0n)) throw new RangeError('atoms outside the allowed range')
  return atoms
}

export function toAtoms(amount, decimals) {
  assertDecimals(decimals)
  const numeric = typeof amount === 'number'
  if ((!numeric && typeof amount !== 'string') || (numeric && (!Number.isFinite(amount) || amount < 0))) {
    throw new RangeError('amount must be a finite non-negative number or plain decimal string')
  }
  // String(number) is the platform's shortest round-tripping spelling, not a rounded product.
  const text = String(amount)
  const parts = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text)
  if (!parts || parts[0] !== text || (!numeric && parts[3] !== undefined)) {
    throw new RangeError('amount must be a plain decimal string')
  }
  // Numeric exponents beyond ±300 are refused, as MetaWin's production parser does (MSS
  // common/settlementModule/money.ts); no real wallet amount comes near them.
  const exponent = Number(parts[3] ?? 0)
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 300) throw new RangeError('exponent out of range')
  // Every decimal with at most 15 significant digits survives a round trip through a double, so 15 is
  // the safe limit for a Number; a longer spelling may already have been changed by JSON.parse (or by
  // the arithmetic that produced the Number) before it arrives here. The
  // rule cannot see digits the parser already dropped (JSON 0.10000000000000001 arrives as 0.1), so
  // amounts should travel as decimal strings; a Number input is only as good as its source.
  if (numeric && (parts[1] + (parts[2] ?? '')).replace(/^0+/, '').replace(/0+$/, '').length > 15) {
    throw new RangeError('a Number with more than 15 significant digits may not be the intended amount: pass a decimal string')
  }
  // Trailing fractional zeroes do not make a value finer than the wallet grid.
  const fraction = (parts[2] ?? '').replace(/0+$/, '')
  const shift = decimals + exponent - fraction.length
  if (shift < 0) throw new RangeError('amount is finer than the wallet grid')
  return BigInt(parts[1] + fraction) * 10n ** BigInt(shift)
}

export function fromAtoms(atoms, decimals) {
  assertAtoms(atoms, { allowZero: true })
  assertDecimals(decimals)
  const digits = atoms.toString().padStart(decimals + 1, '0')
  if (decimals === 0) return digits
  const split = digits.length - decimals
  const fraction = digits.slice(split).replace(/0+$/, '')
  return fraction ? `${digits.slice(0, split)}.${fraction}` : digits.slice(0, split)
}
