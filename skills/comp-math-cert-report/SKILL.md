---
name: comp-math-cert-report
description: Use when assembling math certification evidence for resolved game SKUs, including RTP equivalence, independent-round statistics, payout reachability and current player rules.
metadata:
  constraints: C4
---

# comp-math-cert-report
> **Core insight:** A certification report binds each claim to the paid behavior, independent sampling unit and reproducible evidence; statistical agreement alone proves neither max-win reachability nor external approval.

## When to use / When NOT

- Use for reviewable math evidence and certification handoffs.
- Model derivation: `math-rtp-modeling`; harness: `qa-monte-carlo-cert`; approval/change scope: `comp-rtp-certification`.

## Process

1. Identify registered game/SKU, action, variant, resolved private math, strategy, stake, wallet grid and fallback behavior. Bind evidence to source/config hashes covering imported behavioral modules. State the certified target's provenance and displayed RTP separately. MetaWin's production server (MSS) `games/tothetopPromo/index.ts` `server.config` ignores variant and `server.play` selects private math via `_math`; a public label cannot choose the certification target.
2. State gross-return units, actual charged cost and incremental payment semantics in exact integer atoms. Include complete API rounds through termination, paid continuations and feature-buy normalization. MSS `games/tartarus/gamePlay.ts` `playMain` separates continuation payment from display totals. Fixed-cost RTP is E[W]/B; variable-cost RTP is ΣW/ΣB with a paired-round ratio CI. Convert only dimensionless ratios to approximate statistics; preserve exact atom totals. Report bankroll return and internal per-stake RTP separately (bankroll-run games: `build-bankroll-run-games`).
3. Choose closed form, finite enumeration/dynamic programming or validated full-code Monte Carlo. Label exact values versus estimates and state assumptions, strategy dependence, rounding, caps and termination. Include RTP/edge, hit frequency, volatility and max payout in declared units; do not demand exhaustive closed forms for every path-dependent game.
4. Report independent completed-round count, seed/replay inputs, losses, exact totals, stable moments, sample SD, confidence method, tolerance and planned N. Within-round steps/hands are dependent; use the entire run or an appropriate dependence-aware estimator. Fixed-cost estimated variance divides by n−1; variable-cost ratios require paired cost/payment uncertainty.
5. Apply C4. A CI excluding the theoretical target is a statistical discrepancy, not proof of an implementation bug; investigate under the predeclared plan and corroborate defects independently. Never repeat until passing.
6. Separate body, tail and segment evidence. “Never hit” means zero observations; report N and a probability confidence bound. Prove reachability/impossibility separately via path analysis, enumeration or strict replay. MSS `common/stats/index.ts` `myHitFrequency.message` formats zero hits; `myVariance` and `PayoutDistribution` are separate collectors. Reconcile zero counts and first/second moments with the RTP population; a loss bucket proves no variance inclusion.
7. Attach current player rules checked against active payout code: highest/sum/product, caps/forfeiture, ties, abandonment and strategy-dependent RTP (player-rules contract: `qa-game-rules-contract`). Update rules with each behavior-changing math edit. Gate release on absent live RNG/debug traces or future-outcome leakage; MSS `docs/BEST_PRACTICES.md` “Player-Facing Game Rules Doc” and “Security” ground these obligations.

## Correctness constraints

- **C4:** Fixed-cost acceptance requires |mean−target| + CI half-width ≤ tolerance and n ≥ `requiredN(modelSd, tolerance, z)` from `scripts/rtp.mjs`; use an appropriate ratio/dependence-aware CI for other estimators.

## Pitfalls / red flags

Stale hashes; advertised labels as targets; sampled maxima as proofs; canned runner CLs without population checks.

## Verification

Recompute estimators, intervals, counts and payment reconciliation; reproduce boundary paths. Record approval status and unrun gates explicitly; missing evidence blocks certification readiness.
