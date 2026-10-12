---
name: math-lines-ways-cluster
description: Use when agents implement or audit paylines, unrestricted ways, connected betways, adjacency clusters, count-anywhere OAK, wild multiplier policies, or persistent multiplier grids.
---

# math-lines-ways-cluster
> **Core insight:** Choose the evaluator and multiplier policy explicitly; Sweety-style clusters sum only current cells at least 2×, fall back to 1×, and pay before activating or doubling cells for later waves.

## When to use / When NOT

- Use for server evaluation, substitution, connectivity, paytable lookup, and grid multiplier ordering.
- Use `math-rtp-modeling` for probabilities/RTP; `math-cascade-tumble` for orchestration.

## Process

1. Specify evaluator, eligible symbols, minimum count, wild substitution, overlap policy, count offset, paytable scaler, stake basis and rounding. Settle money in integer atoms; statistical models may use normalized returns. Assign cash and collector evaluators separately: trace payout accumulators, not unused detectors. MetaWin's production server (MSS) `games/perseus/gameLogic.ts` `loadBaseGame` pays lines; ways supply chest values.
2. **Paylines:** sum eligible contiguous runs on predefined lines. Declare highest/sum/product for multiple wild multipliers. MSS `games/fruitNudge/gameLogic.ts` `detectPaylineWins` uses highest, index `repeats−1`, and total-bet normalization by `totalPaylines`; specimen rules, not defaults. Evaluate original-board line/scatter awards before separately adding expanded-symbol awards under their adjacency policy. MSS `games/bookOfDead/gameLogic.ts` `getGameView` allows separated reels; repeated occurrences on one reel do not add paying reels.
3. **Unrestricted ways:** multiply eligible counts over consecutive paying reels from the start; `3×2×1` gives six ways. **Connected ways:** enforce connections, backward-prune cells unable to reach the last paying reel, then multiply survivors. MSS `games/piggyBank/gameLogic.ts` `detectConnectedBetwayWins` does this. For overlapping collector ways, deduplicate copied collector balances by position, exclude the receiver, and retain per-win symbol increments; do not deduplicate whole wins. MSS `games/perseus/gameLogic.ts` `loadBaseGame` implements this distinction.
4. **Adjacency clusters:** flood-fill declared neighbors. MSS `games/sweetyCluster/gameLogic.ts` `floodFill` uses four orthogonal neighbors; `detectClusterWin` requires five symbols on 7×7. **Count-anywhere OAK:** count eligible symbols without adjacency, as MSS `games/zeus/gameLogic.ts` `detectWin` does.
5. **Persistent grid:** separate server values/lifecycle from display sentinels. MSS `games/sweetyCluster/gameLogic.ts` `detectClusterWin` sums current winning-cell `m>=2`, pays `basePay×(sum>0 ? sum : 1)`, then activates `−1→1` or doubles cells, capped at 1024. Plain/new 1× adds nothing. `loadFreeGames` carries the grid; base rounds reset it. Snapshot mutable state. New scatter columns charge before evaluation: seed inactive cells, conditionally double capped marks; retained scatters never recharge. MSS `games/riseOfTheWolf/gameLogic.ts` `getNextWaveWeighted` uses configured seed/seed-only policy, separate from post-pay winning-cell upgrades.

## Pitfalls / red flags

- Treating OAK as adjacency clusters, or connected ways as unrestricted ways.
- Summing ways counts, including dead-end branches, or multiplying all wild multipliers without a game rule.
- Paying zero on a first cluster, adding 1× marks, or applying winning-cell upgrades to the current hit.
- Treating expansion as ordinary substitution, cashing collector evidence, or recollecting shared balances.
- Universal cluster minima, sentinels, scalers or stake bases; authoritative client wins.

## Verification

- Hand-check line, six-way, disconnected OAK, diagonal-only cluster, connected dead-end, separated expansion reels and overlapping/chained collectors.
- Check highest-wild selection, index/scaler/stake normalization, and cash versus collector totals.
- Grid: no eligible multiplier gives base pay; `[−1,1,2,4]` contributes six; winning-cell upgrades affect later waves. Verify persistence/reset, cap, immutable history, newly landed versus retained scatters, seed-only mode and seeds below payout eligibility.
