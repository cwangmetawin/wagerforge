---
name: fair-hash-chain
description: Use when verifying multiplayer hash-chain games (crash0/slide/aviator/aviator0/sicbo) that commit a terminal hash and reveal a backward hash chain - distinct from per-round HMAC commit-reveal. Keywords hash chain, crash verification, terminal hash, aviator.
constraints: C7
---

# fair-hash-chain

## When to use / When NOT
- Use when: verifying a multiplayer hash-chain round (current set: `crash0`, `slide`, `aviator`, `aviator0`, `sicbo`) whose operator committed ONE terminal hash up front and reveals rounds backward down a SHA-256 hash chain.
- NOT for: per-round HMAC commit-reveal games (`{clientSeed, serverSeedHash, nextServerSeedHash, nonce}`) — use `fair-commit-reveal` / `fair-verify`. NOT for deriving payouts (server-authoritative).

## Default stack (+ escape hatch)
Node + Web Crypto `crypto.subtle` (SHA-256). MetaWin reality: the chain proof is a SERVER round-trip (`/game/proveFairness`), not a client recompute. Other stacks / independent audit: any SHA-256 + the game's published `f(hash_i, sharedSeed)` decoder; the backward-chain math below is identical everywhere.

## Process
This is the hash-chain proof mode (the SECOND of two fairness modes). A game is hash-chain iff `isMultiplayerGame(gameCode)` (`multiplayerGameCodes = [crash0, slide, aviator, aviator0, sicbo]`); the operator commits a terminal hash before play.

1. **Verify via server (MetaWin path).** POST `{ game, provider, hashIndex, hash, seed, data }` to `/game/proveFairness`; for crash/aviator/slide `data` MUST carry `rest:{ rtp }` (crash UI hardcodes `rtp: 0.98`). Read the outcome from `randomizations[0].gameEvent` (e.g. `crashPointMultiplier`) and `hashes[]`. The studio Fairness UI swaps inputs to **Hash / Seed / Hash Index** when `isMultiplayerGame` is true.
2. **Independent audit (other stacks).** Compute `outcome_i = f(hash_i, sharedSeed)` with the published decoder (inverse-uniform crash multiplier) and diff vs the server multiplier; do not trust the reported value blindly.
3. **Chain check.** Compute `sha256(hash_i)` and confirm it equals `hash_(i-1)`; walking backward must reach the committed terminal hash `H_commit`. A break anywhere = tampering.
4. **Legacy GDK note.** Old individual mini-games route crash/aviator/crash0/aviator0 through `gateway.verifyHashFairness(game, serverSeed, clientSeed, nonce, data)` — same server proof, but the gateway keeps the serverSeed/clientSeed/nonce parameter positions.

## Correctness constraints
- **C7:** SHA-256 length-extension only bites when SHA-256 is misused as a secret-prefix MAC (`SHA256(secret‖attackerData)`) over attacker-controlled data. A plain `SHA256(serverSeed)` commitment — or hashing a public chain link — is NOT threatened by length extension. For any KEYED derivation use HMAC-SHA256, never raw secret-prefix SHA-256.

## Pitfalls / red flags
- Omitting `rest:{rtp}` from the crash/aviator/slide proof request — these decoders are RTP-parameterized and the proof needs it.
- Verification-mode mismatch: `snakes` is server-side `IMultiplayerGame` (snakes-pro) yet the studio verifier posts it as single-player `{serverSeed, clientSeed, nonce}`; do not assume an IMultiplayerGame is always hash-chain — branch only on `multiplayerGameCodes`.
- Verifying the chain forward from the commitment instead of `sha256(hash_i) == hash_(i-1)` backward.
- Treating fairness as RTP proof; it proves only non-manipulation, not house edge (C7: keyed steps need HMAC, not bare SHA-256).

## Verification
- For each round: assert `sha256(hash_i) == hash_(i-1)` and that iterated hashing reaches `H_commit`.
- Diff the server `proveFairness` multiplier against an independent `f(hash_i, sharedSeed)` recompute — zero drift required.
