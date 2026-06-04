---
name: math-volatility-tuning
description: Use when classifying or tuning a game volatility/variance, hit frequency, or payout distribution shape while holding RTP fixed. Keywords volatility, variance, hit frequency, distribution.
---

# math-volatility-tuning

## When to use / When NOT
- Use when: classifying low/medium/high volatility, reshaping the payout distribution, or moving hit frequency while keeping RTP constant.
- NOT for: deriving or recalibrating RTP/house edge itself (→ `math-rtp-modeling`); empirically validating an implementation (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
TS + Node + decimal.js over an outcome list `{p, payout}`. Other stacks: same per-spin variance formula over the full enumerated (or weight-derived) outcome set.

## Process
1. Build the COMPLETE outcome set including every zero/loss outcome — losing spins carry the bulk of the probability mass.
2. `EV = Σ p·payout` (this equals RTP·bet). `Variance = Σ p·(payout − EV)²`; `SD = √Variance`. For N spins, variance scales ×N and SD scales ×√N.
3. Classify by SD-per-spin (or by tail mass / top-prize weight), not by RTP — RTP is orthogonal, so two identical-RTP games can sit at opposite volatility extremes.
4. `hitFrequency = winning outcomes ÷ total outcomes` (or Σp over winning outcomes). It is independent of RTP: you can raise or lower it without touching RTP.
5. To tune volatility while holding RTP fixed: redistribute payout mass between frequent small wins and rare large wins so `Σ p·payout` is unchanged but `Σ p·(payout − EV)²` moves. Re-verify EV equals the original after every reshape.

## Pitfalls / red flags
- Computing variance over wins only, or dropping zero-payout losses — this understates volatility badly.
- Treating RTP as a volatility proxy, or assuming equal-RTP games feel the same.
- Changing the distribution shape and forgetting to re-confirm `Σ p·payout` is still the target RTP (a reshape must be EV-neutral).
- Conflating hit frequency with RTP, or with average win size.
- Reading volatility off too few spins; high-volatility tails need far more samples to converge.

## Verification
- Sum of all `p` equals 1 and zero/loss outcomes are present; `Σ p·payout` matches the fixed RTP before and after tuning.
- Closed-form `Variance`/`SD` cross-checked against a Monte-Carlo run (`math-montecarlo-simulation`) within tolerance; hit frequency from enumeration matches the simulated win rate.
