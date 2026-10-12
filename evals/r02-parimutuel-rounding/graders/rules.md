---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Do not floor a common value-per-share before multiplying holdings. Conservation alone does not establish proportional allocation: the draft gives 0 and 10, while this exact example must give 6 and 4.
- Compute exact rational entitlement per winner as pot * shares_i / totalWinningShares using integer/BigInt-safe arithmetic, then round per winner at the final currency-atom boundary.
- Allocate residual atoms by a documented deterministic rule, such as largest remainders with a stable tie-break or a bounded final-residual policy after individual proportional payouts. Preserve the full payable pot exactly and use the final locked share composition; handle zero winning shares explicitly.

DISQUALIFYING:
FAIL if the answer endorses floor(pot / totalWinningShares) followed by multiplication and all remaining pot to the last winner preserves fair proportions, or exact conservation alone is enough even when the 60/40 example pays 0/10.
