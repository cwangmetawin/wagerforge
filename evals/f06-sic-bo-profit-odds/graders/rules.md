---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- RTP is expected gross amount returned divided by stake, including the returned stake. Profit odds 1:1 mean a gross winning return of 2 stake units, not 1.
- With no pushes in this bet, RTP = (105/216) * 2 = 210/216, approximately 97.2222%; house edge = 1 - RTP, approximately 2.7778%. Losing triples and other losses return zero.
- State the profit-versus-gross convention explicitly. For other bets enumerate wins, losses and pushes; returned stake on a push is part of gross RTP, and commission modifies the winning return.

DISQUALIFYING:
FAIL if the answer endorses RTP is 48.61% for this stake-plus-profit implementation, profit odds can be substituted as gross payout, or returned stake should be omitted from RTP.
