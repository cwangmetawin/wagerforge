import { plainItems, plainRecord } from './plain-data.mjs'
import { monteCarlo } from './rtp.mjs'

function finite(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
  return value
}

// The waves are plain data (plain-data.mjs), copied by index: no iterator, getter or Proxy from the
// input runs, so the checks and the total see the same sequence.
function wavesOf(waves) {
  return plainItems(waves, 'waves').map((wave, i) => {
    const { win, multiplier } = plainRecord(wave, `waves[${i}]`, ['win', 'multiplier'])
    finite(win, 'win')
    finite(multiplier, 'multiplier')
    if (win < 0) throw new RangeError('win must be >= 0')
    if (multiplier <= 0) throw new RangeError('multiplier must be > 0')
    return { win, multiplier }
  })
}

// These helpers work in double-precision payout multiples for RTP math; settle real money in exact
// integer atoms (math-cascade-tumble). A running multiplier or a wave award that leaves the normal
// double range, or a total above 2^53, is refused: it could only come back rounded or as zero.
const MIN_NORMAL = 2 ** -1022

function total(waves, absolute) {
  let total = 0
  let cumMult = 1
  for (const { win, multiplier } of wavesOf(waves)) {
    cumMult = finite(absolute ? multiplier : cumMult * multiplier, 'running multiplier')
    if (cumMult < MIN_NORMAL) throw new RangeError('running multiplier underflowed')
    const award = win * cumMult
    if (win > 0 && !(award >= MIN_NORMAL)) throw new RangeError('wave award underflowed')
    total = finite(total + award, 'cascade total')
    if (total > Number.MAX_SAFE_INTEGER) throw new RangeError('cascade total exceeds 2^53: settle in exact integer atoms')
  }
  return total
}

// STEP multipliers compound: 1x, 2x, 3x apply as 1x, 2x, 6x to successive wins.
export function cascadeTotal(waves) {
  return total(waves, false)
}

// ABSOLUTE multipliers already describe each wave's payout, as in production cascade engines.
export function cascadeTotalAbsolute(waves) {
  return total(waves, true)
}

// C6: a cascade with growing/compounding multipliers is path-dependent, so a closed form is
// invalid - estimate RTP with validated Monte-Carlo and report the CI. roundFn(i) returns the
// total payout of one base round (including all its tumble waves).
export function simulateCascadeRTP(roundFn, n, opts = {}) {
  return monteCarlo(roundFn, n, opts)
}
