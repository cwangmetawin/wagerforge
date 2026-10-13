---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Complete placeBet acceptance before deriving or revealing the outcome: validate the request and money gates, atomically guard/debit or irrevocably reserve the stake, persist an OPEN bet and allocate its nonce in the same acceptance transaction.
- Insufficient funds is a terminal REJECTED request/id, with no allocated nonce and no outcome. A deposit cannot resurrect that rejected id; a new bet requires a new accepted request.
- Settle and refund are mutually exclusive: an atomic conditional status guard moves an OPEN bet to exactly one decision (settle, possibly through a persisted SETTLING state, or refund, possibly through REFUNDING), and only that decision's money leg may run. The payout credit commits in one ledger transaction with the move to SETTLED (or that leg's progress record), the stake return with the move to REFUNDED; unique bet ids and content-bound replay.
- Persist enough accepted config/action/seed inputs and decision state for deterministic recovery; do not leave money acceptance dependent on the player acting after seeing a loss.

DISQUALIFYING:
FAIL if the answer endorses debiting only after deriving/revealing the result is safe, a player can avoid a losing stake by emptying the wallet, or insufficient-funds retries can revive the same bet after a deposit.
