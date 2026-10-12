---
name: fair-rng-core
description: Use when implementing or reviewing provably-fair RNG derivation, HMAC encoding, seed generation, reseeding between bets, nonce resets, client-seed rotation, numeric limits, or single-outcome versus counter-stream verification.
metadata:
  constraints: C7, C11, C12
---

# fair-rng-core

> **Core insight:** HMAC proves reproducible derivation, not fair input selection; pin the byte protocol, numeric domains and epoch evidence.

## When to use / When NOT
- Use for keyed derivation, seed generation and protocol parity.
- NOT for outcome mapping (see `fair-outcome-mappers`) or lifecycle/history verification (see `fair-commit-reveal`, `fair-verify`).

## Process
1. Pin the actual versioned protocol: key/message encoding, extraction width, rejection cursor, draw limits/order, cosmetic draws, config snapshot, action, parameters and offset. The bundled protocol is standalone, not an MSS adapter: MetaWin's production server (MSS) `games/chase/index.ts` `settle` and `proveFairness` consume uint32/2^32.
2. For `scripts/fair-rng.mjs`, `hmacHex` uses HMAC-SHA256 with the **UTF-8 bytes of serverSeed text**, not hex-decoded bytes; `hashServerSeed` commits to those same text bytes. Messages are `clientSeed:nonce` or `clientSeed:nonce:counter`; domain-separate these schemas when designing a new protocol.
3. `fairFloat` extracts 1–13 hex digits (default 13) into `[0,1)`. `byteStream` supplies counter blocks; `nextFloat` consumes six bytes/2^48. `nextInt` supports integer ranges `1..2^32`; larger domains require exact BigInt arithmetic. Require non-negative safe-integer nonce/counters (at most 2^53−1); reject wider values, including unsigned 64-bit ones.
4. Generate secret server seeds with a CSPRNG (`generateServerSeed`, 16–32 bytes as hex); never `Math.random()`. Keep the seed within 64 UTF-8 bytes: HMAC-SHA256 hashes a longer key, and that hash is the public commitment, so every outcome becomes computable before betting. Never repeat `(serverSeed,clientSeed,nonce)`: reset nonce only with a new server seed; changing client seed rotates server seed. See `fair-commit-reveal` for commitment timing and fresh client entropy.
5. Single-outcome games using `fairFloat` must re-derive through `verify`'s frozen `ctx` argument to `deriveFn(stream, ctx)`, not the counter stream. Per-round verification establishes given-input consistency only; epoch verification requires player-retained evidence (`fair-verify`).

## Correctness constraints
- **C7:** Length extension concerns secret-prefix MAC misuse; plain `SHA256(serverSeed)` commitment is valid. Use HMAC for keyed derivation.
- **C11:** Keyed derivation and unbiased reduction are separate obligations; neither plain hashing nor a miscounted modulo example substitutes for them.
- **C12:** Stateless HMAC with a secret unpredictable key and unique inputs needs no per-bet reseeding; non-CSPRNG/recoverable seeds are the defect. NIST SP 800-90A covers DRBG mechanisms, 800-90B entropy sources and 800-90C constructions; a DRBG's reseed interval is not a between-bets rule.

## Pitfalls / red flags
Canonical integer nonce makes one schema unambiguous; the old string-nonce collision example was invalid. The `:` ban is still required: without it `fairFloat` for clientSeed `a:1`, nonce 2 and the byte block for clientSeed `a`, nonce 1, counter 2 HMAC the same `a:1:2`. Skipped/reused/reordered nonces, server-selected client seeds and rewritten commitments violate lifecycle rules yet can pass every per-round check.

## Verification
Run `scripts/fair-rng.test.mjs` known-answer/limit tests and real engine/proof vectors. Exhaustively test reduction (`scripts/fair-reduction.test.mjs`); statistics never prove absence of modulo bias. Missing player epoch evidence must yield UNVERIFIABLE, never PASS.
