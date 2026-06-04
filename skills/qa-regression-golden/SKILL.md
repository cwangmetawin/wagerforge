---
name: qa-regression-golden
description: Use when building golden-result regression tests for deterministic game logic - seeded RNG, frozen outcomes, byte-for-byte comparison. Keywords golden result, regression test, seeded RNG, deterministic replay.
---

# qa-regression-golden

## When to use / When NOT
- Use when: locking known-good game outcomes against an exact seed so any logic change that perturbs results fails loudly.
- NOT for: statistical RNG quality (→ `qa-rng-statistical`); RTP convergence/distribution (→ `qa-monte-carlo-cert`); invariant math proofs (→ `qa-math-validation`).

## Default stack (+ escape hatch)
Default: TS + Node test runner; a seedable, deterministic integer RNG (record/replay decorator over a CSPRNG core) feeding the real game code; goldens as committed fixture files. Other stacks: same shape — inject a deterministic RNG, snapshot canonicalized output, diff on replay.

## Process
1. Make the RNG injectable and fully deterministic: one explicit `seed` (plus entropy/salt) in → identical draw sequence out. Never read ambient `Math.random`/wall-clock inside game logic.
2. Pick a fixed, representative seed set (boundary cases, max-win, feature triggers, multi-step rounds). Record the seed AND captured entropy alongside each golden.
3. Run the real game code under each seed; serialize the full result deterministically (stable key order, fixed decimal precision, no timestamps/run-ids) and freeze it as the golden fixture.
4. On every run, re-execute the same seeds and compare the new serialization byte-for-byte against the stored golden. Any mismatch fails.
5. Wire it as a pre-commit gate (and CI) so no change merges without passing; on intended logic changes, regenerate goldens deliberately and review the diff.
6. Rotate the test seed set quarterly so the suite does not ossify around one lucky sequence; archive retired seeds, never silently drop coverage.

## Pitfalls / red flags
- Nondeterminism leaks: unseeded RNG, `Date.now`, map/JSON key-order drift, float formatting, locale — all produce phantom diffs. Canonicalize serialization.
- Auto-overwriting goldens on mismatch (e.g. blanket `--update`) silently launders real regressions — regeneration must be explicit and diff-reviewed.
- Not logging the seed/entropy → a failure is unreproducible and certification is invalid.
- Comparing parsed objects with loose equality instead of the exact serialized bytes hides precision and ordering bugs.
- One frozen seed forever: rotate, and keep boundary/max-win seeds in the set.
- Client-side replay: goldens must come from server-authoritative resolution, never client-computed outcomes.

## Verification
- Run the suite twice on an unchanged tree: identical pass, zero diffs (proves determinism, not luck).
- Introduce a deliberate off-by-one in payout logic: the gate must fail on the affected seeds.
- Confirm the pre-commit hook blocks a commit on any byte mismatch, and that each golden carries its seed + entropy for replay.
