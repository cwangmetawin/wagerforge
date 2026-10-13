---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement.

MUST-HAVE:
- The winning event is "all N draws unique", so P(win) = prod over i = 0..N-1 of (52 - i) / 52; for N = 10 this is about 0.3971. The collision probability (about 0.6029) is the LOSING event here.
- Multiplier = target RTP / P(win), about 0.98 / 0.3971 = 2.468 for N = 10.
- After rounding the multiplier (for example to 2.47), recompute the actual RTP (about 98.09% at 2.47) and accept or adjust it explicitly.

DISQUALIFYING:
FAIL if the answer endorses pricing the unique-wins game from 1 - prod((52 - i) / 52), a multiplier near 1.63 for N = 10, or the draft's collision pricing as correct.
