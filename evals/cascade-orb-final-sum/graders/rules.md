---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Preserve orbs through removal and gravity, including surviving orbs and late arrivals on the terminal non-winning board. Count each terminal orb once: the terminal sum is 2 + 5 = 7, not a sum of repeated sightings across waves or a product of orb values.
- Accumulate the unmultiplied wave awards first and multiply the whole spin once by that terminal sum, defaulting to one when no orbs remain. This replay pays (2 + 3 + 4) x (2 + 5) = 63 units before any cap; the late 5x orb contributes despite its board having no further win. An orb-free spin keeps its base win, and a spin with zero base win still pays zero even if orbs are visible.
- Apply the configured win cap after the final multiplication, respecting any remaining feature win allowance. Deterministic tests must cover an orb surviving several waves, a terminal late arrival, no orbs, zero-win orb boards and a cap reached by the multiplied total.

DISQUALIFYING:
FAIL if the answer endorses pricing each wave with only its then-visible orb sum (18 units here), counting a surviving orb again on every wave, multiplying orb values together, ignoring the late 5x orb because its board has no win, paying zero on an orb-free winning spin, treating orbs as standalone cash awards, or capping base wins before the multiplier and allowing the final payment to exceed the cap.
