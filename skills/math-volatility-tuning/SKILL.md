---
name: math-volatility-tuning
description: Use when tuning payout variance, hit frequency, rare-win concentration, or bankroll drain against named game benchmarks while preserving a declared RTP target, including outcome-retry rules.
metadata:
  constraints: C4
---

# math-volatility-tuning

> **Core insight:** Volatility belongs to the complete return distribution; retries change that distribution according to their scope and budget, so neither RTP nor variance has a universal direction.

## When to use / When NOT
- Use for distribution shaping, tail concentration and bankroll-drain targets.
- NOT for deriving the initial RTP model (`math-rtp-modeling`) or accepting an implementation from shape metrics alone (`math-montecarlo-simulation`).

## Process
1. Define complete-round gross return `X=W/B` at fixed cost; include zero-payout losses and payable continuation increments. Keep money in exact atoms before normalization. Enumerate when feasible: `μ=ΣpX`, `σ²=Σp(X−μ)²`, `HF=Σp·1[X>0]`. Positive payout differs from stake-covering `X>=1`; uniform counts require equiprobable outcomes.
2. Compare named siblings by SD, hit frequency, tail mass, Gini/concentration and bankroll drain. No universal low/medium/high SD thresholds exist. Aggregate variance scales by N only for iid rounds, not carried state. EV-neutral reshaping preserves `ΣpX`; confirm the full paid model after caps, rounding/retries.
3. Model rejection trigger, regenerated scope, retry limit, replacement law and feature/cap guards. One independent same-law replacement gives `E_q[g]=E_p[g]−Cov_p(d,g)` for discard probability d and paid reward g; covariance controls direction. MetaWin's production server (MSS) `games/perseus/gamePlay.ts` `playMain` redraws base once; MSS `games/perseus/gameLogic.ts` `loadFreeGames` disables replacement discard. Feature replay retains entry, remeasures each replacement against ordered bands, exempts cap hits and has finite retries, never minimum-payout guarantees. Verify feature-increment/spin versus whole-round/buy measures and exhaustion: MSS `games/sheriffNudge/gamePlay.ts` `resolveFeature`. Forced-dead refills preserve survivors, reuse accepted gravity snapshots, skip detonations/overlay changes and pay residual wins. Reusing rejected boards creates unpaid cascades; verify survivor wins, exhaustion and persistent forcing: MSS `games/metaStrike/gameLogic.ts` `loadFreeGames`.
4. Infinite rejection gives `q(z)=p(z)(1−d(z))/(1−E[d])` with positive acceptance probability. Finite-state models may admit `V=r+QV`; retry/path dependence need not forbid analysis. Otherwise estimate complete-round distributions with `math-montecarlo-simulation`, report CIs and retune changed RTP. Outcomes remain server-authoritative.
5. Record source/config dependencies, action, variant, strategy, stake, actual round count and confidence method. Keep unbinned moments and histograms. MSS `common/stats/fingerprint.ts` `Fingerprint` collects both; "exact" means empirical unbinned moments, not theoretical exactness. Refresh FINAL records after math changes: MSS `tools/profile.js` `cmdFinalize` rejects stale local-source hashes. Check external dependencies separately; `qa-game-fingerprints` governs sign-off.
6. Compare Φ/RoR/Gini/concentration targets, not RTP alone. MSS `tools/profile.js` `cmdDrain` runs seeded histogram analysis, flags censored paths; MSS `common/stats/index.ts` `DrainSurvival` measures session bust probability. Document normalization, bankroll, session length, seed, censoring, tail support; marginal iid resampling loses inter-round dependence.

## Correctness constraints
- **C4:** Simulation sufficiency depends on confidence precision and tail support, never a fixed spin count. RTP acceptance requires CI containment in the declared tolerance band and adequate planned samples.

## Pitfalls / red flags
Wins-only variance; RTP as a volatility proxy; retries assumed EV-neutral or necessarily RTP-reducing; stale fingerprints; unseen rare wins reported impossible; thin-tail drain rankings.

## Verification
Reconcile total probability, losses, first/second moments and hit counts. Verify one-retry versus unlimited-retry fixtures and unchanged EV for intended neutral reshapes. Deliver per-mode/stake RTP CIs plus fresh distribution artifacts and named-benchmark drain comparisons; use `qa-monte-carlo-cert` for sign-off evidence.
