---
name: fair-outcome-mappers
description: Use when reducing random integers to a range (modulo bias, x % n, roulette) or mapping provably-fair randomness to cards, mines tiles, grid coordinates, keno picks, crash multipliers, or plinko buckets using rejection sampling, Fisher-Yates, or inverse CDF.
metadata:
  constraints: C8, C11
---

# fair-outcome-mappers

> **Core insight:** Uniform mapping depends on both source and target domain sizes; exact reduction and independent axis draws must match the versioned runtime draw contract.

## When to use / When NOT
- Use for integers, permutations, grid coordinates and distribution samples.
- NOT for keyed derivation (see `fair-rng-core`) or proving input provenance/history (see `fair-verify`).

## Process
1. Specify a uniform integer source of size `N` and target range `R`. For `N=qR+t`, modulo residues have `q` or `q+1` preimages. Reject `x >= N-(N%R)` before `x%R`; acceptance then gives equal counts. MetaWin's production server (MSS) `common/rng/FloatSourcedIntegerRng.ts` `randomInteger` uses power-of-two reduction and rejection, assuming a uint32-grid float source.
2. Keep arithmetic exact. `scripts/fair-rng.mjs` `nextInt(stream, range)` supports `1..2^32` with at most four bytes per candidate; use BigInt for larger domains. Pin the actual protocol's byte width, rejection consumption and cursor; the WF helper is not automatically MSS-compatible.
3. Shuffle with descending Fisher–Yates, drawing `j` uniformly in `[0,i]`: `shuffle(stream,n)` uses `nextInt(i+1)`. Record all consumed draws, including cosmetic draws.
4. For a row/column mapper, draw each axis independently and uniformly. MSS `games/snakes-pro/snake-game.ts` `generateFoodSequence` draws x then y with `draw(gridSize)`, repeats for occupancy (at most 100 attempts), then draws the golden flag. Preserve this order and audit occupancy/cap behavior. The former range-1000→26×26 mapper is retired.
5. For inverse-CDF outcomes, pin endpoints, atoms, rounding, caps and variant parameters. MSS `games/chase/index.ts` `rollCrashPoint` has an instabust branch plus a floored/capped `(1-h)/(1-u)` path; a generic `/u` sketch cannot replace that decoder.
   For preselected multi-outcome rounds, consume/replay every draw in index order but settle only the chosen result. Quantize before target comparison; test every selection and rounding boundary. MSS `games/drill/index.ts` `main` quantizes to eight decimals; `proveFairness` returns raw multipliers, a parity gap.

## Correctness constraints
- **C8:** Modulo is unbiased exactly when `R` divides `N`. Bias can be negligible for small ranges relative to uint32, but large for comparable domains; there is no universal `1e-8` bound. Power-of-two targets divide power-of-two sources. Use rejection for arbitrary ranges.
- **C11:** Correct the source/target counts; keyed derivation still needs HMAC (`fair-rng-core`). A secure primitive does not repair biased reduction.

## Pitfalls / red flags
Statistical uniformity is not exact uniformity. Shared mapper code is not stream parity: MSS `games/snakes-pro/tests/rtp/foodSequence-golden.test.ts` records a known failing runtime/proof test; initialization offset, RNG source and occupancy still differ.

## Verification
Exhaustively count every source value: naive byte `%6` gives `[43,43,43,43,42,42]`. `scripts/fair-reduction.test.mjs` exhausts one-/two-byte domains and checks three-/four-byte rejection boundaries. Retain an analytical proof for wider domains, exact draw transcripts and engine/proof vectors. Statistics supplement these checks with stated power; they never prove absence of modulo bias.
