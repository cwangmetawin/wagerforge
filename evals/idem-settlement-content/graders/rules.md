---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Store one immutable settlement decision per bet id bound to player, house/account identity, stake and payout. A zero-payout loss still requires a durable terminal decision.
- Identical content replay is idempotent success with no further money movement; changed payout, player, stake or accounts is an idempotency conflict, never silent ok and never a second settlement. A genuine correction needs a distinct audited adjustment process linked to the original decision.
- Transfer-leg keys also bind immutable from/to/amount fingerprints. Use a DB UNIQUE key and atomic guarded transition/co-committed ledger writes to survive concurrent duplicate delivery; a check-then-write in memory is insufficient.
- SETTLED/REFUNDED/REJECTED terminal outcomes are mutually exclusive, and refund cannot pay again after settlement.

DISQUALIFYING:
FAIL if the answer endorses retrying b17 with a corrected payout is ordinary idempotent success, a payout-zero loss need not be recorded, bet id alone permits different money content, or sequential duplicate tests prove concurrent exactly-once behavior.
