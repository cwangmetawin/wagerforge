---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Under the stated numeric C >= target rule, C is always at least 1 and target 1.00 wins with probability 1. It cannot simultaneously have win probability 1-h.
- Require a target strictly greater than 1 (for example 1.01), or introduce an explicit instabust flag/outcome that always loses regardless of numeric equality and define that protocol consistently. An instabust is not a normal winning 1.00 outcome.
- For the uncapped untransformed continuous model and targets > 1, P(C >= m) = (1-h)/m, giving mP = 1-h. Floor consistently for display and settlement; rounding upward, payout caps and settlement transforms require recomputation and can break that simple identity.

DISQUALIFYING:
FAIL if the answer endorses the given numeric equality-paying 1.00 target wins with probability 98%, its RTP remains 98% under the stated rule, or arbitrary rounding/caps preserve the identity automatically.
