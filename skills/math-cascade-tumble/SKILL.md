---
name: math-cascade-tumble
description: Use when modeling cascade / avalanche / tumble mechanics where wins remove symbols, new ones drop, and multipliers may grow - and closed form breaks. Keywords cascade, avalanche, tumble, retrigger variance.
constraints: C6
---

# math-cascade-tumble

## When to use / When NOT
- Use when: modeling tumble/avalanche/cascade rounds, win-then-drop chains, growing/sticky multipliers, or retrigger variance.
- NOT for: single-event paytable/RTP derivation with no state carry (→ `math-rtp-modeling`); empirically validating an implementation generically (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
`scripts/tumble.mjs` is the runtime: `cascadeTotal(waves)` sums one round's payout (each wave's `win` × the COMPOUNDED multiplier so far), and `simulateCascadeRTP(roundFn, n, opts)` wraps `monteCarlo` from `scripts/rtp.mjs` to estimate RTP/hit-freq with 95%/99% CIs. Other stacks: same model — a `grid → resolve wins → remove → gravity → refill` wave loop feeding `cascadeTotal` per round; never a one-shot combinatorial formula.

## Process
1. Model ONE wave as a pure function of grid state: detect wins, diff-remove winning cells, apply gravity (shift survivors down), refill empty cells from the drop source.
2. Loop waves until a wave produces no win; carry path-dependent state (multiplier level, sticky symbols, accumulated win, cap counter) into the next wave immutably.
3. Round payout = Σ over waves of (wave win × current multiplier); the multiplier is read at the wave it applies to, not the round end.
4. Estimate RTP/variance by Monte-Carlo over rounds; report mean with CIs; increase N until the CI half-width is below tolerance (see C6 — near criticality N must be large).

## Correctness constraints
- **C6:** A cascade/retrigger closed form is exact ONLY for subcritical (p·R<1), iid, non-path-dependent structure; with growing multipliers, sticky symbols, or win caps the closed form breaks and validated Monte-Carlo with CIs (and adequate N near criticality) is required.

## Pitfalls / red flags
- Treating a tumble as one combinatorial draw instead of an iterative wave pipeline.
- Applying a closed-form geometric/retrigger sum when multipliers grow, symbols stick, or wins are capped (C6).
- Using p·R≥1 (at/near criticality) with too-small N — variance and tail explode; CI half-width stays wide.
- Mutating the grid in place across waves (hides ordering bugs); resolving the multiplier at round end instead of per-wave.
- Refilling from a distribution that differs from the documented drop source.

## Verification
- Subcritical iid case: `simulateCascadeRTP(roundFn, n).rtp` matches the closed form within `.ciHalfWidth` (sanity bridge).
- Path-dependent case: report `simulateCascadeRTP(...).ciHalfWidth` below tolerance; show it shrinks as N grows; cross-check against `math-montecarlo-simulation`.
- Unit-check `cascadeTotal`: compounding multipliers `[1,2,4]` over unit wins → total `11` (see `scripts/tumble.test.mjs`).
