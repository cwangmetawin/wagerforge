---
name: math-volatility-tuning
description: Use when classifying or tuning a game volatility/variance, hit frequency, or payout distribution shape while holding RTP fixed. Keywords volatility, variance, hit frequency, distribution.
constraints: C4
---

# math-volatility-tuning

## When to use / When NOT
- Use when: classifying low/medium/high volatility, reshaping the payout distribution, or moving hit frequency at constant RTP.
- NOT for: deriving/recalibrating RTP/house edge itself (→ `math-rtp-modeling`); empirically validating an implementation (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
TS + Node + decimal.js over an outcome list `{p, payout}`. Other stacks: same per-spin variance formula over the full enumerated (or weight-derived) outcome set.

## Process
1. Build the COMPLETE outcome set including every zero/loss outcome — losing spins carry the bulk of the probability mass.
2. `EV = Σ p·payout` (= RTP·bet). `Variance = Σ p·(payout − EV)²`; `SD = √Variance`. Over N spins, variance scales ×N, SD ×√N.
3. Classify by SD-per-spin (or tail mass / top-prize weight), not RTP — RTP is orthogonal, so two identical-RTP games can sit at opposite volatility extremes.
4. `hitFrequency = winning ÷ total outcomes` (or Σp over winning outcomes), independent of RTP: raise or lower it without touching RTP.
5. Tune volatility at fixed RTP: redistribute payout mass between frequent small wins and rare large wins so `Σ p·payout` is unchanged but `Σ p·(payout − EV)²` moves. Re-verify EV equals the original after every reshape.
6. Production tail-shaping lever (server-side ONLY): a "win discard" / high-win-rejection rule rolls per payout band (e.g. wins ≥1250×: per-band `{min,max,probability}`) and REGENERATES the whole outcome on a hit. It thins the high tail (lowers max-win frequency/variance) but is path-dependent and DROPS RTP — re-tune the model and re-certify by large-N sim. Never reproduce on the client.

## Correctness constraints
- **[C4]** Any tail reshape — distribution redistribution OR a path-dependent server-side win-discard rule — is unproven until re-validated by a convergent large-N Monte-Carlo run; closed-form math cannot capture the regenerate-on-hit path dependence. Win-discard is server-side only; the client renders server-resolved results and never recomputes outcomes/RTP/volatility.

## Pitfalls / red flags
- Computing variance over wins only, or dropping zero-payout losses — badly understates volatility.
- Treating RTP as a volatility proxy, or assuming equal-RTP games feel the same.
- Reshaping the distribution but forgetting to re-confirm `Σ p·payout` is still the target RTP (a reshape must be EV-neutral; a win-discard rule is NOT — it lowers RTP, must be compensated, and is server-only, never client-side).
- Conflating hit frequency with RTP, or with average win size.
- Reading volatility off too few spins; high-volatility tails need many more samples to converge.

## Verification
- All `p` sum to 1, zero/loss outcomes present; `Σ p·payout` matches the fixed RTP before and after tuning.
- Closed-form `Variance`/`SD` cross-checked against a Monte-Carlo run (`math-montecarlo-simulation`) within tolerance; enumerated hit frequency matches the simulated win rate.
- Cross-check shape against the RGS stat collectors (Variance/SD, HitFrequency, PayoutDistribution intervals, HighWinRates tiers, WinPercentiles) from the server's Monte-Carlo stats run — source of truth for tail mass and band frequencies.
