---
name: math-lines-ways-cluster
description: Use when agents implement or audit paylines, unrestricted ways, connected betways, adjacency clusters, count-anywhere OAK, wild multiplier policies, or persistent multiplier grids.
---

# math-lines-ways-cluster
> **Core insight:** Choose the evaluator and multiplier policy explicitly; Sweety-style clusters sum only current cells at least 2×, fall back to 1×, and pay before activating or doubling cells for later waves.

## When to use / When NOT

- Use for server win evaluation, substitution, connectivity, paytable lookup, and grid multiplier ordering.
- Not for generating outcome probabilities or tuning RTP (see `math-rtp-modeling`), or cascade orchestration (see `math-cascade-tumble`).

## Process

1. Specify the evaluator, eligible symbols, minimum count, wild substitution, overlapping-win policy, count offset, paytable scaler, stake basis, and settlement rounding. Money settles in exact integer atoms; statistical models may use normalized returns.
2. **Paylines:** evaluate the specified contiguous run on each predefined line, then sum eligible line awards. Multiple wild multipliers require an explicit highest/sum/product policy. MetaWin's production server (MSS) `games/fruitNudge/gameLogic.ts` `detectPaylineWins` uses the highest wild multiplier, index `repeats−1`, and total-bet normalization by `totalPaylines`; these are specimen rules, not universal defaults.
3. **Unrestricted ways:** multiply eligible occurrence counts over consecutive paying reels from the starting reel; `3×2×1` gives six ways. **Connected ways:** enforce the game's allowed inter-reel connections and backward-prune cells that cannot reach the last paying reel before multiplying surviving counts. MSS `games/piggyBank/gameLogic.ts` `detectConnectedBetwayWins` implements this additional pruning.
4. **Adjacency clusters:** flood-fill using the declared neighbor rule. MSS `games/sweetyCluster/gameLogic.ts` `floodFill` uses four orthogonal neighbors; `detectClusterWin` requires five symbols on its 7×7 board. **Count-anywhere OAK:** count eligible symbols across the board without requiring adjacency; MSS `games/zeus/gameLogic.ts` `detectWin` uses this distinct evaluator.
5. **Persistent grid:** define its lifecycle and server values independently of display sentinels. MSS `games/sweetyCluster/gameLogic.ts` `detectClusterWin` sums current winning-cell values `m>=2`, pays `basePay×(sum>0 ? sum : 1)`, then activates `−1→1` or doubles existing cells, capped at 1024, for later waves. Plain or just-activated 1× cells add nothing to the current sum. Its `loadFreeGames` carries the grid through the feature; new base rounds initialize a fresh grid. Snapshot mutable state so later waves cannot rewrite recorded evidence.

## Pitfalls / red flags

- Treating OAK as adjacency clusters, or connected ways as unrestricted ways.
- Summing ways counts, including dead-end branches, or multiplying all wild multipliers without a game rule.
- Paying zero on a first cluster, adding 1× marks, or applying grid upgrades to the current hit.
- Hard-coding a universal cluster minimum, sentinel convention, scaler, or stake basis; computing authoritative wins on the client.

## Verification

- Hand-check line, six-way, disconnected OAK, diagonal-only cluster, and connected dead-end fixtures.
- Check highest-wild selection and paytable index/scaler/stake normalization against the actual evaluator.
- Grid fixtures: no eligible multiplier gives base pay; current `[−1,1,2,4]` contributes six; upgrades affect only later waves. Verify feature persistence, base reset, cap, and unchanged historical snapshots.
