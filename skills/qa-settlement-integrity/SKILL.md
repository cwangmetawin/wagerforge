---
name: qa-settlement-integrity
description: Use when testing wallet or settlement integrity under concurrent duplicates, crashes, immutable payout retries, refund races, rejected bets, or second-round lifecycle failures.
metadata:
  constraints: C2
---

# qa-settlement-integrity

> **Core insight:** Identical game output does not prove one payment: test durable platform deduplication with concurrent duplicates, crashes and a second round, asserting one terminal fate per bet.

## When to use / When NOT

- Use for wallet, settlement and game/platform integration integrity suites.
- Implementation: `build-durable-settlement` and `build-wallet-and-money`.

## Process

1. Assert exact atom journal conservation and overdraft refusal. Reject invalid IDs/accounts, string/Number ledger amounts, off-grid stakes and undefined/null/NaN/negative payout without changing settlement state or journal. `scripts/money.mjs` `toAtoms` converts valid boundary decimals without rounding; ledger amounts must be BigInt.
2. Prove placement debits before outcome/nonce allocation or reveal. Insufficient placement is terminal REJECTED; fund later and retry the same betId: still rejected, no outcome. Same betId with another player/house/stake must conflict.
3. Send identical duplicates **concurrently**, synchronized at the database write boundary, including across replicas and restart. Require UNIQUE betId/leg keys and `INSERT ... ON CONFLICT` in the same transaction as guarded balance writes, journal and status changes. Compare persisted content; sequential replay or a process-local map cannot prove durable deduplication.
4. Inject crashes before/after decision persistence, journal credit and external receipt. Retried payout must match the persisted decision; zero-loss cannot become a win. Race settle against refund: exactly one terminal fate, SETTLED/REFUNDED/REJECTED. `scripts/settlement.mjs` `placeBet`/`settleBet`/`refundBet` demonstrate this lifecycle; house insufficiency keeps `settling`/`refunding`, never erases the decision. Reconcile uncertain external sends against receiver deduplication/receipts.
5. Test game determinism separately from platform payment atomicity. MetaWin's production server (MSS) `games/snakes-pro/index.ts` `server.tick` assigns identical pre-settlement drawId replay deduplication to the platform. Its comment is not proof of database transactions. Require real platform drawId replay, concurrent delivery and restart tests.
6. Cover manual/automatic stale settlement, invalid phase/winner, pending-payout flush once, and next-round cleanup. MSS `games/snakes-pro/tests/security/auto-settle-idempotency.test.ts` `test_newRound_clearsSettledAt_andRound2StillSettles` tests the second round; also assert old-round replay cannot pay against a new round.
7. Inject recovery after sells/cashouts: remaining pool liabilities plus earned pending payouts are paid once, never original gross stakes after realization. Require every queued money command to accept or cancel; a refunded accepted command must not also cancel. Exact atom pools use `last=pot-sum(previous)`. Legacy MSS `games/snakes-pro/index.ts` `computePayouts` conserves within tolerance (1e-8), not strict atom equality.
8. Signed-result negatives (another round or environment, illegal cause, malformed canonical form, lossy conversion) follow `build-signed-realtime-settlement`; each must leave the round open and unpaid.

## Correctness constraints

- **C2:** Prove atomic, overdraft-safe, idempotent guarded writes under serializable isolation, with ledger and permitted cache updates in the same ACID transaction. Never authorize spend from a cache/replica. Reconciliation alone is not prevention.

## Pitfalls / red flags

Happy-path-only tests; sequential duplicates; a zero payout without terminal state; gross-stake recovery; equating game determinism with durable platform payment.

## Verification

Run `scripts/money.test.mjs` and `scripts/settlement.test.mjs`; retain independent database, receiver and lifecycle evidence. Bundled in-memory tests do not establish production atomicity.
