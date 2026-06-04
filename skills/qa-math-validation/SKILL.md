---
name: qa-math-validation
description: Use when validating that an IMPLEMENTED game matches its math spec — simulating the real game code and asserting the realized RTP equals the target within tolerance at confidence. Keywords RTP validation, math regression, simulation acceptance.
constraints: C4
---

# qa-math-validation

## When to use / When NOT
- Use when: gating a build on "does the implemented game hit its certified RTP?".
- NOT for: designing the target RTP (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `validateRtp` over the real game's outcome function. Other stacks: same acceptance rule.

## Process
1. Run the ACTUAL implemented outcome code (not a re-derivation) for N seeded trials.
2. Accept only if the realized mean is within the CI AND the CI is below tolerance.
3. Run theoretical (`math-rtp-modeling`) and simulation in parallel to catch design-vs-implementation drift.

## Correctness constraints
- **C4:** Acceptance is "declared RTP within the simulated CI at required confidence", with N large enough that the CI half-width < tolerance — not a fixed spin count. Fail the build on RTP drift beyond tolerance or any seeded-result deviation.

## Pitfalls / red flags
Accepting on raw spin count (C4); validating a re-derivation instead of the real code path; not separating base vs feature RTP.

## Verification
`validateRtp` passes for a matching game and fails for an under-sampled one (see `rtp.test.mjs`).
