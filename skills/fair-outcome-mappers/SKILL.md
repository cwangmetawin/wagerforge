---
name: fair-outcome-mappers
description: Use when mapping provably-fair randomness to a concrete game outcome — a card 0-51, a mines tile, keno picks, a crash multiplier, a plinko bucket — and you must avoid modulo bias. Keywords rejection sampling, Fisher-Yates, inverse CDF, modulo bias.
constraints: C8
---

# fair-outcome-mappers

## When to use / When NOT
- Use when: turning a hash/stream into integers, permutations, or distribution samples.
- NOT for: the keyed derivation itself (→ `fair-rng-core`).

## Default stack (+ escape hatch)
`scripts/fair-rng.mjs` `nextInt`/`shuffle`/`fairFloat`. Other stacks: replicate the rejection-sampling bound exactly.

## Process
1. Uniform integer in `[0,range)`: **rejection sampling** (`nextInt`) — draw whole bytes, reject the top `space % range`, return `x % range`.
2. Permutation (cards/tiles): **Fisher-Yates** with `nextInt(i+1)` (`shuffle`).
3. Continuous (crash/limbo): inverse-CDF on `fairFloat` (e.g. `floor((1-h)/u)` styles) — done in the math skills.

## Correctness constraints
- **C8:** Modulo bias occurs ONLY when the source space size isn't a multiple of `range`; it's negligible (~1e-8) when reducing a full 32-bit+ value and exactly zero for power-of-two ranges. Fix = make the source a multiple of `range` OR rejection-sample (what `nextInt` does). The dramatic "11% coin / 0.02% dice" figures correspond to tiny truncated windows, not real HMAC pipelines.

## Pitfalls / red flags
Naive `hashInt % range` on a narrow window; biased shuffles (`i` vs `i+1` off-by-one); trusting a server-side decode instead of re-deriving (→ `fair-verify`).
- **Full-range draw, wrong-size source.** A *large* source still biases if its size isn't a multiple of `range`. Live: snakes-pro maps a range-1000 draw to a 26×26 grid via `r % 26` / `floor(r/26) % 26` — but 1000 = 38·26+12, so columns/rows 0–11 are over-sampled (~2.6%). Mapper-side fix: draw a multiple of the target (`range = 676`, or one `nextInt(26)` per axis) or rejection-sample; never `% range` over a mismatched source.

## Verification
`nextInt` stays in range, deterministic, ~uniform for non-power-of-two ranges (see `fair-rng.test.mjs`).
