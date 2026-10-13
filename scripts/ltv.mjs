// Player lifetime value vs acquisition cost.
// LTV via the geometric-sum model: a player generates monthlyMargin each month and churns
// at churnRate. Discounting begins AFTER the first margin at t=0. Target LTV:CAC ~ 3:1.

function finite(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
  return value
}

function positive(value, name) {
  finite(value, name)
  if (value <= 0) throw new RangeError(`${name} must be > 0`)
}

function object(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('options must be an object')
  return value
}

export function ltv(options) {
  const { monthlyMargin, churnRate, discountRate = 0 } = object(options)
  // Signed margins preserve loss-making player economics rather than hiding their costs.
  finite(monthlyMargin, 'monthlyMargin')
  positive(churnRate, 'churnRate')
  if (churnRate > 1) throw new RangeError('churnRate must be in (0,1]')
  finite(discountRate, 'discountRate')
  if (discountRate < 0) throw new RangeError('discountRate must be >= 0')
  const factor = 1 + discountRate
  const denominator = churnRate + discountRate
  const numerator = monthlyMargin * factor
  // Reorder only an overflowing product; a reciprocal can itself overflow for tiny churn.
  const value = Number.isFinite(numerator) ? numerator / denominator : monthlyMargin * (factor / denominator)
  return finite(value, 'ltv result')
}

export function ltvCacRatio(ltvValue, cac) {
  finite(ltvValue, 'ltvValue')
  positive(cac, 'cac')
  return finite(ltvValue / cac, 'ltvCacRatio result')
}

// The most you can spend acquiring (and incentivizing) one player while holding the target ratio.
export function maxAcquisitionSpend(options) {
  const { ltvValue, targetRatio = 3 } = object(options)
  finite(ltvValue, 'ltvValue')
  positive(targetRatio, 'targetRatio')
  return finite(ltvValue / targetRatio, 'maxAcquisitionSpend result')
}
