// Bonus-buy pricing + jackpot RTP decomposition.
// RTP parity (buyVariantRTP >= baseRTP) is a product policy, not a mathematical theorem.
// Advertised RTP = base + the jackpot METER slice (player return); the operator-funded
// reset SEED is NOT a summand (it lifts effective return separately).

function nonnegative(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and >= 0`)
  return value
}

function object(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('options must be an object')
  return value
}

function variantRtp(value) {
  nonnegative(value, 'buyVariantRTP')
  if (value === 0) throw new RangeError('buyVariantRTP must be > 0')
}

export function bonusBuyCost(options) {
  const { expectedFeaturePayout, buyVariantRTP } = object(options)
  nonnegative(expectedFeaturePayout, 'expectedFeaturePayout')
  variantRtp(buyVariantRTP)
  return nonnegative(expectedFeaturePayout / buyVariantRTP, 'bonusBuyCost result')
}

export function rtpParity(options) {
  const { buyVariantRTP, baseRTP, tol = 1e-9 } = object(options)
  variantRtp(buyVariantRTP)
  nonnegative(baseRTP, 'baseRTP')
  nonnegative(tol, 'tol')
  return { parity: buyVariantRTP >= baseRTP - tol, gap: buyVariantRTP - baseRTP }
}

export function decomposeJackpotRtp(options) {
  const { baseRTP, jackpotMeterRTP } = object(options)
  nonnegative(baseRTP, 'baseRTP')
  nonnegative(jackpotMeterRTP, 'jackpotMeterRTP')
  const advertisedRTP = nonnegative(baseRTP + jackpotMeterRTP, 'advertisedRTP')
  return { advertisedRTP, baseRTP, jackpotContributionRTP: jackpotMeterRTP }
}
