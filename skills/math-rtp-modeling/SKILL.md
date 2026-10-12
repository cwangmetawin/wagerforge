---
name: math-rtp-modeling
description: Use when deriving RTP, house edge, hit frequency, or the effect of reel weights, paytables, rejection, runtime variants, and outcome generators.
metadata:
  constraints: C1, C14
---

# math-rtp-modeling

> **Core insight:** RTP belongs to the resolved outcome law and actual charged cost; raw weights, retries, caps, and state can change it materially in either direction.

## When to use / When NOT
- Use for theoretical return, distribution moments, and sensitivity to math changes.
- Implementation convergence belongs to `math-montecarlo-simulation` and `qa-math-validation`.

## Process
1. Trace the runtime generator and behavioral SKU before choosing probabilities or target; pin code, action, variant, strategy, stake. MetaWin's production server (MSS) `games/bloodMoonRising/math/engine/drop-source.ts` `createCellSource` draws weighted cells; `games/bloodMoonRising/publicConfig.ts` `buildGameConfig` exposes cosmetic wheels. Public strips/labels only cross-check runtime truth. For shared-height rounds, draw height before strip windows and recompute ways, coin population and retriggers; independent heights or short-board odds distort exposure. Verify all heights, wrapping stops and complete paid features: MSS `games/cowAbduction/gameLogic.ts` `loadFreeGames`.
2. Observe complete settled rounds. Use exact atoms for charged cost B and gross return W, including paid continuations and newly payable wins; never double-count display totals. MSS `games/tartarus/gamePlay.ts` `playMain` stores continuation `win = total − baseWin`. Fixed-cost RTP is E[W]/B; variable-cost RTP is ΣW/ΣB with ratio-estimator CI, not mean(W/B).
3. Enumerate tractable settled distributions, including losses: X=W/B for fixed B, RTP=ΣpX, edge=1−RTP, variance=Σp(X−RTP)². `scripts/rtp.mjs` `rtpFromOutcomes` expects normalized payouts and probabilities summing to one; RTP, edge, hit frequency, population variance and SD are exact, rounded once to nearest double, invariant to row order. Sample a hidden regime once per free spin (each FG round; a bought spin once), shared by that spin's landing/lift jackpot draws; separate regime odds, conditional tier weights and fixed values. Per-coin regimes lose dependence; verify hot/cold fixtures and buy/free mixtures: MSS `games/cowAbduction/gameLogic.ts` `rollJackpot`.
4. Model rejection scope, trigger, guards, retry budget, cap and rounding in order. MSS `games/perseus/gamePlay.ts` `playMain` redraws once; `games/perseus/gameLogic.ts` `loadFreeGames` retries with `checkDiscard=false`. Discard's RTP effect depends on covariance with full paid reward. Conditional enumeration/state equations may remain possible; validated Monte-Carlo gives estimates/CIs. Preserve draws outside retries while resetting stops, coins and counters. MSS `games/piggyBank/gameLogic.ts` `getInitGameView` samples role before retries; its two-gold-wild/FG-trigger rejection ignores role. Verify low-scatter triggers, retriggers and collecting-role collisions; moving-only rejection changes the law.
5. Recompute fully after weight changes. For one normalized weighted draw with conditional returns c, μ=Σwᵢcᵢ/Σwᵢ; adding t to wₖ changes μ by t(cₖ−μ)/(Σwᵢ+t), assuming fixed cᵢ.

## Correctness constraints
- **C1:** Multilinearity holds in normalized probabilities for independent single-draw variables with fixed payoffs. Raw weights are rational; repeated shared parameters, retries and state dependence need not preserve multilinearity. Recompute direction/magnitude fully.
- **C14:** Select approved variants within their approval scope and display the active RTP. An outside-RNG promotion differs from a math-model change: MSS `games/zeusPromo/gamePlay.ts` `playMain` selects private Promo weights. Bind evidence and applicable recertification to that actual model.

## Pitfalls / red flags
Win-fraction scaling; omitted losses; assumed tiny effects; cosmetic reels as probability evidence; public/private discrepancies left unexplained.

## Verification
Keep model inputs and units, enumerated moments or simulation CIs, and deterministic checks of rejection, continuation accounting, caps, and wallet-grid rounding. Compare the resolved generator with `qa-math-validation`.
