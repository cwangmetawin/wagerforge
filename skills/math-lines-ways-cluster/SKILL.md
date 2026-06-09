---
name: math-lines-ways-cluster
description: Use when computing wins for paylines, ways-to-win (243/Megaways), or cluster pays with a persistent doubling multiplier grid. Keywords paylines, ways to win, Megaways, cluster pays, flood fill.
---

# math-lines-ways-cluster

## When to use / When NOT
- Use when: modelling the payline, ways-to-win (243/Megaways), or cluster-pays win model — including the persistent doubling multiplier grid over cluster wins.
- NOT for: RTP/house-edge/hit-frequency (→ `math-rtp-modeling`); empirical validation (→ `math-montecarlo-simulation` / `qa-math-validation`); reel-strip / symbol-table data (→ `build-slot-reels-symbols`).

## Default stack (+ escape hatch)
TS + Node, grid as `int[][]` of symbol ids. Other stacks: the three evaluators below are pure functions over a 2D id array — port the algorithm, not the types. **They run server-side (the RGS owns them); the client only renders resolved values (C4/C9).**

## Process (SERVER math model — the client renders resolved values, never recomputes)
1. **Paylines (fixed lines).** Per predefined line (one row-index per reel), read each reel's symbol, count the leftmost contiguous run of one symbol (wilds substitute), pay `paytable[symbol][runLength]`; sum over lines. Client renders the server `winning`/`paylineIndexes` (`piggy-bank` `PaylineWin`).
2. **Ways-to-win (243…Megaways).** No fixed lines. Per paying symbol, walk reels left→right counting occurrences per reel (`freq[reel]`). Ways = product of `freq[reel]` over the contiguous winning reels from reel 0. Total combos = product of symbols-per-reel (243 = 3^5; up to 117649 = 7^6 Megaways). Pay `paytable[symbol][reelsMatched] × ways`. Client renders the server product (`perseus-vs-cetus` `BetwayWin.betwayMultiplier`).
3. **Cluster pays.** Server finds clusters by orthogonal flood-fill (4-neighbour, NOT diagonal) over equal-symbol cells, paying by count past a **config/server-defined minimum** (e.g. 8 on a 6×5) — no universal "≥5". Emits per cluster `{symbol, pay, win, multiplierSum, clusterPositions}`; client highlights `clusterPositions`, shows `win`.
4. **Persistent doubling multiplier grid (server-resolved).** Board-aligned grid, **three-state** sentinel: `-1` = no multiplier, `0` = x1 (dimmed, legitimate), `1+` = value (`2,4,8,…,1024`). Cells joining a winning cluster double, capped at **1024**. Per cluster `win = pay × multiplierSum`, the **sum** of the cluster's multiplier cells (not a per-cell factor). The grid **resets at the start of each base round** but **PERSISTS across all free-spin rounds** within a feature. Client applies server `multiplierView`/`updatedMultiplierView`; it never doubles cells itself.

## Pitfalls / red flags
- Re-deriving clusters/ways/paylines/grid on the client — production renders server-resolved values; no client flood-fill in real code (C4/C9).
- Treating grid `0` as a bug: `0` is the legitimate "x1 dimmed" state; only `-1` means no multiplier.
- Hard-coding min-cluster `≥5`: it is config/server-defined (real games use 8 / server-set).
- Applying multipliers per-cell instead of `pay × multiplierSum` (sum over the cluster).
- Resetting the grid between free-spins, carrying it across base rounds, or letting a cell exceed 1024.
- Diagonal adjacency in cluster flood-fill (only orthogonal counts).
- Ways: summing per-reel counts instead of multiplying; requiring a fixed line.
- Counting non-leftmost or non-contiguous runs on a payline.

## Verification
- Hand-checked fixtures per model: a payline run, a 243 board (e.g. 3×2×1 ⇒ 6 ways), and a cluster board whose flood-fill size and `pay × multiplierSum` are hand-computed.
- Persistence test: grid survives free-spins, fresh on a new base round, values clamp at 1024.
