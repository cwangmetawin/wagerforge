---
name: qa-math-validation
description: Use when checking implemented RTP against a certified model, validating payout invariants, or gating action, variant, strategy and stake changes.
metadata:
  constraints: C4, C6, C14
---

# qa-math-validation
> **Core insight:** Validate the resolved behavioral SKU over complete paid rounds; acceptance requires the entire confidence interval inside its certified tolerance band, with sufficient independent samples.

## When to use / When NOT

- Use for implementation acceptance, payout boundaries and variant regressions.
- Model design: `math-rtp-modeling`; harness and evidence lifecycle: `qa-monte-carlo-cert`; output fixtures: `qa-regression-golden`.

## Process

1. Pin registration, action, strategy, wallet grid, stake, private math and fallback selectors. Obtain the target from that SKU's certified behavioral model; cross-check displayed RTP separately, including percent/fraction units. MetaWin's production server (MSS) `games/zeusPromo/gamePlay.ts` `playMain` selects private Promo math despite the public variant; `games/highLowHit/rtp97.ts` `rtp97` uses percent units.
2. Execute real API-round resolution through termination, retaining state and all payment legs. Sum newly payable `response.win`, excluding display totals. Track actual charged cost, including paid continuations, side bets and full feature-buy cost, in exact integer atoms. MSS `games/tartarus/gamePlay.ts` `playMain` stores continuation payment as total minus already-paid base win; `games/perseus/index.ts` `server.play` normalizes buy stakes internally.
3. Define the estimator: fixed cost B uses mean(W/B); variable cost uses ΣW/ΣB with a paired-round ratio CI. Convert only dimensionless ratios to approximate statistics; preserve exact atom totals. Buy/base RTP parity is a product policy, not a theorem. Bankroll return and internal per-stake RTP need separate denominators (bankroll-run games: `build-bankroll-run-games`). Check collector costs: MSS `docs/GDK_CONTRACT.md` “The sim runner” documents first bet plus sideBets, omitting later bet charges.
4. Predeclare confidence, tolerance, sample size and investigation policy. Use `scripts/rtp.mjs` `validateRtp` for fixed-cost normalized samples, with `modelSd` (or `maxPayout`) and `minEventProbability` for the rarest paying event. Its sample variance uses n−1; `withinCi` is diagnostic. Check independence and tail coverage; unexplained zero variance cannot establish convergence.
5. Reject non-finite statistics, invalid probabilities/payouts, off-grid money, nonpositive CI parameters and unsafe counts. Verify stable moments against high-mean, low-variance inputs.
6. Exercise every action/variant/strategy at minimum and representative stakes, wallet grids, both sides of floor thresholds, rounding order, caps, termination and natural/buy routes (guaranteed-payout floors: `math-guaranteed-payout-floor`). MSS `games/zeus100k/gamePlay.ts` `fgBandReject` gates floor-related rejection by stake. Synchronize ordinary public/private math and affected forks; document Promo selector exceptions and block misleading displayed economics.

## Correctness constraints

- **C4:** Require |mean−target| + CI half-width ≤ tolerance and n ≥ `requiredN(modelSd, tolerance, z)`. Finite-sample uncertainty and model volatility determine sufficiency.
- **C6:** Simplified retrigger formulas require subcritical, iid, non-path-dependent assumptions; otherwise use validated state analysis or full-code simulation with appropriate CIs.
- **C14:** Approved variant selection preserves its certification scope; changing Promo weights changes the model and requires its own certification. Display the certified active SKU.

## Pitfalls / red flags

Point-target compatibility as acceptance; truncated rounds; duplicate base payment; silent variant fallback; IID assumptions for carried state.

## Verification

Retain source/dependency hash, requests, payment/cost reconciliation, boundary results, CI calculations and failing drift/undersampling controls. Missing certification evidence blocks acceptance.
