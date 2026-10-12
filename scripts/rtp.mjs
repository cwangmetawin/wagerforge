// Closed-form and Monte-Carlo RTP / volatility tooling.
import { plainItems, plainRecord } from './plain-data.mjs'
import { dyadic, add, subtract, multiply, compare, toNumber, sqrtNumber } from './dyadic.mjs'
// RTP is a SUM over outcomes of probability × payout — and a MULTILINEAR function of
// per-reel weights (see C1): never assume a single weight scales RTP proportionally.

function finite(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
  return value
}

function object(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
  return value
}

function positive(value, name) {
  finite(value, name)
  if (value <= 0) throw new RangeError(`${name} must be > 0`)
}

function crashEdge(houseEdge) {
  finite(houseEdge, 'houseEdge')
  if (houseEdge < 0 || houseEdge >= 1) throw new RangeError('houseEdge must be in [0,1)')
}

// The table is plain data (plain-data.mjs), copied by index: no iterator, getter or Proxy from the
// input runs, so the checks and the sums see the same table. Every input double is an exact dyadic:
// sums, products and the probability tolerance check use BigInt. Each result rounds to the nearest
// double, ties to even, including subnormals; exact values outside the finite range throw. Variance
// uses the exact RTP, and sd is the correctly rounded square root of the exact variance.
export function rtpFromOutcomes(outcomes) {
  const rows = plainItems(outcomes, 'outcomes')
  if (!rows.length) throw new RangeError('outcomes must be non-empty')
  const table = rows.map((row, i) => {
    const { p, payout } = plainRecord(row, `outcomes[${i}]`, ['p', 'payout'])
    finite(p, 'p')
    finite(payout, 'payout')
    if (p < 0 || p > 1) throw new RangeError('p must be in [0,1]')
    if (payout < 0) throw new RangeError('payout must be >= 0')
    return { p, payout }
  })
  const zero = dyadic(0)
  const one = dyadic(1)
  let rtp = zero
  let hitFreq = zero
  let pSum = zero
  let secondMoment = zero
  for (const { p, payout } of table) {
    const probability = dyadic(p)
    const value = dyadic(payout)
    const weighted = multiply(probability, value)
    pSum = add(pSum, probability)
    rtp = add(rtp, weighted)
    secondMoment = add(secondMoment, multiply(weighted, value))
    if (payout > 0) hitFreq = add(hitFreq, probability)
  }
  const pError = subtract(pSum, one)
  if (compare({ m: pError.m < 0n ? -pError.m : pError.m, e: pError.e }, dyadic(1e-9)) > 0) {
    throw new RangeError(`probabilities must sum to 1, got ${toNumber(pSum)}`)
  }
  // Σp·(payout-rtp)² = Σp·payout² + rtp²·(Σp-2), even when Σp differs slightly from 1.
  const variance = add(secondMoment, multiply(multiply(rtp, rtp), subtract(pSum, dyadic(2))))
  return {
    rtp: toNumber(rtp, 'rtp'),
    houseEdge: toNumber(subtract(one, rtp), 'houseEdge'),
    hitFreq: toNumber(hitFreq, 'hitFreq'),
    variance: toNumber(variance, 'variance'),
    sd: sqrtNumber(variance),
  }
}

export function monteCarlo(sampleFn, n, options = {}) {
  const { z = 1.96 } = object(options, 'options')
  if (typeof sampleFn !== 'function') throw new TypeError('sampleFn must be a function')
  finite(n, 'n')
  if (!Number.isSafeInteger(n) || n < 2) throw new RangeError('n must be a safe integer >= 2')
  positive(z, 'z')
  let mean = 0
  let m2 = 0
  let hits = 0
  let absDeltas = 0
  let weightedMeans = 0
  for (let i = 0; i < n; i++) {
    const x = finite(sampleFn(i), `sample[${i}]`)
    // Welford avoids catastrophic cancellation in E[X²] - E[X]² for large means.
    const delta = x - mean
    mean += delta / (i + 1)
    m2 += delta * (x - mean)
    finite(mean, 'sample mean')
    finite(m2, 'sample M2')
    absDeltas += Math.abs(delta)
    weightedMeans += (i + 1) * Math.abs(mean)
    if (x > 0) hits++
  }
  // Estimating the mean consumes one degree of freedom: n-1 estimates population variance.
  const variance = m2 / (n - 1)
  const sd = Math.sqrt(variance)
  const ciHalfWidth = finite(z * (sd / Math.sqrt(n)), 'ciHalfWidth')
  const ci = [finite(mean - ciHalfWidth, 'ci lower bound'), finite(mean + ciHalfWidth, 'ci upper bound')]
  // Worst-case rounding of the running mean against the exact sample mean. Step k of Welford's
  // update errs by at most |delta|·2u/k + u·|mean_k| (u = EPSILON/2), and later steps shrink that
  // error by k/n; the bound is doubled to cover rounding in its own sums, plus subnormal slack.
  // An overflowing bound stays Infinity: it cannot certify anything, so validateRtp fails closed.
  const meanError = Number.EPSILON * (2 * absDeltas + weightedMeans) / n + 2 * n * Number.MIN_VALUE
  return { rtp: mean, n, variance, sd, hitFreq: hits / n, ciHalfWidth, ci, meanError }
}

// ceil(product(numerators) / product(denominators)) for non-negative finite doubles, computed
// exactly in BigInt. The result is exact up to 2^53; above that it is the nearest double at or
// above the exact count, never below it.
function ceilRatio(numerators, denominators) {
  let num = 1n
  let den = 1n
  let exponent = 0
  for (const x of numerators) {
    const { m, e } = dyadic(x)
    num *= m
    exponent += e
  }
  for (const x of denominators) {
    const { m, e } = dyadic(x)
    den *= m
    exponent -= e
  }
  if (exponent >= 0) num <<= BigInt(exponent)
  else den <<= BigInt(-exponent)
  const exact = (num + den - 1n) / den
  // Above 2^53 the nearest double can sit below the exact count: then the next double up is the
  // least one at or above it. Never round a sample size down.
  const nearest = Number(exact)
  return finite(Number.isFinite(nearest) && BigInt(nearest) < exact ? nextUp(nearest) : nearest, 'requiredN result')
}

// The next double above a positive finite x (its bit pattern plus one).
function nextUp(x) {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, x)
  view.setBigUint64(0, view.getBigUint64(0) + 1n)
  return view.getFloat64(0)
}

// The least n with z·sd/sqrt(n) <= tolerance (see ceilRatio); sd may be given as bound / divisor
// (Popoviciu: maxPayout / 2).
const sampleSize = (sd, tolerance, z, divisor = 1) => ceilRatio([z, z, sd, sd], [tolerance, tolerance, divisor, divisor])

// The least n >= 1 with z·sdPerSpin/sqrt(n) <= tolerance; a zero SD still needs one sample. Exact
// up to 2^53, above it the least double at or above n; a RangeError when n is above Number.MAX_VALUE.
export function requiredN(sdPerSpin, tolerance, z = 1.96) {
  finite(sdPerSpin, 'sdPerSpin')
  if (sdPerSpin < 0) throw new RangeError('sdPerSpin must be >= 0')
  positive(tolerance, 'tolerance')
  positive(z, 'z')
  return Math.max(1, sampleSize(sdPerSpin, tolerance, z))
}

// Certification needs a bound on the tail the sample may never have seen: the model's sd, or the
// largest possible gross return per unit stake (Popoviciu: returns in [0, maxPayout] have
// sd <= maxPayout / 2). A small OBSERVED variance cannot vouch for an unseen jackpot. A CLT sample
// size fixes the CI width, not whether a rare prize was seen: with minEventProbability p the run
// must also expect the rarest paying event at least 30 times (n >= 30 / p).
const RARE_EVENT_EXPECTED_HITS = 30

export function validateRtp(sampleFn, targetRtp, options = {}) {
  const { n, tolerance, z = 1.96, modelSd, maxPayout, minEventProbability } = object(options, 'options')
  if (minEventProbability !== undefined) {
    finite(minEventProbability, 'minEventProbability')
    if (minEventProbability <= 0 || minEventProbability > 1) throw new RangeError('minEventProbability must be in (0, 1]')
  }
  finite(targetRtp, 'targetRtp')
  positive(tolerance, 'tolerance')
  for (const [name, value] of [['modelSd', modelSd], ['maxPayout', maxPayout]]) {
    if (value === undefined) continue
    finite(value, name)
    if (value < 0) throw new RangeError(`${name} must be >= 0`)
  }
  if (typeof sampleFn !== 'function') throw new TypeError('sampleFn must be a function')
  positive(z, 'z')
  const bounded = modelSd !== undefined || maxPayout !== undefined
  const boundN = modelSd !== undefined ? sampleSize(modelSd, tolerance, z) : bounded ? sampleSize(maxPayout, tolerance, z, 2) : 0
  const rareN = minEventProbability === undefined ? 0 : ceilRatio([RARE_EVENT_EXPECTED_HITS], [minEventProbability])
  const modelN = bounded ? Math.max(boundN, rareN) : 0
  // Record whether any sample differs from the first: a computed variance can round or underflow to
  // 0 for samples that do vary, so it cannot decide whether a declared modelSd of 0 is wrong.
  let first
  let varied = false
  const checked = (i) => {
    const x = finite(sampleFn(i), `sample[${i}]`)
    if (maxPayout !== undefined && (x < 0 || x > maxPayout)) throw new RangeError(`sample[${i}] = ${x} lies outside [0, maxPayout]: the declared bound is wrong`)
    if (i === 0) first = x
    else if (x !== first) varied = true
    return x
  }
  const mc = monteCarlo(checked, n, { z })
  if (modelSd === 0 && varied) throw new RangeError('the sample varies, so modelSd 0 is wrong')
  const withinCi = targetRtp >= mc.ci[0] && targetRtp <= mc.ci[1]
  const converged = bounded && mc.ciHalfWidth <= tolerance && n >= modelN
  // Equivalence contains the WHOLE CI in the tolerance band; a point-null CI check does not. The
  // mean's rounding bound and a relative margin for this sum keep the comparison itself honest.
  const distance = Math.abs(mc.rtp - targetRtp) + mc.ciHalfWidth + mc.meanError
  const equivalent = distance * (1 + 2 * Number.EPSILON) <= tolerance
  // An unobserved variance is not evidence that the model's variance is zero.
  const zeroVariance = mc.variance === 0 && modelSd !== 0
  const pass = equivalent && converged && !zeroVariance
  const reason = zeroVariance ? 'zero_variance'
    : !bounded ? 'variance_bound_required'
      : !converged ? 'not_converged'
        : !equivalent ? 'not_equivalent' : 'pass'
  return { ...mc, targetRtp, withinCi, converged, equivalent, pass, reason }
}

export function crashSurvival(x, houseEdge) {
  positive(x, 'x')
  crashEdge(houseEdge)
  // Instabust is an atom at C=1, so every crash point survives the inclusive threshold 1.
  return x <= 1 ? 1 : (1 - houseEdge) / x
}

export function crashEV(houseEdge) {
  crashEdge(houseEdge)
  return 1 - houseEdge
}

export function crashTargetRTP(target, houseEdge, options = {}) {
  const { capMultiplier = Infinity } = object(options, 'options')
  finite(target, 'target')
  if (target <= 1) throw new RangeError('target must be > 1: a target of 1 always wins')
  crashEdge(houseEdge)
  // Positive infinity explicitly means uncapped; finite caps may be zero but never negative.
  if (capMultiplier !== Infinity) {
    finite(capMultiplier, 'capMultiplier')
    if (capMultiplier < 0) throw new RangeError('capMultiplier must be >= 0')
  }
  return (1 - houseEdge) * (Math.min(target, capMultiplier) / target)
}
