---
name: fair-hash-chain
description: Use when implementing or independently verifying committed hash-chain epochs, backward links, sharedSeed salt derivation, entropy binding, or round/index histories.
metadata:
  constraints: C7, C11
---

# fair-hash-chain

> **Core insight:** Valid links and matching outcomes do not prove inputs were unselected; hash-chain fairness also requires an independently evidenced entropy binding and complete index history.

## When to use / When NOT

- Use when the published proof contract commits a chain and reveals links in a defined order.
- NOT for every multiplayer game. Use `fair-verify` for protocol selection; live shoe/draw ledgers use `fair-shoe-draw-ledger`. Results remain server-authoritative.

## Process

1. **Select the versioned contract.** Record derivation, draw limits/order, cursor, commitment scope and reveal boundary; never use a fixed game-code allowlist or single/multiplayer flag. Multiplayer can use round streams, shoe ledgers, chains or signed authority reports. MetaWin's production server (MSS) `games/hitCrashers/fairness.ts` `PROOF_PATH`/`proveFairness` publishes a query proof with `{offset, rtp, humanSeats?}`, not a universal POST or `rest.rtp` contract.
2. **Bind before honest entropy is revealed.** Fix the unique active epoch, `H_commit`, chain length/index order, hash encoding, decoder/version, RTP/rounding/cap, and exact entropy-source event with parsing/finality rules. At least one effective contribution must remain unpredictable to the operator when its last selectable input is bound; afterward never re-choose, retry or abandon it. Generation time alone is irrelevant. Fix salt derivation/encoding and bind it to the epoch. Forbid salt/chain switching and selecting among several precommitted chains.
3. **Preserve independent evidence.** The player saves the binding record before betting and keeps entropy evidence, acceptance receipts and ordered history, including cancellations/failures/rotations. A future block or beacon is one option: specify network/height or event, finality, failure handling and manipulation assumptions; its name alone proves nothing.
4. **Verify locally.** Check commitment timing, entropy provenance/derivation, the complete round/index sequence, links and reachability to the saved `H_commit`, then recompute outcomes with the pinned decoder/parameters. For the published backward convention, `sha256(hash_i) == hash_(i-1)`; do not assume another encoding/direction. Server `proveFairness`/`gameEvent` is a convenience replay adapter, never independent verification. Missing evidence means `UNVERIFIABLE`, never `PASS`.
5. **Retire dependencies before reveal.** Reveal only after every dependent future outcome retires. Never keep future card order under an already revealed link/key. MSS `games/blackjack-table-live/engine.ts` `Shoe.draw` draws from composition when needed; `games/blackjack-table-live/index.ts` `tick` rotates on `result` after the final draw (shoe/draw ledgers: `fair-shoe-draw-ledger`).

## Correctness constraints

- **C7:** Plain SHA-256 commitments/public links are not secret-prefix MACs; length extension does not invalidate them. Use HMAC for keyed derivation.
- **C11:** Reduction bias depends on source/range, is zero when the range divides the source size, and is removed by rejection; uint32 alone is no negligible-bias guarantee.

## Pitfalls / red flags

- Operator-selected salt, alternative precommitted chains, skipped/reused links, selective aborts, live RNG/debug traces, or claiming recomputation proves non-selection or RTP.

## Verification

- Preserve source/decoder versions and player evidence. Reject altered links, entropy event/encoding, decoder/parameters, index gaps/reuse/reorder, chain switching, salt grinding, last-revealer aborts and premature reveal. Report source review, local tests and deployment evidence separately.
