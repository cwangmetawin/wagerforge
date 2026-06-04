---
name: math-lines-ways-cluster
description: Use when computing wins for paylines, ways-to-win (243/Megaways), or cluster pays with a persistent doubling multiplier grid. Keywords paylines, ways to win, Megaways, cluster pays, flood fill.
---

# math-lines-ways-cluster

## When to use / When NOT
- Use when: scoring a spin under a payline, ways-to-win (243/Megaways), or cluster-pays win model — including the persistent doubling multiplier grid that overlays cluster wins.
- NOT for: deriving RTP/house-edge/hit-frequency from these win counts (→ `math-rtp-modeling`); empirical validation (→ `math-montecarlo-simulation` / `qa-math-validation`); reel-strip / symbol-table data shaping (→ `build-slot-reels-symbols` / `build-slot-reels-symbols`).

## Default stack (+ escape hatch)
TS + Node, grid as `int[][]` of symbol ids. Other stacks: the three evaluators below are pure functions over a 2D id array — port the algorithm, not the types. Server is authoritative; the client only renders the resolved win.

## Process
1. **Paylines (fixed lines).** For each predefined line (an array of one row-index per reel), read the symbol at each reel along the line, count the leftmost contiguous run of one symbol (wilds substitute), and pay `paytable[symbol][runLength]`. Sum over all lines.
2. **Ways-to-win (243…Megaways).** No fixed lines. For each paying symbol, walk reels left→right; per reel count its occurrences (`freq[reel]`). Ways = product of `freq[reel]` over the contiguous winning reels from reel 0. Total possible combinations = product of symbols-per-reel across all reels (243 = 3^5 fixed-height; up to 117649 = 7^6 for variable-height Megaways). Pay `paytable[symbol][reelsMatched] × ways`.
3. **Cluster pays.** Find clusters by orthogonal flood-fill (4-neighbour up/down/left/right, NOT diagonal) over equal-symbol cells; a cluster pays only at size ≥ 5. Pay by cluster size.
4. **Persistent doubling multiplier grid.** Maintain a separate `int[][]` aligned to the board, `-1` sentinel = no multiplier. When a cell participates in a winning cluster, its multiplier doubles `1→2→4→…` capped at **1024**. Apply each winning cell's multiplier to its contribution. The grid **resets at the start of every base round** but **PERSISTS across all free-spin cascades** within a triggered feature — never reset it between cascades.

## Pitfalls / red flags
- Diagonal adjacency in cluster flood-fill (only orthogonal counts).
- Resetting the multiplier grid between free-spin cascades, or carrying it across base rounds — it resets per base round, persists across the feature's cascades.
- Letting a cell multiplier exceed 1024, or using `0`/`undefined` instead of the `-1` "no multiplier" sentinel.
- Ways: summing per-reel counts instead of multiplying them; requiring a fixed line.
- Counting non-leftmost or non-contiguous runs on a payline.

## Verification
- Hand-checked fixtures for each model: a known payline run, a 243 board with a chosen symbol distribution (e.g. 3×2×1 ⇒ 6 ways), and a cluster board whose flood-fill size and post-double multipliers are computed by hand.
- Multiplier-persistence test: assert the grid survives a cascade chain but is fresh on a new base round, and that values clamp at 1024.
