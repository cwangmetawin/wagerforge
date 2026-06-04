---
name: fair-hash-chain
description: Use when verifying crash/aviator-family games that commit a terminal hash and reveal a backward hash chain - distinct from per-round HMAC commit-reveal. Keywords hash chain, crash verification, terminal hash, aviator.
constraints: C7
---

# fair-hash-chain

## When to use / When NOT
- Use when: verifying a crash/aviator-family round whose operator committed ONE terminal hash up front and reveals rounds backward down a SHA-256 hash chain.
- NOT for: per-round HMAC commit-reveal games (`{clientSeed, serverSeedHash, nextServerSeedHash, nonce}`) — use `fair-commit-reveal` / `fair-verify`. NOT for deriving payouts (server-authoritative).

## Default stack (+ escape hatch)
Node + Web Crypto `crypto.subtle` (SHA-256). Other stacks: any SHA-256 + the game's published `f(hash_i, sharedSeed)` outcome decoder; the chain math is identical everywhere.

## Process
This is the hash-chain proof mode (the SECOND of two fairness modes). The operator publishes a terminal/commitment hash before play. Each round `i` has a chain hash `hash_i`, and:

1. **Commitment.** Record the published terminal hash `H_commit` (the chain's endpoint), announced before any round.
2. **Outcome derivation.** For round `i`: `outcome_i = f(hash_i, sharedSeed)` using the game's published decoder (uniform inverse-CDF for crash multiplier). Re-implement `f` yourself; do not trust the server's reported multiplier.
3. **Chain verification.** Compute `sha256(hash_i)` and confirm it equals `hash_(i-1)`, the PREVIOUS round's hash. Walk this backward, round by round, toward the commitment: repeatedly hashing forward must eventually reach `H_commit`. A break anywhere = tampering.
4. **UI note.** The Fairness UI swaps its labels to **seed/hash** for these games (vs serverSeed/clientSeed/nonce for HMAC games). Route through the same `verifyHashFairness(game, hash, seed, hashIndex)` gateway entry.

## Correctness constraints
- **C7:** SHA-256 length-extension only bites when SHA-256 is misused as a secret-prefix MAC (`SHA256(secret‖attackerData)`) over attacker-controlled data. A plain `SHA256(serverSeed)` commitment — or hashing a public chain link — is NOT threatened by length extension. For any KEYED derivation use HMAC-SHA256, never raw secret-prefix SHA-256.

## Pitfalls / red flags
- Trusting the server's reported `outcome_i` instead of re-deriving via `f` (C7 reminder: keyed steps need HMAC, not bare SHA-256).
- Verifying the chain forward from the commitment instead of `sha256(hash_i) == hash_(i-1)` backward.
- Confusing terminal-hash chaining with per-round HMAC commit-reveal — wrong mode, wrong inputs.
- Treating fairness as RTP proof; it proves only non-manipulation, not house edge.

## Verification
- For each round: assert `sha256(hash_i) == hash_(i-1)` and that iterated hashing reaches `H_commit`.
- Independently recompute `f(hash_i, sharedSeed)` and diff against the settled multiplier — zero drift required.
