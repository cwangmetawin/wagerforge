---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- RTP is multilinear in independent normalized reel probabilities for a fixed outcome evaluator, not proportional to raw symbol weights. Changing one raw weight renormalizes the whole reel distribution.
- Recompute the full expected gross return per unit stake over the complete game, including losses, triggers, free spins and any changed feature probabilities. Weight effects by their actual EV contributions; the net change need not have the same magnitude or even the assumed sign.
- Separate any conditional approximation from an exhaustive calculation or a validated simulation with uncertainty.

DISQUALIFYING:
FAIL if the answer endorses doubling a reel weight doubles RTP, scales total RTP proportionally, or permits shipping from a proportional EV shortcut without recomputing the complete normalized model.
