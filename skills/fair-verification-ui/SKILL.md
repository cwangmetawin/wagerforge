---
name: fair-verification-ui
description: Use when building the player-facing fairness verifier UX and CSPRNG client-seed generation - inspectable client-side code that recomputes the result. Keywords fairness UI, client seed, verifier, CSPRNG client seed.
constraints: C8
---

# fair-verification-ui

## When to use / When NOT
- Use when: building the player-facing verifier UX, the change-client-seed flow, or CSPRNG client-seed generation.
- NOT for: the local re-derivation engine itself (→ `fair-verify`); seed lifecycle / commit-reveal (→ `fair-commit-reveal`); range-reduction mappers (→ `fair-outcome-mappers`).

## Default stack (+ escape hatch)
Browser Web Crypto (`crypto.getRandomValues`, `crypto.subtle`). Other stacks: any CSPRNG (`/dev/urandom`, `secrets`) for the seed; verifier logic stays client-side and inspectable wherever the player runs it.

## Process
1. Ship the verifier as inspectable client-side code (plain readable JS, no minified black box) that recomputes the outcome LOCALLY from `{serverSeed, clientSeed, nonce}` — delegate the math to `fair-verify`, never to a server call.
2. Re-implement the integer reduction in the verifier (see C8); the UI must show the player a result it computed itself, not echo the server's decoded `gameEvent`.
3. Generate the client seed with `crypto.getRandomValues` into ≥128 bits (e.g. 16+ bytes → hex). NEVER `Math.random()` or any non-cryptographic source.
4. Let the player change their client seed via a clear control, with disclosure: changing it applies to FUTURE rounds, the prior server seed is revealed on rotation, and current nonce resets.
5. Display the commitment chain (server-seed hash before submission, revealed plaintext after) so the player can audit the binding; swap labels to seed/hash for hash-chain games.

## Correctness constraints
- **C8:** Do NOT tell players "modulo is broken." Modulo bias is negligible (~1e-8) when reducing a full 32-bit-plus value and is exactly zero for power-of-two ranges; the fix when the range is large versus the source is rejection sampling. The load-bearing rule for this UI: a true verifier must RE-IMPLEMENT the integer reduction itself rather than trust the server's decode — otherwise verification is circular.

## Pitfalls / red flags
- `Math.random()` client seed (~48 bits, non-CSPRNG) — the most common real-world failure.
- Verifier that calls the server / echoes `gameEvent` instead of recomputing → trust-the-house, not provably fair.
- Minified or obfuscated verifier the player cannot read.
- Changing client seed mid-round, or hiding the server-seed reveal-on-rotation.
- Telling users modulo bias is severe (C8) — it is negligible for full-width sources.

## Verification
- Open devtools, read the verifier source, hand-run it on a settled round: its recomputed outcome matches the server result with NO network call.
- Seed entropy: `crypto.getRandomValues` present, ≥128 bits, zero `Math.random` references.
- Rotating the client seed reveals the prior server seed and resets nonce.
