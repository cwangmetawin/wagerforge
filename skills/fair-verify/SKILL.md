---
name: fair-verify
description: Use when building or auditing the player-facing fairness verifier — independently recomputing a settled outcome from server seed + client seed + nonce, rather than trusting the server's replayed result. Keywords verify fairness, independent re-derivation, recompute outcome.
constraints: C8
---

# fair-verify

## When to use / When NOT
- Use when: implementing the "verify" path or auditing whether verification is genuinely independent.
- NOT for: the derivation primitives (→ `fair-rng-core`/`fair-outcome-mappers`).

## When it's already wrong
If "verify" calls a server endpoint and re-renders whatever the server returns, it is **trust-the-house, not provably fair**. A real verifier recomputes locally.

## Default stack (+ escape hatch)
`verify()` in `scripts/fair-rng.mjs`: checks the commitment, re-runs the SAME `deriveFn` over a fresh `byteStream`, diffs against the claimed outcome. Other stacks: re-implement the integer reduction yourself.

## Process
1. Check `SHA256(serverSeed) === publishedHash`.
2. Re-derive: run the game's exact `deriveFn(stream)` (the reduction, NOT the server's decode) over `byteStream(serverSeed, clientSeed, nonce)`.
3. Deep-equal recomputed vs settled outcome; surface a precise diff on mismatch.

## Correctness constraints
- **C8:** The verifier MUST re-implement the integer reduction (rejection-sampled `nextInt`, Fisher-Yates) itself. Trusting the server's already-decoded `gameEvent` makes verification circular and hides any biased mapping.

## Pitfalls / red flags
Re-rendering a server response; trusting the server's decoded outcome; wrong message format (`clientSeed:nonce` vs counter blocks) silently passing.

## Verification
Round-trip tests: derive → `verify` returns `ok:true`; tampered hash → `commitOk:false`; tampered outcome → `match:false` (see `fair-rng.test.mjs`).
