---
name: math-montecarlo-simulation
description: Use when estimating a game's RTP, volatility, hit frequency, or rare-tail rates through Monte-Carlo trials, sizing samples, or accepting results against a target tolerance.
metadata:
  constraints: C4
---

# math-montecarlo-simulation

> **Core insight:** RTP acceptance requires a valid complete-round estimator, adequate samples, and the entire prespecified confidence interval inside the target tolerance band; target-in-CI alone proves no equivalence.

## When to use / When NOT
- Use for implementation simulations and sample-size planning.
- NOT for deriving an exact model (`math-rtp-modeling`) or treating historical simulation records as current proof.

## Process
1. Pin game code, action, resolved private math, strategy, stake, RNG protocol and target units. Public labels need cross-checking: MetaWin's production server (MSS) `games/cowAbductionPromo/gamePlay.ts` `playMain` selects private Promo math regardless of the passed variant. Normalize percent/fraction only after tracing the contract.
2. One trial is one completed round. Sum newly payable `response.win`, never display totals; count actual charged cost, including paid continuations. Construct money totals in exact integer atoms. Fixed-cost samples are `W/B`; variable-cost RTP is `ΣW/ΣB`, requiring a ratio-estimator CI. MSS `games/tartarus/gamePlay.ts` `playMain` pays continuation increments. MSS `common/stats/fingerprint.ts` `Fingerprint` defaults to first bet plus sideBets; adapt where that omits real charges.
3. Record reproducible RNG inputs and distinct worker streams. Require finite nonnegative gross-return samples, finite positive tolerance/z, safe-integer `n>=2`. Predeclare confidence, stopping plan and sample sufficiency using validated design SD or an independent pilot; unseen jackpots and zero observed variance cannot establish zero model variance.
4. Accumulate `(n,mean,M2)` with Welford; merge workers with Chan. Estimated variance is `M2/(n-1)`, distinct from enumerated population variance. WF `scripts/rtp.mjs` `monteCarlo(sampleFn,n,{z})` returns this sample variance and `h=z·sd/√n`. This normal approximation needs adequate tail coverage; dependent carried-state rounds require a dependence-aware interval.
5. Size with `requiredN(sd,tolerance,z)=ceil((z·sd/tolerance)^2)`. Call WF `scripts/rtp.mjs` `validateRtp` with validated `modelSd`: acceptance requires `abs(mean-target)+h<=tolerance` and `n>=requiredN(modelSd,tolerance,z)`. `withinCi` is diagnostic. A pass needs a variance bound (`modelSd`, or `maxPayout`); pass `minEventProbability` so the rarest paying event is expected at least 30 times, because a CI-width sample size can miss a rare prize entirely. Do not rerun until PASS.
6. Verify every action/variant/strategy at minimum and representative stakes, rounding/cap boundaries and both sides of currency-floor thresholds (guaranteed payout floors: `math-guaranteed-payout-floor`).
7. Audit reused collectors' moment stability and complete `mapResults`/`reduceResults`/`clearResults` round-trips; use actual accumulated counts, guarded denominators and half-open buckets. MSS `common/stats/fingerprint.ts` `Fingerprint` demonstrates worker fields. Pass explicit core limits; verify the whole process tree exits after interruption.

## Correctness constraints
- **C4:** A fixed spin count is insufficient. Require suitable confidence coverage, the declared sample-size gate and CI containment within tolerance; narrow intervals without supported tails are not proof.

## Pitfalls / red flags
Point-null compatibility called PASS; averaging variable-cost ratios; duplicated display wins; cancellation-prone raw moments; peeking; mixed modes; stale or thin-tail fingerprints.

## Verification
Retain commands, source/config provenance, completed counts, costs, mean, sample SD, confidence method and acceptance arithmetic. Check deterministic moments, invalid inputs, rare-tail coverage and single/multi-worker parity. Regenerate fresh FINAL fingerprints after math changes; retain unbinned moments separately from bins, label thin-tail/intermediate evidence and compare declared Φ/RoR/Gini/concentration benchmarks (fingerprint sign-off: `qa-game-fingerprints`). Use `qa-monte-carlo-cert` for evidence delivery.
