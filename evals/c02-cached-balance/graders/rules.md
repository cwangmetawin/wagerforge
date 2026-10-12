---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Never authorize spend from a cached or replica balance. Use the authoritative primary money store with an atomic guarded balance update that cannot overdraw, serializable isolation or a proven equivalent concurrency guarantee.
- Co-commit the debit and append-only double-entry ledger entries, and bind a unique idempotency key to the immutable transfer content. Identical replay succeeds once; different content conflicts.
- A materialized balance is usable only when updated atomically in the same ACID transaction as the ledger. Use exact integer currency atoms or exact decimal money; concurrent bets must not both spend the same funds.

DISQUALIFYING:
FAIL if the answer endorses a cached/replica balance plus queued writes, a nightly reconcile, Redis speed, or a check-then-write race is sufficient authorization for a real-money debit.
