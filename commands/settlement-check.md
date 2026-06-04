---
description: Audit settlement/wallet code for idempotency, crash-replay safety, and no double-pay.
---

Use `qa-settlement-integrity` to inject duplicate webhooks, crashes between legs, and retries against the settlement/wallet code, and `build-durable-settlement` + `build-wallet-and-money` to confirm the atomic, overdraft-safe, idempotent guarantees (C2). Apply to: $ARGUMENTS

Report: any lost/double-pay path, non-idempotent step, or spend authorized from a cache.
