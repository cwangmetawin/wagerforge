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
3. Feed `deriveFn` the SAME per-game extras the server used, or a correct recompute mismatches a correct server: `rtp` (rtp-bearing games), `difficulty`/`stopIndex` (frog-crossing/pump/snakes), `noZero` (roulette0/2), `variant` (packs/cases/tarot). Real wire form: `encodeURIComponent(JSON.stringify(data))`.
4. Pick the contract by mode, not by marketing name: single-player = per-round `{clientSeed,serverSeed,nonce}`; multiplayer = hash-chain `{hash,seed,hashIndex}` (→ `fair-hash-chain`). Branch on the multiplayer flag.
5. Deep-equal recomputed vs settled outcome; surface a precise diff on mismatch.

## Correctness constraints
- **C8:** The verifier MUST re-implement the integer reduction (rejection-sampled `nextInt`, Fisher-Yates) itself. Trusting the server's already-decoded `gameEvent` makes verification circular and hides any biased mapping.

## Pitfalls / red flags
Re-rendering a server response; trusting the server's decoded outcome; wrong message format (`clientSeed:nonce` vs counter blocks) silently passing; dropping the `data` extras (`rtp`/`difficulty`/`stopIndex`) so a correct recompute "fails" — a missing-input bug, not a fairness failure. Snakes trap: single-player `snakes` is NOT in `multiplayerGameCodes` (=crash0/slide/aviator/aviator0/sicbo) — verify it as single-player `{clientSeed,serverSeed,nonce}` + `{difficulty,stopIndex}`, not the hash-chain contract.

## Verification
Round-trip tests: derive → `verify` returns `ok:true`; tampered hash → `commitOk:false`; tampered outcome → `match:false` (see `fair-rng.test.mjs`).
