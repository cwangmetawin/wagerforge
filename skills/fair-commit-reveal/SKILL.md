---
name: fair-commit-reveal
description: Use when designing server-seed commitments, fresh client entropy, nonce allocation, accepted wager binding, reveal boundaries, or seed rotation.
metadata:
  constraints: C7, C11
---

# fair-commit-reveal

> **Core insight:** Fix the operator's commitment before fresh player entropy; retire every dependent future outcome before reveal, and preserve immutable wager bindings and nonce history across rotation.

## When to use / When NOT

- Use for seed epochs, acceptance ordering and reveal schedules.
- Derivation: `fair-rng-core`; independent epoch verification: `fair-verify`; hash-chain entropy: `fair-hash-chain`. Shoe/draw ledgers: `fair-shoe-draw-ledger`.

## Process

1. Generate a secret unpredictable server seed of at most 64 UTF-8 bytes (a longer HMAC key is hashed into the public commitment). Publish `SHA256(serverSeed)` before locking client entropy. Use UTF-8 bytes of the seed text for commitment and HMAC, never hex-decoded bytes. WF `scripts/fair-rng.mjs` exports `hashServerSeed`, `generateServerSeed` and `generateClientSeed`; they are primitives, not a lifecycle store.
2. For every epoch, the client saves the fixed commitment first, then generates and saves fresh unpredictable client entropy and sends it to the server. “Client-held” means player-controlled source and retained record, not secrecy from the deriving server. Re-locking an old known seed lets the operator grind the next server seed; a prepublished next commitment does not remove the freshness requirement.
3. Define immutable epoch identity and nonce namespace. A dedicated per-player epoch allocates `0..k-1` exactly once in accepted order, only to a bet whose stake was accepted and debited; a rejected request consumes no nonce. Global shared nonces may leave gaps in personal history; retain the global allocation record. The operator must not choose which nonce a wager gets. Reject malformed/unsafe counters; never repeat `(serverSeed,clientSeed,nonce)`.
4. Accept/debit stake in exact integer atoms before deriving any outcome. Atomically bind the accepted wager to epoch, nonce, commitment, client seed, stake and all outcome-affecting parameters. Persist one decision before its money leg: rejected, settled or refunded; retries preserve content, conflicting reuse rejects. No selective cancellation/settlement after acceptance. Retain ordered failure/cancellation receipts, consumed nonces and rotation records.
5. Reveal only when every dependent future outcome is retired. Block unsafe rotation while dependent rounds remain open; reset nonce only with a new server seed. Changing client seed rotates server seed through this safe boundary. A multi-round shoe cannot retain future card order generated under a revealed key. MetaWin's production server (MSS) `games/baccarat-live/engine.ts` `Shoe.draw` draws from composition; MSS `games/baccarat-live/index.ts` `tick` requests rotation after deal. MSS `games/blackjack-table-live/index.ts` `tick` requests it on result after the last draw. Audit actual dependencies, not generic phase names.

## Correctness constraints

- **C7:** Plain `SHA256(serverSeed)` commitment is valid; length extension does not invert it or produce two openings. Use HMAC for keyed outcome derivation, never a secret-prefix hash MAC.
- **C11:** Apply that commitment/MAC distinction; mapping bias depends on source and target domains, with rejection where needed.

## Pitfalls / red flags

Known entropy reused across epochs; nonce reset under the same seed; mutable wager parameters; early reveal; live RNG/debug traces, future outcomes or cheat/replay paths reaching production responses.

## Verification

Check player-kept commitment timing, fresh entropy, immutable receipts and all rotation paths. Exercise shoe-leak negatives in MSS `games/blackjack-table-live/test-blackjack-table-shoe-leak.test.ts`; test skipped/reused/reordered nonces, rewritten commitments, swapped client seeds and selective abort via `qa-fairness-verification`.
