---
name: econ-rtp-cost
description: Use when reconciling game RTP components, pricing mode-specific margin, tracing public versus private math, or deciding whether a variant, Promo, or volatility change needs certification review. Keywords RTP cost, charged stake, private math, Promo, C14.
metadata:
  constraints: C14
---

# econ-rtp-cost
> **Core insight:** RTP belongs to an executed money path and its actual charged cost; labels, cumulative display wins, and an unchanged mean cannot substitute for active-math evidence.

## When to use / When NOT

- Use for per-mode RTP decomposition, aggregate book margin, promotional attribution, and math change control.
- Not for deriving probabilities (`math-rtp-modeling`) or progressive funding (`econ-progressive-jackpot`).

## Process

1. **Resolve behavior and units.** Pin game registration, action, variant, strategy, stake, runtime private math, and target provenance. Cross-check declarations after normalizing contract-specific units. MetaWin's production server (MSS) `games/chase/rtp97.ts` `targetRTP` is .97; MSS `games/highLowHit/rtp97.ts` `rtp97.targetRTP` is 97. Neither field enforces payouts. Trace selector/fallback branches before choosing a target; report declaration/runtime discrepancies.
2. **Count complete-round cashflows.** Let W sum newly payable `response.win`, and B sum actual charged stake. Reconcile authoritative money in exact integer atoms. MSS `games/tartarus/gamePlay.ts` `playMain` subtracts paid base wins from continuation credits while retaining cumulative `totalWin/clientWin`; summing those display totals double-pays. MSS `common/stats/fingerprint.ts` `Fingerprint` defaults cost to first bet plus sideBets; later `bet` fields are ignored, so verify that collector cost matches the debit contract.
3. **Decompose within one mode.** Fixed-cost RTP is `E[W]/B`; variable-cost RTP is `sum(W)/sum(B)` with a ratio-estimator CI. Allocate disjoint credited components after modifiers, rejection, rounding, and caps; do not add a multiplier again to its resolved win. Across modes, weight by actual charged turnover: `bookRTP = sum(B_mode*RTP_mode)/sum(B_mode)`, not an unweighted mean or sum of alternative routes.
4. **Validate every money path.** Exercise base, boost, buys, continuation strategies, minimum/representative stakes, rounding, and caps. Absolute currency floors need tests below/at/above their stake threshold; bankroll return needs a separate internal-turnover denominator (absolute payout floors: `math-guaranteed-payout-floor`; bankroll-run games: `build-bankroll-run-games`). Use `qa-math-validation` and `qa-monte-carlo-cert` for fresh real-code evidence, declared precision, and tolerance equivalence; raw iteration counts are insufficient.
5. **Separate external promotions from Promo math.** External grants affect margin/LTV; price actual stopped turnover and withdrawal terms via `econ-bonus-design`. Private selector/weight changes alter game math. MSS `games/cowAbductionPromo/gamePlay.ts` `playMain` always selects `myRtp1075MathConfig`, while MSS `games/cowAbductionPromo/rtp1075MathConfig.ts` `rtpValues` retain parent declarations. Document this specimen mismatch; never recommend hiding active economics. Ordinary private/public behavioral copies and affected forks need consistency checks; explicit Promo exceptions require separate evidence.

## Correctness constraints

- **C14:** A switch among pre-certified variants within verified approval scope can use that approval while displaying the active percent. Off-RNG promotions do not change certified game RTP. Weights, paytables, feature/selector logic, or payout-rule changes require math-model review, even when EV is preserved. Claim a re-certification exemption only from verified applicable approval evidence (`comp-rtp-certification`).

## Pitfalls / red flags

Fraction/percent confusion; public labels treated as truth; cumulative win duplication; wrong buy denominator; missing caps/floors; nominal-WR bonus costs; constant-RTP volatility retunes assumed exempt.

## Verification

Retain the mode/selector/cost matrix, reconciled component totals, stake-boundary results, CI methodology, declaration discrepancy log, and applicable certification decision. Repository sim records are not new runs or lab approvals.
