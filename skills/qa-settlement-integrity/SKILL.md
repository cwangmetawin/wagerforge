---
name: qa-settlement-integrity
description: Use when testing settlement/wallet code for integrity — injecting crashes, retries, and duplicate webhooks to prove no lost or double payouts and idempotent recovery. Keywords settlement test, idempotency test, crash replay, double-pay.
constraints: C2
---

# qa-settlement-integrity

## When to use / When NOT
- Use when: writing the integrity suite for the wallet/settlement layer.
- NOT for: implementing settlement (→ `build-durable-settlement`).

## Default stack (+ escape hatch)
`node:test` against `scripts/ledger.mjs`/`settlement.mjs`. Other stacks: same scenarios against your DB.

## Process
1. **Idempotency:** run a settle twice (duplicate webhook) — assert balances change once.
2. **Crash-replay:** perform only the first leg, then re-run settle — assert it completes exactly once.
3. **Conservation:** assert value is conserved (every transfer nets to zero) and overdraft is refused.

## Correctness constraints
- **C2:** The suite must prove the atomic/overdraft-safe/idempotent guarantee, not just happy-path balances. A passing functional test with a non-idempotent debit still double-pays under retry — test the retry.

## Pitfalls / red flags
Only testing happy path; not simulating partial/crash states; trusting a cached balance in assertions.

## Verification
The `scripts/settlement.test.mjs` suite passes (idempotency + crash-replay + conservation).
