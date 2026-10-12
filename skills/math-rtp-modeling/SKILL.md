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
1. Trace the production generator and resolved behavioral SKU before choosing probabilities or target; pin code, action, variant, strategy, and stake. In MetaWin's production server (MSS), `games/bloodMoonRising/math/engine/drop-source.ts` `createCellSource` draws weighted cells; `games/bloodMoonRising/publicConfig.ts` `buildGameConfig` exposes cosmetic wheels. Public strips and labels are cross-checks, not runtime truth.
2. Define one observation as a complete settled round. Use exact integer atoms for charged cost B and gross return W, including all paid continuations and newly payable wins; never count display totals twice. MSS `games/tartarus/gamePlay.ts` `playMain` stores continuation `win = total − baseWin`. Fixed-cost RTP is E[W]/B; variable-cost RTP is ΣW/ΣB with a ratio-estimator CI, not the unweighted mean of W/B.
3. Enumerate the settled distribution when tractable: X=W/B for fixed B, RTP=ΣpX, edge=1−RTP, variance=Σp(X−RTP)². Include losses. `scripts/rtp.mjs` `rtpFromOutcomes` expects normalized payouts and probabilities summing to one; it returns RTP, edge, hit frequency, population variance, and SD, each computed exactly and rounded once to the nearest double, so row order cannot change a digit.
4. Model rejection scope, trigger variable, guards, retry budget, cap, and rounding in order. MSS `games/perseus/gamePlay.ts` `playMain` redraws once; `games/perseus/gameLogic.ts` `loadFreeGames` retries with `checkDiscard=false`. Discard need not lower RTP: its effect depends on covariance with the full paid reward. Conditional enumeration or state equations can remain possible; validated Monte-Carlo reports an estimate and CI.
5. Recompute the complete model after weight changes. For one normalized weighted draw with conditional returns c, μ=Σwᵢcᵢ/Σwᵢ; adding t to wₖ changes μ by t(cₖ−μ)/(Σwᵢ+t). This identity assumes the cᵢ stay fixed.

## Correctness constraints
- **C1:** Multilinearity holds in normalized probabilities for independent single-draw variables with fixed payoffs. Raw weights are rational; repeated shared parameters, retries, and state dependence need not preserve multilinearity. Direction and magnitude require full recomputation.
- **C14:** Select approved variants within their approval scope and display the active RTP. An outside-RNG promotion differs from a math-model change: MSS `games/zeusPromo/gamePlay.ts` `playMain` selects private Promo weights. Bind evidence and applicable recertification to that actual model.

## Pitfalls / red flags
Win-fraction scaling; omitted losses; assumed tiny effects; cosmetic reels as probability evidence; public/private discrepancies left unexplained.

## Verification
Keep model inputs and units, enumerated moments or simulation CIs, and deterministic checks of rejection, continuation accounting, caps, and wallet-grid rounding. Compare the resolved generator with `qa-math-validation`.
