---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- The room is stalled: the bound is 3 x 20 s = 60 s and the 95 s gap is beyond it. The tick must not resume or catch up: no draw, no late resolution of the round, no acceptance of new bets or cash-outs. It voids the open tickets from tick-entry state, discards anything computed after tick entry, and restarts the schedule with a fresh round.
- Refund each open accepted debit exactly once at its debited amount: A 5.00 and B 10.00 from entry state, and D 3.00 as a new queued debit that state does not hold, which is cancelled. B's accepted but unsettled 14.00 cash-out quote is discarded under this void policy, even though the request predates tick entry. The total returned is 5.00 + 10.00 + 3.00 = 18.00.
- C's 7.00 was already paid, so its redelivered command is a proven terminal at tick entry and is excluded: it is neither refunded nor cancelled, and C receives 0.00 from this tick. The expected figures are new credits or refunds, not final wallet balances.
- Every debit gets one fate. A and B are either credited from their entry-state rows or cancelled by id, never both; the cancelled ids contain D, and A and B only if the declared route is cancel-everything, and never C.

DISQUALIFYING:
FAIL if the answer endorses resuming the stalled round with catch-up draws or resolving it late, paying B's 14.00 cash-out or any win computed after tick entry, refunding or cancelling C's 7.00 again, both crediting and cancelling the same stake, leaving D's debit uncancelled, accepting new bets or cash-outs before the restart, or reopening the stale phase instead of restarting the schedule.
