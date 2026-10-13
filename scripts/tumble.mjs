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
// integer atoms (math-cascade-tumble). A running multiplier or a positive wave award that leaves the
// normal double range, or a computed (rounded) total above 2^53 - 1 (Number.MAX_SAFE_INTEGER), is
// refused.
// A zero win is allowed with any normal running multiplier.
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
    if (total > Number.MAX_SAFE_INTEGER) throw new RangeError('cascade total exceeds 2^53 - 1 (Number.MAX_SAFE_INTEGER): settle in exact integer atoms')
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

function fraction(numerator, denominator) {
  let a = numerator
  let b = denominator
  while (b !== 0n) [a, b] = [b, a % b]
  return { numerator: numerator / a, denominator: denominator / a }
}

function exactMultiplier(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError('multiplier must be a positive safe integer or plain decimal string')
    return { numerator: BigInt(value), denominator: 1n }
  }
  if (typeof value !== 'string') throw new TypeError('multiplier must be a safe integer or plain decimal string')
  const parts = /^(\d+)(?:\.(\d+))?$/.exec(value)
  if (!parts || parts[0] !== value) throw new RangeError('multiplier must be a positive plain decimal string')
  const digits = (parts[2] ?? '').replace(/0+$/, '')
  const numerator = BigInt(parts[1] + digits)
  if (numerator === 0n) throw new RangeError('multiplier must be > 0')
  return fraction(numerator, 10n ** BigInt(digits.length))
}

function atomWavesOf(waves) {
  return plainItems(waves, 'waves').map((wave, i) => {
    const { win, multiplier } = plainRecord(wave, `waves[${i}]`, ['win', 'multiplier'])
    if (typeof win !== 'bigint') throw new TypeError('win must be a BigInt amount in atoms')
    if (win < 0n) throw new RangeError('win must be >= 0 atoms')
    return { win, multiplier: exactMultiplier(multiplier) }
  })
}

function roundFraction({ numerator, denominator }, rounding) {
  const atoms = numerator / denominator
  if (rounding === 'floor') return atoms
  const twiceRemainder = 2n * (numerator % denominator)
  const up = twiceRemainder > denominator || (twiceRemainder === denominator && (rounding === 'half-up' || atoms % 2n === 1n))
  return atoms + (up ? 1n : 0n)
}

const OPTION_KEYS = ['rounding', 'roundAt']

function totalAtoms(waves, options, absolute) {
  const { rounding = 'half-up', roundAt = 'wave' } = plainRecord(options, 'options', OPTION_KEYS)
  // A misspelt key would silently fall back to the default rule; options is already a plain object,
  // so listing its own keys runs no input code.
  const unknown = Reflect.ownKeys(options).find((key) => !OPTION_KEYS.includes(key))
  if (unknown !== undefined) throw new TypeError(`unknown option ${String(unknown)}: only rounding and roundAt`)
  if (typeof rounding !== 'string') throw new TypeError('rounding must be a string')
  if (!['floor', 'half-up', 'half-even'].includes(rounding)) throw new RangeError('rounding must be floor, half-up or half-even')
  if (typeof roundAt !== 'string') throw new TypeError('roundAt must be a string')
  if (!['wave', 'total'].includes(roundAt)) throw new RangeError('roundAt must be wave or total')
  let cumulative = { numerator: 1n, denominator: 1n }
  let sum = { numerator: 0n, denominator: 1n }
  let total = 0n
  for (const { win, multiplier } of atomWavesOf(waves)) {
    cumulative = absolute ? multiplier : fraction(cumulative.numerator * multiplier.numerator, cumulative.denominator * multiplier.denominator)
    const award = fraction(win * cumulative.numerator, cumulative.denominator)
    if (roundAt === 'wave') total += roundFraction(award, rounding)
    else sum = fraction(sum.numerator * award.denominator + award.numerator * sum.denominator, sum.denominator * award.denominator)
  }
  return roundAt === 'wave' ? total : roundFraction(sum, rounding)
}

// Default: half-up each multiplied wave to one atom, then sum. That is the rounding point of
// MetaWin's production server (MSS) games/zeus/gameLogic.ts, whose fixValue takes each ABSOLUTE wave
// (cascadeTotalAbsoluteAtoms) to cents; its integer ladder on whole cents never needs a rounding
// mode, so Zeus fixes the point, not the mode. Number(x.toFixed(2)) rounds the binary double, not the
// exact value (0.15 x 1.5: toFixed 0.22, exact half-up 0.23). Caps (Zeus: maxWin x bet) are the
// caller's.
// Wins are pre-priced BigInt atoms; multipliers are positive decimal strings or safe integers.
// options.rounding: half-up, half-even or floor; options.roundAt: wave or total.
// STEP factors compound exactly, including factors on zero-win waves; never round the factors.
export function cascadeTotalAtoms(waves, options = {}) {
  return totalAtoms(waves, options, false)
}

// ABSOLUTE factors apply only to their own wave, with the same rounding options and default.
// A final-total multiplier must already be resolved and supplied for every affected wave.
export function cascadeTotalAbsoluteAtoms(waves, options = {}) {
  return totalAtoms(waves, options, true)
}

// C6: a cascade with growing/compounding multipliers is path-dependent, so a closed form is
// invalid - estimate RTP with validated Monte-Carlo and report the CI. roundFn(i) returns the
// total payout of one base round (including all its tumble waves).
export function simulateCascadeRTP(roundFn, n, opts = {}) {
  return monteCarlo(roundFn, n, opts)
}
