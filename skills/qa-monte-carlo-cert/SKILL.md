---
name: qa-monte-carlo-cert
description: Use when building real-code Monte Carlo certification harnesses, validating statistical collectors, or preserving reproducible RTP and tail evidence.
metadata:
  constraints: C4, C6
---

# qa-monte-carlo-cert
> **Core insight:** Certify complete independent rounds with the correct cost estimator and fresh behavioral provenance; body convergence, rare-tail evidence and deterministic replay answer separate questions.

## When to use / When NOT

- Use for certification harnesses, collector reduction and evidence retention.
- Target derivation: `math-rtp-modeling`; payout assertions: `qa-math-validation`; output replay: `qa-regression-golden`; RNG fitness: `qa-rng-statistical`.

## Process

1. Resolve registration, action, variant/private math, strategy, wallet grid and charged stake. Choose closed form, finite enumeration/dynamic programming, or full real-code Monte Carlo according to the model. Record assumptions and independently justified targets; path dependence does not mandate exhaustive enumeration.
2. Drive complete rounds through real play/continuation APIs; tick games require the multiplayer runner. Sum incremental payments and actual costs in exact integer atoms. MetaWin's production server (MSS) `games/tartarus/gamePlay.ts` `playMain` subtracts already-paid base win; `docs/GDK_CONTRACT.md` “The sim runner” documents the first-bet-plus-sideBets denominator limitation.
3. Fixed-cost samples are W/B; variable-cost RTP is ΣW/ΣB with a paired-round ratio CI. Convert only dimensionless ratios to approximate statistics; preserve exact atom totals. Certify bought routes separately; buy/base parity is a declared policy. Separate bankroll return from internal per-stake RTP; treat dependent hands as one run (bankroll-run games: `build-bankroll-run-games`). Carried state needs dependence-aware sampling, not an IID interval.
4. Predeclare confidence, tolerance, sample plan and discrepancy handling. Use Welford moments and Chan worker merges; sample variance divides by n−1. For fixed-cost samples, `scripts/rtp.mjs` exports `monteCarlo`, `requiredN` and `validateRtp`; supply `modelSd` (or `maxPayout`) and the rarest paying event's `minEventProbability`. A CI miss prompts investigation, not proof of a bug or repeated reruns until passing.
5. Reuse vetted collectors and test every field through map/reduce/clear, single/multi-core parity, actual round counts, zero denominators and half-open buckets. MSS `common/stats/index.ts` `PayoutDistribution` supplies bucket mechanics; verify JSON `value()` and terminal `message()` both preserve required evidence. Unbinned moments need stable recomputation; a histogram cannot certify variance.
6. Preserve raw logs, replay inputs, counts, confidence method and a hash covering behavioral code/config plus imported modules. Maintain separate body/tail and per-segment sample counts; disclose binning, thin tails and censoring. Review Φ/RoR/Gini/concentration against named benchmarks; finalize fresh artifacts after math changes (fingerprints: `qa-game-fingerprints`). MSS `common/stats/fingerprint.ts` `Fingerprint` diverts final-file writes; `tools/profile.js` `cmdFinalize` checks a shallow hash, requiring additional dependency provenance.
7. Set explicit resource limits and retain long-run command/log ownership. After interruption, terminate the specific simulation roots and survivors; verify that process tree is gone. MSS `docs/BEST_PRACTICES.md` “Running Long Simulations” records orphaned-worker hazards.

## Correctness constraints

- **C4:** Require |mean−target| + CI half-width ≤ tolerance and n ≥ `requiredN(modelSd, tolerance, z)`; no universal spin count. Zero observed variance needs independent justification.
- **C6:** Simplified retrigger formulas require subcritical iid assumptions without path dependence; use validated state analysis or full-code simulation otherwise.

## Pitfalls / red flags

Dropped losses; averaged worker SDs; stale imported engines; tail claims from body-only runs; unrecorded randomness.

## Verification

Reproduce inputs and totals, validate collector merges and CI arithmetic, run drift/undersampling controls, and retain final artifacts with cleanup evidence.
