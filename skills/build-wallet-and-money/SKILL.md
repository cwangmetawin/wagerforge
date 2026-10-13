---
name: build-wallet-and-money
description: Use when implementing real-money wallet debits, credits, balances, ledger idempotency, currency atoms, or payout rounding.
metadata:
  constraints: C2
---

# build-wallet-and-money

> **Core insight:** Daily reconciliation only detects an overdraft after the money left; prevention is atomic at debit time — guarded `balance>=:amt` UPDATE + `CHECK(balance>=0)` co-committed with the ledger row, never authorized from a cache/replica.

## When to use / When NOT

- Use for wallet/journal primitives and currency conversion.
- For placement, settlement decisions and recovery, use `build-durable-settlement`.

## Default stack + escape hatch

TypeScript + PixiJS/Phaser presentation + Node; authoritative BigInt atoms and an ACID database. Other stacks must preserve exact amounts, transactional guards and content-bound deduplication.

## Process

1. Validate non-empty identifiers, distinct accounts, positive stake/transfer and explicit non-negative payout before their mutation. `scripts/money.mjs` exports `toAtoms(amount, decimals)` (0–18; rejects off-grid/negative/non-finite input without rounding, and any Number beyond 15 significant digits, which JSON parsing may already have changed: send such amounts as decimal strings), `fromAtoms` (canonical decimal string), and `assertAtoms`. Decimal boundary input becomes atoms; `scripts/ledger.mjs` `transfer` accepts only positive BigInt.
2. Journal entries are append-only double-entry: every transfer posts a debit and a matching credit that sum to zero in one transaction; balances derive from them. Acquire a UNIQUE idempotency key using `INSERT ... ON CONFLICT` in the same transaction as guarded balance UPDATE and journal inserts. Compare stored `{from,to,amount}`: identical replay is a no-op; changed content is a conflict. Insufficient transfers record no key. The reference `createLedger`/`balanceOf` use in-memory maps/BigInt, not durable storage: copy them only with the database rules in `build-durable-settlement` step 4.
3. Specify rounding per layer, never “floor everything.” MetaWin's production server (MSS) `games/zeus/gamePlay.ts` `fixValue` uses `Number(x.toFixed(2))`; MSS `games/chase/index.ts` `fixValue` uses eight places. These round to nearest, not floor; preserve documented game math. When rounding is part of the game math, declare it per action and verify realized EV on every supported wallet grid: MSS `games/highLowHit/gameLogic.ts` `roundingPlan`/`applyStochasticRatio` round a fractional wallet-unit payout stochastically. Exact stake conversion rejects finer-than-grid values instead of changing the stake.
4. Allocate exact pools in atoms, with documented proportional allocation and final payout `potAtoms-sum(previousPayoutAtoms)`. Legacy MSS `games/snakes-pro/index.ts` `computePayouts` rounds value-per-share at 10^12 precision, conditionally floors to avoid exceeding the pot, and corrects dust only when its magnitude exceeds 1e-8. Its conservation is tolerance-based, not exact atom equality.
5. Signed external results (canonical fields, key isolation, round binding, lossless atom conversion) follow `build-signed-realtime-settlement`; a failed check leaves the round open and unpaid.

## Correctness constraints

- **C2:** Debit is an atomic, overdraft-safe, idempotent guarded write under serializable isolation. A cached balance is allowed only when updated in the same ACID transaction as the ledger, with `CHECK(balance>=0)`. Never authorize spend from a cache/replica; daily reconciliation detects errors after the fact.

## Pitfalls / red flags

String/Number ledger amounts; accepting invalid payout as zero; unbound idempotency keys; blanket floor rounding; claiming legacy float dust correction proves exact conservation.

## Verification

Run `scripts/money.test.mjs` and `scripts/settlement.test.mjs`; require real database concurrency/restart evidence via `qa-settlement-integrity`. Reference tests do not prove production persistence.
