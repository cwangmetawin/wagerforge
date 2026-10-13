---
name: fair-verification-ui
description: Use when building fairness UI, commitment storage, client-seed generation, epoch-history exports, or PASS/FAIL/UNVERIFIABLE reporting for players.
metadata:
  constraints: C8, C11
---

# fair-verification-ui

> **Core insight:** The UI must preserve the player's prior evidence before sharing fresh entropy; displaying a server hash or decoded result cannot establish that those were the inputs accepted for play.

## When to use / When NOT

- Use for commitment capture, client-seed controls and independent verification UX.
- Engine: `fair-verify`; lifecycle: `fair-commit-reveal`; mappings: `fair-outcome-mappers`; chain evidence: `fair-hash-chain`. Shoe/draw ledgers: `fair-shoe-draw-ledger`.

## Process

1. Save the new epoch's commitment locally before generating its client seed or submitting the first bet. After the commitment is fixed, generate fresh entropy through the browser CSPRNG, such as `crypto.getRandomValues` filling 16 bytes. Save the seed and commitment record before transmitting the seed. “Client-held” means the player controls its source and keeps it; the server receives it for derivation. Never reuse known client entropy for the next epoch or silently substitute server-generated seeds.
2. Append every accepted bet's receipt to the same local log, in order, as answered at bet time: epoch, nonce, outcome, client seed, exact-atom stake, action and all outcome-affecting parameters/configuration. This log is `verifyEpoch`'s `playerLog`; export it. Keep played order, cancellations, failures and rotations. Changing client seed applies at a safe future boundary with a new server seed and nonce reset; explain when the old seed can reveal without exposing future outcomes.
3. Route from versioned proof metadata, not game names or a multiplayer flag. Show derivation, commitment scope, reveal boundary, draw limits/order and cursor/offset. For shared global nonces, personal gaps are normal; require the allocation record. Chain mode needs commitment timing and independently sourced entropy evidence; local link checks alone cannot exclude salt/chain selection.
4. Run inspectable independent code locally against downloaded proof inputs, never a server's decoded `gameEvent`. Default dedicated per-player epoch engine: `scripts/fair-epoch.mjs` `verifyEpoch`; use `fair-verify` for its contract. MetaWin's production server (MSS) `games/hitCrashers/fairness.ts` `proveFairness` replays offset/configuration-dependent draws; its server echo is a convenience, not independent verification. Missing decoder or binding evidence leaves the corresponding claim unverified.
5. Display `PASS`, `FAIL` or `UNVERIFIABLE` with coverage and saved inputs. Missing player-kept commitment/client seed returns `UNVERIFIABLE`, never `PASS`. Waiting for reveal, missing global history or required entropy/receipt evidence must also leave whole-protocol verification `UNVERIFIABLE`. Expose helper reasons `seed_order`, `commitment`, `history_incomplete`, `client_seed`, `nonce_sequence`, `outcome`, `receipt`, `payout`, `voided_win` and affected index when provided; record each receipt's stake, payout and voided state so payouts and selective voids can be checked. Label per-round matches as input/output consistency; an epoch helper result alone does not prove entropy freshness or prevent selective abort.

## Correctness constraints

- **C8:** Independently reproduce reduction. For `N=qR+t`, modulo is unbiased iff `t=0`; bias depends on `R/N`, not merely uint32 width. Rejection removes it; statistics cannot prove its absence.
- **C11:** Plain SHA-256 commitments are valid; use HMAC for keyed derivation and verify the specified encoding/mapping.

## Pitfalls / red flags

Showing without saving; fetching replacement commitments during verification; `Math.random()` seed paths; sorted histories; opaque code; premature reveal. MSS `games/blackjack-table-live/index.ts` `tick` retires the stream at result after the last draw, not at deal.

## Verification

Exercise offline replay/export, missing-evidence statuses, commitment rewrites, swapped seeds, nonce skip/reuse/reorder, reused entropy across epochs and selective abort. Confirm refresh/reconnect preserves original records and active responses expose no future results or RNG traces.
