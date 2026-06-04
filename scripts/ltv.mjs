// Player lifetime value vs acquisition cost.
// LTV via the geometric-sum model: a player generates monthlyMargin each month and churns
// at churnRate, so LTV = monthlyMargin / churnRate. Target LTV:CAC ~ 3:1.

export function ltv({ monthlyMargin, churnRate }) {
  if (!(churnRate > 0 && churnRate <= 1)) throw new Error('churnRate must be in (0,1]')
  return monthlyMargin / churnRate
}

export function ltvCacRatio(ltvValue, cac) {
  if (!(cac > 0)) throw new Error('cac must be > 0')
  return ltvValue / cac
}

// The most you can spend acquiring (and incentivizing) one player while holding the target ratio.
export function maxAcquisitionSpend({ ltvValue, targetRatio = 3 }) {
  if (!(targetRatio > 0)) throw new Error('targetRatio must be > 0')
  return ltvValue / targetRatio
}
