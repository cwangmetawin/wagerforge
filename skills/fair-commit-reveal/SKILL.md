---
name: fair-commit-reveal
description: Use when designing the seed lifecycle of a provably-fair game — publishing the server-seed commitment before play, rotating seeds, revealing the plaintext, and resetting the nonce. Keywords commit reveal, serverSeedHash, seed rotation, nonce.
constraints: C7
---

# fair-commit-reveal

## When to use / When NOT
- Use when: deciding when to publish `SHA256(serverSeed)`, when to reveal it, and how to rotate.
- NOT for: deriving outcomes (→ `fair-rng-core`) or re-deriving to verify (→ `fair-verify`).

## Default stack (+ escape hatch)
`hashServerSeed`/`generateServerSeed`/`generateClientSeed` from `scripts/fair-rng.mjs` + a seed-state store. Other stacks: same ordering rules.

## Process
1. Publish `serverSeedHash = SHA256(serverSeed)` BEFORE the player submits/locks their client seed; optionally double-commit `nextServerSeedHash`.
2. Increment `nonce` per bet; **reset nonce to 0 on rotation**.
3. Reveal the plaintext server seed only AFTER rotation; block rotation while unfinished rounds > 0.

## Correctness constraints
- **C7:** The commitment `SHA256(serverSeed)` is safe — length-extension does not let an attacker invert the hash, recover the seed, or two-open the commitment. Keep keyed derivation on HMAC-SHA256 (see `fair-rng-core`); the commit hash being plain SHA-256 is correct and fine.

## Pitfalls / red flags
Revealing before rotation; not resetting nonce; allowing rotation mid-round; committing after the client seed is known.

## Verification
`hashServerSeed` is frozen in tests; reveal matches its earlier commitment; nonce resets on rotation.
