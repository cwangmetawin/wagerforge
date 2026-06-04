// Bonus-buy pricing + jackpot RTP decomposition.
// Bonus-buy maintains RTP parity (buyVariantRTP >= baseRTP) and never marks up.
// Advertised RTP = base + the jackpot METER slice (player return); the operator-funded
// reset SEED is NOT a summand (it lifts effective return separately).

export function bonusBuyCost({ expectedFeaturePayout, buyVariantRTP }) {
  if (!(buyVariantRTP > 0)) throw new Error('buyVariantRTP must be > 0')
  if (!(expectedFeaturePayout >= 0)) throw new Error('expectedFeaturePayout must be >= 0')
  return expectedFeaturePayout / buyVariantRTP
}

export function rtpParity({ buyVariantRTP, baseRTP, tol = 1e-9 }) {
  return { parity: buyVariantRTP >= baseRTP - tol, gap: buyVariantRTP - baseRTP }
}

export function decomposeJackpotRtp({ baseRTP, jackpotMeterRTP }) {
  if (baseRTP < 0 || jackpotMeterRTP < 0) throw new Error('rtp components must be >= 0')
  return { advertisedRTP: baseRTP + jackpotMeterRTP, baseRTP, jackpotContributionRTP: jackpotMeterRTP }
}
