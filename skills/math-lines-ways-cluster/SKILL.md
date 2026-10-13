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
3. **Unrestricted ways:** multiply eligible counts over consecutive paying reels from the start; `3×2×1` gives six ways. **Connected ways:** enforce connections, declare dead-end policy, then multiply retained counts: MSS `games/barValhalla/gameLogic.ts` retains forward dead ends; `games/piggyBank/gameLogic.ts` `detectConnectedBetwayWins` reads wild maxima, then backward-prunes. For overlapping collector ways, deduplicate copied collector balances by position, exclude the receiver, and retain per-win symbol increments; do not deduplicate whole wins. MSS `games/perseus/gameLogic.ts` `loadBaseGame` implements this distinction.
4. **Adjacency clusters:** flood-fill declared neighbors. MSS `games/sweetyCluster/gameLogic.ts` `floodFill` uses four orthogonal neighbors; `detectClusterWin` requires five symbols on 7×7. **Count-anywhere OAK:** count eligible symbols without adjacency, as MSS `games/zeus/gameLogic.ts` `detectWin` does.
5. **Persistent grid:** separate server values/lifecycle from display sentinels. MSS `games/sweetyCluster/gameLogic.ts` `detectClusterWin` sums pre-upgrade winning-cell `m>=2` (`−1` and 1× add nothing), pays `basePay×(sum>0 ? sum : 1)` with server rounding, then activates `−1→1` or doubles active winning cells (per-cell cap 1024) for later evaluations. Sweety and Wolf grids start fresh per base spin and feature (superbonus: all x2); feature grids persist through free spins, cascades and retriggers, never inheriting base grids. Snapshot mutable state. Rise of the Wolf games only, with column surge enabled: `games/riseOfTheWolf/gameLogic.ts` charges a newly landed scatter column before evaluation, seeding inactive cells (configured, now 1); marks double (cap 1024) unless free-game `fgSeedOnly=true`; retained scatters never resurge within that spin. Wolf pays post-surge, pre-upgrade values by the same rule.

## Pitfalls / red flags

- Treating OAK as adjacency clusters, or connected ways as unrestricted ways.
- Summing ways counts, undeclared dead-end handling, or multiplying wild multipliers without a rule.
- Paying zero on a first cluster, adding 1× marks, or applying winning-cell upgrades to the current hit.
- Treating expansion as ordinary substitution, cashing collector evidence, or recollecting shared balances.
- Universal cluster minima, sentinels, scalers or stake bases; authoritative client wins.

## Verification

- Hand-check line, six-way, disconnected OAK, diagonal-only cluster, connected dead-end, separated expansion reels and overlapping/chained collectors.
- Check highest-wild selection, index/scaler/stake normalization, and cash versus collector totals.
- Grid: valid cluster `[−1,1,4,8,−1]` sums 12, then becomes `[1,2,8,16,1]`; zero sum pays base. Verify base resets, feature persistence, per-cell cap, unchanged history; Wolf: post-surge pay, new versus retained scatters, seed-only, seeds below payout eligibility.
