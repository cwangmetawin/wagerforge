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
1. Define a complete-round gross return `X=W/B` at fixed charged cost; include zero-payout losses and all payable continuation increments. Keep money in exact integer atoms before statistical normalization. Enumerate the full distribution when feasible: `μ=ΣpX`, `σ²=Σp(X−μ)²`, `HF=Σp·1[X>0]`. Distinguish positive payout from stake-covering return `X>=1`; uniform outcome counts apply only to equiprobable outcomes.
2. Specify shape relative to named siblings: SD, hit frequency, tail mass, Gini/concentration and bankroll drain. There are no universal low/medium/high SD thresholds. For iid rounds, aggregate variance scales by N; carried state invalidates that shortcut. An EV-neutral reshape preserves `ΣpX`; confirm the complete paid model after caps, rounding and retries.
3. Model the rejection trigger, regenerated scope, retry limit, replacement law and feature/cap guards exactly. For one independent replacement from the same distribution, `E_q[g]=E_p[g]−Cov_p(d,g)`, where d is discard probability and g is paid reward; the covariance controls direction. MetaWin's production server (MSS) `games/perseus/gamePlay.ts` `playMain` redraws base once; MSS `games/perseus/gameLogic.ts` `loadFreeGames` disables discard on the replacement. Neither is infinite rejection.
4. Infinite rejection instead gives `q(z)=p(z)(1−d(z))/(1−E[d])` when acceptance has positive probability. Finite-state models may admit `V=r+QV`; retry or path dependence does not automatically forbid analytic treatment. Otherwise estimate the implemented complete-round distribution with `math-montecarlo-simulation`, report CIs, and retune if RTP moves. Outcomes remain server-authoritative.
5. Record source/config dependencies, action, variant, strategy, stake, actual round count and confidence method. Preserve unbinned moments alongside histogram bins. MSS `common/stats/fingerprint.ts` `Fingerprint` collects both; "exact" means unbinned empirical moments, not exact theoretical RTP. Use fresh FINAL records after each math change: MSS `tools/profile.js` `cmdFinalize` rejects stale local-source hashes. Check external dependencies separately (fingerprint sign-off: `qa-game-fingerprints`).
6. Compare specified Φ/RoR/Gini/concentration targets, not RTP alone. MSS `tools/profile.js` `cmdDrain` performs seeded histogram-based analysis and flags censored paths; MSS `common/stats/index.ts` `DrainSurvival` measures session bust probability. Document normalization, bankroll, session length, seed, censoring and tail sample support; marginal iid resampling cannot preserve inter-round dependence.

## Correctness constraints
- **C4:** Simulation sufficiency depends on confidence precision and tail support, never a fixed spin count. RTP acceptance requires CI containment in the declared tolerance band and adequate planned samples.

## Pitfalls / red flags
Wins-only variance; RTP as a volatility proxy; retries assumed EV-neutral or necessarily RTP-reducing; stale fingerprints; unseen rare wins reported impossible; thin-tail drain rankings.

## Verification
Reconcile total probability, losses, first/second moments and hit counts. Verify one-retry versus unlimited-retry fixtures and unchanged EV for intended neutral reshapes. Deliver per-mode/stake RTP CIs plus fresh distribution artifacts and named-benchmark drain comparisons; use `qa-monte-carlo-cert` for sign-off evidence.
