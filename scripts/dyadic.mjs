// Exact finite-double arithmetic: m·2^e, with an odd coefficient unless the value is zero.
const view = new DataView(new ArrayBuffer(8))
const maximum = { m: (1n << 53n) - 1n, e: 971 }

function normalized(m, e) {
  if (m === 0n) return { m: 0n, e: 0 }
  while ((m & 0xffffffffn) === 0n) {
    m >>= 32n
    e += 32
  }
  while ((m & 1n) === 0n) {
    m >>= 1n
    e++
  }
  return { m, e }
}

export function dyadic(x) {
  if (typeof x !== 'number') throw new TypeError('dyadic needs a number')
  if (!Number.isFinite(x)) throw new RangeError('dyadic needs a finite number')
  view.setFloat64(0, x)
  const bits = view.getBigUint64(0)
  const biased = Number((bits >> 52n) & 0x7ffn)
  const fraction = bits & 0xfffffffffffffn
  const m = biased === 0 ? fraction : fraction | (1n << 52n)
  return normalized(bits >> 63n ? -m : m, biased === 0 ? -1074 : biased - 1075)
}

export function add(a, b) {
  if (a.m === 0n) return b
  if (b.m === 0n) return a
  const e = Math.min(a.e, b.e)
  return normalized((a.m << BigInt(a.e - e)) + (b.m << BigInt(b.e - e)), e)
}

export const subtract = (a, b) => add(a, { m: -b.m, e: b.e })
export const multiply = (a, b) => normalized(a.m * b.m, a.e + b.e)

export function compare(a, b) {
  const e = Math.min(a.e, b.e)
  const difference = (a.m << BigInt(a.e - e)) - (b.m << BigInt(b.e - e))
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

const bitLength = (m) => m.toString(2).length

// Discard binary places once; a sticky tail distinguishes an exact tie from a value above it.
function rounded(m, places, sticky = false) {
  if (places <= 0) return m << BigInt(-places)
  const shift = BigInt(places)
  const retained = m >> shift
  const discarded = m - (retained << shift)
  const half = 1n << (shift - 1n)
  return retained + (discarded > half || discarded === half && (sticky || (retained & 1n) !== 0n) ? 1n : 0n)
}

// Round to nearest, ties to even, including signed underflow; exact overflow throws.
export function toNumber({ m, e }, name = 'result') {
  if (m === 0n) return 0
  const sign = m < 0n ? -1 : 1
  const magnitude = { m: m < 0n ? -m : m, e }
  if (compare(magnitude, maximum) > 0) throw new RangeError(`${name} must be finite`)
  const step = Math.max(bitLength(magnitude.m) - 1 + e - 52, -1074)
  return sign * Number(rounded(magnitude.m, step - e)) * 2 ** step
}

function integerSqrt(n) {
  if (n < 2n) return n
  let root = 1n << BigInt(Math.ceil(bitLength(n) / 2))
  let next = (root + n / root) >> 1n
  while (next < root) {
    root = next
    next = (root + n / root) >> 1n
  }
  return root
}

// Two extra root bits plus the exact radicand remainder give a correctly rounded square root.
export function sqrtNumber({ m, e }, name = 'sd') {
  if (m < 0n) throw new RangeError(`${name} must be >= 0`)
  if (m === 0n) return 0
  if (compare({ m, e }, multiply(maximum, maximum)) > 0) throw new RangeError(`${name} must be finite`)
  const step = Math.max(Math.floor((bitLength(m) - 1 + e) / 2) - 52, -1074)
  const exponent = e - 2 * (step - 2)
  const radicand = exponent >= 0 ? m << BigInt(exponent) : m >> BigInt(-exponent)
  const root = integerSqrt(radicand)
  const sticky = root * root !== radicand || exponent < 0 && m !== (radicand << BigInt(-exponent))
  return Number(rounded(root, 2, sticky)) * 2 ** step
}
