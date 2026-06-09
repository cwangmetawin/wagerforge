---
name: qa-math-validation
description: Use when validating that an IMPLEMENTED game matches its math spec — simulating the real game code and asserting the realized RTP equals the target within tolerance at confidence. Keywords RTP validation, math regression, simulation acceptance.
constraints: C4
---

# qa-math-validation

## When to use / When NOT
- Use when: gating a build on "does the implemented game hit its certified RTP, and do its paytable invariants still hold?".
- NOT for: designing the target RTP (→ `math-rtp-modeling`); the large-N sim harness, stats module, or record/replay RNG (→ `qa-monte-carlo-cert`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `validateRtp` over the real game's outcome function. Other stacks: same acceptance rule.

## Process
1. Pin the TARGET first: the server-authoritative RTP (`/game/info` `config.rtp`), NOT a client UI/locale/code fallback — these disagree within one game in real repos.
2. Run the ACTUAL implemented outcome code (not a re-derivation) for N seeded trials.
3. Accept only if the realized mean is within the CI AND the CI is below tolerance.
4. Run theoretical (`math-rtp-modeling`) and simulation in parallel to catch design-vs-implementation drift; assert paytable invariants (lengths, symmetry, EV bands) alongside the RTP check.

## Correctness constraints
- **C4:** Acceptance is "declared RTP within the simulated CI at required confidence", with N large enough that the CI half-width < tolerance — not a fixed spin count. Fail the build on RTP drift beyond tolerance or any seeded-result deviation.

## Pitfalls / red flags
Accepting on raw spin count (C4); validating a re-derivation instead of the real code path; not separating base vs feature RTP (feature-buy stake must be normalized by feature cost or RTP% is wrong); validating against an inconsistent client RTP fallback instead of the server-authoritative target.

## Verification
`validateRtp` passes for a matching game and fails for an under-sampled one (see `rtp.test.mjs`).
