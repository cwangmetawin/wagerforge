import { monteCarlo } from './rtp.mjs'

// Total payout of one cascade/tumble round: each wave contributes win * the COMPOUNDED
// multiplier so far. waves = [{ win, multiplier }] where multiplier is the per-wave step.
export function cascadeTotal(waves) {
  let total = 0
  let cumMult = 1
  for (const { win, multiplier } of waves) {
    cumMult *= multiplier
    total += win * cumMult
  }
  return total
}

// C6: a cascade with growing/compounding multipliers is path-dependent, so a closed form is
// invalid - estimate RTP with validated Monte-Carlo and report the CI. roundFn(i) returns the
// total payout of one base round (including all its tumble waves).
export function simulateCascadeRTP(roundFn, n, opts = {}) {
  return monteCarlo(roundFn, n, opts)
}
