---
name: fair-outcome-mappers
description: Use when reducing random integers to a range (modulo bias, x % n, roulette) or mapping provably-fair randomness to cards, mines tiles, grid coordinates, keno picks, crash multipliers, or plinko buckets using rejection sampling, Fisher-Yates, or inverse CDF.
metadata:
  constraints: C8, C11
---

# fair-outcome-mappers

> **Core insight:** Uniform mapping needs exact source/target counts, independent axis draws and a versioned runtime draw contract.

## When to use / When NOT

- Use for integers, permutations, coordinates and distribution samples.
- Keyed derivation: `fair-rng-core`; input provenance/history: `fair-verify`.

## Process

1. Specify uniform integer source size N and target R. For N=qR+t, modulo residues have q or q+1 preimages. Reject x≥N−(N%R) before x%R for equal counts. MetaWin's production server (MSS) `common/rng/FloatSourcedIntegerRng.ts` `randomInteger` uses power-of-two reduction/rejection, assuming uint32-grid floats.
2. Keep arithmetic exact. `scripts/fair-rng.mjs` `nextInt(stream,range)` supports 1..2³², at most four bytes per candidate; larger domains need BigInt. Pin protocol byte width, rejection consumption and cursor; WF is not automatically MSS-compatible.
3. Descending Fisher–Yates draws j uniformly in [0,i]: `shuffle(stream,n)` uses `nextInt(i+1)`. Record every draw, including cosmetics.
4. Draw row/column axes independently and uniformly. MSS `games/snakes-pro/snake-game.ts` `generateFoodSequence` draws x then y via `draw(gridSize)`, repeats for occupancy (100-attempt limit), then draws the golden flag. Preserve order; audit occupancy/cap behavior. The range-1000→26×26 mapper is retired.
5. For inverse CDFs, pin endpoints, atoms, rounding, caps and variants. MSS `games/chase/index.ts` `rollCrashPoint` combines instabust and floored/capped (1−h)/(1−u); a generic /u cannot replace it. Preselected rounds consume/replay every draw in index order, settle only the chosen result. Apply settlement-defined quantization before target comparison; display rounding never decides results. Test every selection/rounding boundary. MSS `games/drill/index.ts` `main` quantizes eight decimals; `proveFairness` returns raw multipliers, a parity gap.
6. For categorical outcomes, compare raw integers or unrounded u=x/N with exact cumulative thresholds; for interval events, use exact bounds and declare inclusive/exclusive endpoints. Merge same-event touching intervals only when the join is included, preserving inclusivity; count shared endpoints once. MSS `games/primedice/index.ts` `main` prices summed nonoverlapping widths (shared endpoints allowed), tests raw rolls against their closed union. Keep unmatched tail mass on a declared default; never sample rounded published probabilities. MSS `games/tartarus/gameLogic.ts` `pickModel` uses ≤ on uint32/2³², no renormalization, tail to model zero. MSS `games/sniperRange/gameLogic.ts` `resolveShot` samples distance-scaled Rayleigh radius σ(distance)√(−2ln(max(u,Number.MIN_VALUE))); `ringForRadius` uses strict < thresholds. Verify finite-source endpoints, gaps, touching intervals and the zero-input guard.

## Correctness constraints

- **C8:** Modulo is unbiased exactly when R divides N. Bias may be negligible for small ranges versus uint32, large for comparable domains; no universal `1e-8` bound. Power-of-two targets divide power-of-two sources. Reject for arbitrary ranges.
- **C11:** Correct source/target counts; keyed derivation still needs HMAC (`fair-rng-core`). Secure primitives do not repair bias.

## Pitfalls / red flags

Statistical uniformity is not exact uniformity. Shared mappers do not prove stream parity: MSS `games/snakes-pro/tests/rtp/foodSequence-golden.test.ts` records a known runtime/proof failure; initialization offset, RNG source and occupancy differ.

## Verification

Enumerate source values: naive byte `%6` gives `[43,43,43,43,42,42]`. `scripts/fair-reduction.test.mjs` exhausts one-/two-byte domains and tests three-/four-byte rejection boundaries. Retain wider-domain proofs, exact draw transcripts and engine/proof vectors; count endpoint/tail masses against actual table sums. Statistics need stated power and cannot prove absence of modulo bias.
