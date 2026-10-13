---
name: fair-verify
description: Use when building or auditing an independent player verifier, epoch history, nonce allocation, saved commitment evidence, or outcome re-derivation.
metadata:
  constraints: C8, C11
---

# fair-verify

> **Core insight:** Per-round recomputation proves input/output consistency; epoch verification needs player-kept commitments, client seeds and ordered history to detect input substitution or nonce selection.

## When to use / When NOT

- Use for independent player verification and fairness audit evidence.
- Seed lifecycle: `fair-commit-reveal`; mappings: `fair-outcome-mappers`; chains: `fair-hash-chain`. Shoe/draw ledgers: `fair-shoe-draw-ledger`.

## Process

1. Select from versioned proof metadata: derivation, draw limits/order, rejection cursor, commitment scope and reveal boundary. Multiplayer can use round streams, shoe/draw ledgers, hash chains or signed authority reports. Zero-RNG skill outcomes have no RNG proof. MetaWin's production server (MSS) `games/hitShooter/fairness.ts` `proveFairness` consumes zero draws. Server `proveFairness` replay remains separate from independent verification.
2. Pin UTF-8 key/message encoding, extraction width, offset, action, parameters and configuration accepted with the wager. Reproduce every draw, including cosmetic/recursive draws. MSS `games/hitCrashers/fairness.ts` `proveFairness` uses offset and configuration; MSS `games/chase/index.ts` `proveFairness` consumes uint32. WF's bundled protocol is illustrative, not an MSS byte contract.
3. Default for dedicated per-player epochs: `scripts/fair-epoch.mjs` `verifyEpoch({serverSeed,playerLog,rounds,deriveFn})`. `playerLog` is the client's own record in write order: the commitment, then a client seed generated after it, then one receipt (outcome, nonce if shown) per accepted bet as answered at bet time. Supply server history in played order, cancelled rounds included; nonces must be `0,1,2,…`. Receipts expose hidden/invented bets and a history re-sorted after play; a seed logged before the commitment fails. Global shared nonces require the global allocation record and a suitable verifier; this helper cannot validate them.
4. Report missing saved evidence as `UNVERIFIABLE`, never `PASS`. Helper failure reasons are `seed_order`, `commitment`, `history_incomplete`, `client_seed`, `nonce_sequence`, `outcome`, `receipt`, and, with the game's `payoutFn`, `payout` and `voided_win` (a voided round that would have won); invalid evidence or history throws. Its `PASS` covers supplied evidence; it does not establish entropy freshness, receipt binding or completeness without independent records. Audit accepted receipts binding epoch, nonce, client seed, stake in exact atoms and every outcome-affecting parameter; failures, cancellations and rotations remain auditable, with no selective cancel/settle.
5. Use `scripts/fair-rng.mjs` `verify()` as a building block: `deriveFn(stream,ctx)` gets frozen `{serverSeed,clientSeed,nonce}`. Single-outcome `fairFloat` protocols use `ctx`, never counter-block bytes. Accept only finite numbers or dense nested arrays thereof; invalid claims cannot match, invalid recomputation throws. Prove an adapter with an honest known-answer PASS and FAIL negatives for a tampered commitment, server seed, client seed, nonce, configuration and outcome, and show that a `:0` suffix changes the HMAC. Check the player-saved commitment first; reproduce the game's mapper, configuration and display/settlement rounding exactly.

## Correctness constraints

- **C8:** Independently reproduce the specified reduction. For source size `N=qR+t`, modulo is unbiased iff `t=0`; magnitude depends on `R/N`. Rejection removes bias.
- **C11:** Plain SHA-256 commitments are valid; keyed derivation uses HMAC. Source width alone never establishes unbiased mapping.

## Pitfalls / red flags

Old guidance already forbids late commitments and nonce reuse; per-round `verify()` cannot detect skipped/reused/reordered nonces, server-selected client seeds or a substituted seed with a matching substituted commitment. Echoing `gameEvent` provides no independent check.

## Verification

Run `scripts/fair-epoch.test.mjs` and `scripts/fair-rng.test.mjs`; retain adversarial input/history evidence and real engine/proof parity from `qa-fairness-verification`.
