---
name: build-durable-settlement
description: Use when orchestrating a bet's settlement across steps or services — debiting stake and crediting payout exactly once despite crashes, retries, duplicate webhooks, or async on-chain payouts. Keywords settlement, idempotency key, saga, exactly-once, durable execution.
constraints: C2
---

# build-durable-settlement

## When to use / When NOT
- Use when: composing the bet→result→settle lifecycle, especially with external/on-chain payouts.
- NOT for: the ledger primitive itself (→ `build-wallet-and-money`).

## Default stack (+ escape hatch)
`scripts/settlement.mjs` pattern (idempotent transfers keyed off betId). For multi-service/async: Inngest or BullMQ (Redis); Temporal for complex sagas. NEVER put n8n on the bet hot path (it is for internal ops automation).

## Process
1. Key every side-effecting step with a deterministic idempotency key derived from the betId.
2. Make each external call (incl. on-chain payout) exactly-once via the idempotency key; safe to replay.
3. On crash/retry, re-run the whole settle — completed steps are no-ops, remaining steps finish.

## Correctness constraints
- **C2:** The settlement's debit/credit legs must each be atomic, overdraft-safe, idempotent guarded writes co-committed with the ledger (see `build-wallet-and-money`). A cached balance is never the authority. Provably-fair outcomes are deterministic on (seed,nonce), so re-deriving during a retry is safe.

## Pitfalls / red flags
Non-idempotent external calls; settling from a cached balance; no timeout/backoff; measuring only the outbound call latency, not end-to-end.

## Verification
`scripts/settlement.test.mjs`: replay/duplicate-webhook does not double-pay; crash-between-legs completes exactly once.
