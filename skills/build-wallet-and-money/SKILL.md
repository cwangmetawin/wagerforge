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
`scripts/ledger.mjs` reference + `decimal.js` for money. Native amount is truth, fiat is display-only; precision from auth, never hardcoded; floor-round so players are never over-credited. Other stacks: same invariants in your ACID DB.

## Process
1. Balance = SUM of an append-only journal (or a cache updated in the SAME txn as the append).
2. Every debit is an atomic, overdraft-safe, idempotent guarded write under serializable isolation.
3. All bet/win/balance arithmetic through a decimal wrapper; never authorize spend from a cache/replica.

## Correctness constraints
- **C2:** A cached balance is acceptable ONLY if updated atomically in the same ACID transaction as the append-only ledger insert, with `UPDATE wallet SET balance=balance-:amt WHERE balance>=:amt` co-committed with the ledger row, a `CHECK(balance>=0)`, and an idempotency key. Daily reconciliation is a detection control, NOT prevention. Never authorize spend from a cache or read replica.

## Pitfalls / red flags
Stored balance reconciled only daily (C2); float money; over-crediting via ceil-rounding; non-idempotent debits.

## Verification
`scripts/settlement.test.mjs`: balance-from-journal, overdraft refused, idempotent transfer.
