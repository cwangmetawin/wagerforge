---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Sufficiency is a confidence interval half-width within the prespecified tolerance at the stated confidence, not a fixed spin count. ±0.1 percentage point is epsilon = 0.001 in RTP fraction units.
- For independent rounds with valid SD about 20, the normal sizing approximation N >= (1.96 * 20 / 0.001)^2 is about 1.53664 billion. At 1 million, the half-width is about 0.0392, or 3.92 percentage points.
- Simulate complete rounds including features and losses, justify variance/tail estimation and CI assumptions, and use a prespecified sample plan or a valid sequential procedure. Rare unobserved jackpots and repeated unadjusted peeking do not establish convergence.

DISQUALIFYING:
FAIL if the answer endorses one million spins is automatically enough, a spin count alone proves convergence, ±0.1% means a relative 0.1% error here, or no observed rare payout proves low variance.
