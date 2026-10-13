---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Price the lines with the first ordinary symbol after leading wilds setting the paytable row and each scatter ending its run without substituting. Top W W W B pays B x4 = 15, and the wild-prefix row of 25 is neither added nor taken instead. Middle A W is a 2-symbol run ended by the scatter and pays 0. Bottom B B W pays B x3 = 5. The lines total 20.
- Scatter cash is additive and counted on the original board: 3 scatters pay 2 x total bet 3 = 6, so the opening spin pays 26, and the same 3 scatters meet the free-spin threshold.
- The whole round credits 106 = 26 + 80, each amount once. The continuation's win of 106 already contains the opening 26 (it is cumulative), so an adapter crediting every response's win would credit 132 and overpay by 26. The answer requires declaring each response cumulative or incremental and crediting only the delta of 80 (or having the continuation report 80).
- Server tests cover scatter interruption of runs, a wild prefix that is never added or compared, additive scatter cash, the trigger count from the original board below, at and above the threshold, and a single wallet credit per amount.

DISQUALIFYING:
FAIL if the answer endorses adding the wild-prefix row to the symbol run (total 51) or paying the larger of the two (total 36), letting a scatter substitute or continue a run (for example A x5 = 200 on the middle line), omitting the scatter cash or computing it on the line bet, or crediting both the opening 26 and the continuation 106 as separate wins (132).
