// Closed-form and Monte-Carlo RTP / volatility tooling.
// RTP is a SUM over outcomes of probability × payout — and a MULTILINEAR function of
// per-reel weights (see C1): never assume a single weight scales RTP proportionally.

export function rtpFromOutcomes(outcomes) {
  let rtp = 0
  let hitFreq = 0
  let pSum = 0
  for (const { p, payout } of outcomes) {
    pSum += p
    rtp += p * payout
    if (payout > 0) hitFreq += p
  }
  if (Math.abs(pSum - 1) > 1e-9) throw new Error(`probabilities must sum to 1, got ${pSum}`)
  let variance = 0
  for (const { p, payout } of outcomes) variance += p * (payout - rtp) ** 2
  return { rtp, houseEdge: 1 - rtp, hitFreq, variance, sd: Math.sqrt(variance) }
}

export function monteCarlo(sampleFn, n, { z = 1.96 } = {}) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer')
  let sum = 0
  let sumSq = 0
  let hits = 0
  for (let i = 0; i < n; i++) {
    const x = sampleFn(i)
    sum += x
    sumSq += x * x
    if (x > 0) hits++
  }
  const mean = sum / n
  const variance = Math.max(0, sumSq / n - mean * mean)
  const sd = Math.sqrt(variance)
  const ciHalfWidth = (z * sd) / Math.sqrt(n)
  return { rtp: mean, n, variance, sd, hitFreq: hits / n, ciHalfWidth, ci: [mean - ciHalfWidth, mean + ciHalfWidth] }
}

export function requiredN(sdPerSpin, tolerance, z = 1.96) {
  if (tolerance <= 0 || sdPerSpin < 0) throw new Error('tolerance>0 and sdPerSpin>=0 required')
  return Math.ceil(((z * sdPerSpin) / tolerance) ** 2)
}

export function validateRtp(sampleFn, targetRtp, { n, tolerance, z = 1.96 } = {}) {
  const mc = monteCarlo(sampleFn, n, { z })
  const withinCi = Math.abs(mc.rtp - targetRtp) <= mc.ciHalfWidth
  const converged = mc.ciHalfWidth <= tolerance
  return { ...mc, targetRtp, withinCi, converged, pass: withinCi && converged }
}

export function crashSurvival(x, houseEdge) {
  return x < 1 ? 1 : (1 - houseEdge) / x
}
export function crashEV(houseEdge) {
  return 1 - houseEdge
}
