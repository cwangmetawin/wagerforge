---
name: build-wallet-and-money
description: Use when implementing the wallet, balance, or money math of a real-money game — bet/win/balance arithmetic, the ledger, and overdraft safety. Keywords wallet, ledger, balance, decimal, idempotency, double-entry.
constraints: C2
---

# build-wallet-and-money

## When to use / When NOT
- Use when: building balance/debit/credit, the journal, or money arithmetic.
- NOT for: the bet→settle orchestration (→ `build-durable-settlement`).

## Default stack (+ escape hatch)
`scripts/ledger.mjs` reference. Native amount is truth, fiat is display-only; precision from auth, never hardcoded; floor-round so players are never over-credited. Money libraries differ by layer — map "decimal" to the layer:
- **RGS settlement (authoritative):** `fixValue(v)=Number(v.toFixed(2))` fiat slots / `toFixed(8)` crypto mini-games — NOT decimal.js. Pooled/parimutuel: integer-precision scaling (round `valuePerShare` to 10^12, floor if it would exceed the pot) and give the LAST winning bet `dust = pot − totalPaidOut` so payouts sum exactly to the pool.
- **Host (Nuxt):** `bignumber.js` v10 for balance/affordability.
- **Client GDK (studio):** `decimal.js` wrapper, default rounding FLOOR. Its `roundDown()` calls `Decimal.ROUND_CEIL` and `roundUp()` calls `ROUND_UP` (inverted names) — verify intent before reuse.

Other stacks: same invariants in your ACID DB.

## Process
1. Balance = SUM of an append-only journal (or a cache updated in the SAME txn as the append).
2. Every debit is an atomic, overdraft-safe, idempotent guarded write under serializable isolation.
3. All bet/win/balance arithmetic through the layer's money wrapper (`fixValue`/bignumber/decimal); for pooled payouts conserve money exactly (last-bet dust). Never authorize spend from a cache/replica.

## Correctness constraints
- **C2:** A cached balance is acceptable ONLY if updated atomically in the same ACID transaction as the append-only ledger insert, with `UPDATE wallet SET balance=balance-:amt WHERE balance>=:amt` co-committed with the ledger row, a `CHECK(balance>=0)`, and an idempotency key. Daily reconciliation is a detection control, NOT prevention. Never authorize spend from a cache or read replica.

## Pitfalls / red flags
Stored balance reconciled only daily (C2); float money; over-crediting via ceil-rounding; non-idempotent debits; assuming one universal decimal.js wrapper (server uses `fixValue`/`toFixed`, host uses bignumber.js); trusting the studio wrapper's inverted `roundDown`/`roundUp` names; pooled payouts that don't conserve money (no last-bet dust → sum != pool).

## Verification
`scripts/settlement.test.mjs`: balance-from-journal, overdraft refused, idempotent transfer.
