---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- A 21 made on a split hand is an ordinary 21, never a natural: it pays 1:1 and loses to a dealer natural. Only an unsplit opening two-card 21 is a natural. Settlement order: a dealer natural beats every hand except a player natural, which pushes; a player natural pays its premium; ordinary totals compare, equal totals push.
- The natural premium must land on the 0.01 grid without flooring the table aggregate: either odd-unit stakes are rejected (grid-even stakes required) or each hand's return is floored separately. For the bets as given, the answer states the figures under per hand flooring: seats 1 and 2 each return 0.02 (2 units, not 2.5), 0.04 together; flooring the summed natural return gives 0.05 and is wrong.
- Case A (dealer 20, no natural): seat 1 returns 0.02, seat 2 returns 0.02, and the two seat-3 split hands return 0.06 each (1:1 on 0.03), so 0.16 is credited against 0.08 wagered (seat 1 0.01, seat 2 0.01, seat 3 0.06 for opening plus split), net +0.08. The code under review would credit 0.20.
- Case B (dealer natural, no peek): seats 1 and 2 push, getting 0.01 back each; both seat-3 split hands lose, so 0.02 is credited against 0.08 wagered, net -0.06. The code under review would push the split 21s and credit 0.08.
- With a peek, the dealer natural ends the round before any decision, so seat 3 never splits and no paid action is admitted: 0.05 wagered, 0.02 credited, net -0.03; the extra 0.03 split stake is never exposed. A table that does not peek must count Double and Split stakes as losing to a later natural.
- Tests cover split 21 against a dealer natural and against a dealer 20, odd-unit natural pairs against an aggregate-floor counterexample, and the peek versus no-peek liability.

DISQUALIFYING:
FAIL if the answer endorses paying split-hand 21s as naturals (3:2, or a push against the dealer natural), flooring the natural premium once over the whole table, crediting 0.20 in Case A or 0.08 in Case B, letting seat 3 split after a peek has shown a dealer natural, or treating the split stake of a no-peek table as safe from a later dealer natural.
