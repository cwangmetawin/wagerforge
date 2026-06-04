---
name: fair-rng-core
description: Use when implementing or reviewing the cryptographic core of a provably-fair RNG — deriving outcomes from server seed + client seed + nonce, choosing HMAC vs plain hashing, or generating seeds. Keywords HMAC, SHA-256, server seed, client seed, nonce, CSPRNG.
constraints: C7, C12
---

# fair-rng-core

## When to use / When NOT
- Use when: deriving outcomes from `(serverSeed, clientSeed, nonce)`; choosing the keyed primitive; generating seeds.
- NOT for: mapping randomness to a game shape (→ `fair-outcome-mappers`) or the commit/reveal lifecycle (→ `fair-commit-reveal`).

## Default stack (+ escape hatch)
Node `crypto` via `scripts/fair-rng.mjs`. Other stacks: any HMAC-SHA256 + OS CSPRNG; mirror the same message format `clientSeed:nonce[:counter]`.

## Process
1. Derive with **HMAC-SHA256(serverSeed, `clientSeed:nonce[:counter]`)** — keyed, never `SHA256(seed‖msg)` used as a MAC.
2. Single outcome: 13 hex (52 bits) / 2^52 → `u ∈ [0,1)` (`fairFloat`). Multi-draw: counter-block `byteStream` + `nextFloat`/`nextInt`.
3. Generate seeds with a CSPRNG (`randomBytes`, ≥128-bit). Never `Math.random()`.

## Correctness constraints
- **C7:** SHA-256 length-extension only bites when SHA-256 is misused as a secret-prefix MAC over attacker-controlled trailing data; a plain `SHA256(serverSeed)` commitment is NOT threatened. Using **HMAC-SHA256** for keyed derivation makes it moot.
- **C12:** A stateless per-bet design `HMAC(serverSeed, clientSeed‖nonce)` is secure; reseeding between bets is NOT required. The real fault is a non-CSPRNG or recoverable seed. NIST roles: 800-90A DRBG / 800-90B entropy source / 800-90C assembly.

## Pitfalls / red flags
`Math.random()` seeds (~48-bit, predictable); plain-hash used as MAC; reusing one `(seed,nonce)` for two outcomes.

## Verification
Known-Answer Tests in `scripts/fair-rng.test.mjs`; deterministic same-input→same-output; `u ∈ [0,1)`.
