---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Tick 29,000, "undo main 6": scan A's main chips newest first and cancel the original debit of each whole chip that fits the remaining amount: the newest main 2 (remaining 6 to 4), the other main 2 (4 to 2), skip the main 5 because it does not fit the remaining 2, then continue to the older main 1 (2 to 1). The main 5 is never split or partly refunded. The refund is 2 + 2 + 1 = 5, not 6 or the stop-scan result 4. The main 5 and side 1 stay in settlement because a positive main stake remains.
- Tick 29,500: the re-delivered chip command is already tombstoned, so it is not rebooked and it debits, refunds or cancels nothing (0). "Undo main 5" cancels the main 5 and, because that was the last main chip, the side 1 as well: 5 + 1 = 6 refunded at this tick and 5 + 6 = 11 over the round, every one of A's chips. Nothing of A's remains in settlement or wagered volume and no side bet is orphaned. The refunds are cancellations of the original debits, never wins.
- At 30,000 nobody has a stake, but the round still runs its declared draw process: exactly one draw sequence is consumed and recorded in history, nothing settles, no wallet movement occurs (no wins, no refunds), and the next round is scheduled.
- The proposed tests cover undo exactness (5 refunded of 6 requested, skipping the main 5 and continuing to the older main 1), replay of a removed chip command (0 debit, refund or cancellation, no rebooking), removal of the side chip with the last main chip, and the empty round (one draw consumed, zero wallet legs, next round scheduled).

DISQUALIFYING:
FAIL if the answer endorses refunding only 4 at tick 29,000 by stopping the scan at the main 5, refunding 6 by splitting or reducing the main 5 chip, rebooking or double-refunding the re-delivered chip command (a free stake or a second refund), leaving side 1 standing to settle after every main chip is gone, paying refunds through wins, or skipping the draw and history because no one bet.
