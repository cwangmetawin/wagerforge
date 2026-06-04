---
name: qa-fairness-verification
description: Use when testing a provably-fair implementation — writing Known-Answer Tests for the HMAC derivation, statistical uniformity tests for the integer mapping, and round-trip verification tests. Keywords KAT, fairness test, chi-square, rejection sampling test.
constraints: C5, C8
---

# qa-fairness-verification

## When to use / When NOT
- Use when: building the test suite that proves the fairness core is correct and unbiased.
- NOT for: implementing the core (→ `fair-rng-core`) — this is its QA counterpart.

## Default stack (+ escape hatch)
`node:test` against `scripts/fair-rng.mjs`. Other stacks: same test categories.

## Process
1. **KAT:** freeze a few `(serverSeed, clientSeed, nonce) → outcome` vectors and assert exact equality (catches scheme drift).
2. **Statistical:** draw many `nextInt` over a non-power-of-two range; assert per-bucket counts within tolerance (chi-square / proportion bound) to confirm no modulo bias.
3. **Round-trip:** derive an outcome, then `verify` it; assert tamper detection on both seed-hash and outcome.

## Correctness constraints
- **C5:** Require a CSPRNG; never assert fairness of a non-cryptographic generator (Mersenne-Twister is state-recoverable). Apply Bonferroni when running 15+ statistical tests.
- **C8:** Statistical uniformity is the empirical guard for the rejection-sampling mapping; a single chi-square failure → investigate, don't ignore.

## Pitfalls / red flags
Treating α=0.05 as a hard pass; too few samples for high-variance ranges; KATs that re-derive instead of freezing.

## Verification
The `scripts/fair-rng.test.mjs` suite passes (KAT + uniformity + round-trip).
