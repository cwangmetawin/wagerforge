---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Hand by hand: hand 1 stakes 20 and loses (bankroll 980); hand 2 stakes 40 and loses (940); hand 3 stakes 80 and ties, a push that returns the stake (940). Reaching the last step does not reset before its stake is placed. The push freezes the ladder, so hand 4 stakes 80 again and loses (860). Hand 4 was a loss at the third and last step, so the ladder restarts after settlement and hand 5 stakes 20 and loses (840). The ladder never goes to 160.
- The run ends after hand 5: profit is 840 - 1,000 = -160, which crosses the -150 stop-loss line, measured as bankroll minus buy-in. The last settled stake overshoots the loss amount by 10; do not clip or refund that loss. Hands 6 and 7 are never played, the take-profit 200 is never reached, and the remaining 840.00 is returned. After hand 4 the profit of -140 had not yet reached the line.
- The 1,000.00 take-profit observations are a denominator difference, not necessarily a bug. If lines are absolute bankroll levels, 1,000 >= 1,000 already holds at opening, so the run ends with zero hands and returns the whole 1,000.00 (the blackjack behaviour). If lines are profit amounts (bankroll minus buy-in), the profit 0 is below 1,000, so the run plays on and needs a bankroll of 2,000 (the baccarat behaviour). Each game must declare its denominator and tests must check both at opening.
- Tests cover the push freeze, a loss at the capped step, the inclusive line comparison, and opening with a line already met.

DISQUALIFYING:
FAIL if the answer endorses resetting on arrival at step 3 before placing its 80 stake, advancing or doubling the ladder on the tie (hand 4 at 160, which also exceeds the table limit), holding the stake at 80 or doubling to 160 after the capped loss, clipping the last loss at the stop line or returning 850 instead of 840, playing hand 6 or ending the run by the take-profit, the table limit or hand count instead of the stop-loss, measuring the stop-loss as an absolute bankroll level of 150 or from a previous peak, treating the two QA observations as one denominator, or calling either observation a bug without identifying the denominator difference.
