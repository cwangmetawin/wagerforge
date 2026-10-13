---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Apply the prompt's declared exact-half insurance, 2:1 insurance profit, full-stake Double (no double-for-less), 3:2 natural and S17 policies. Other declared variants are valid, but must not replace these policies in the numeric answers.
- Insurance is offered against the Ace and costs half the opening stake, 10 units (not half the remaining bankroll and not the full stake). It is affordable from 25 units and is debited before the player's decisions, leaving 15 units.
- Hard 11 wants a full-stake Double (no double-for-less), which needs another 20 units, so with 15 left it is unaffordable: the chart's declared fallback applies and the player hits. The hand is not rejected, no overdraft or free Double is allowed, and the insurance debit is what removed the funds.
- Hole card 7: the dealer has A+7 = 18 and no natural, so the insurance is lost. The hit draws the 10 for 21 (three cards): an ordinary 21 that stands automatically and pays 1:1, not as a natural at 3:2. The dealer stands on soft 18, so the player wins and 40 units are returned (stake 20 plus 20 profit). Total wagered 30 (20 stake plus 10 insurance), total returned 40, net +10, bankroll 15 + 40 = 55.
- Hole card King: the dealer has a natural, so insurance returns 30 (10 principal plus 20 at 2:1) while the 20 stake is lost; total wagered 30, total returned 30, net 0, bankroll 45. With the declared peek, insurance was already debited but no Hit, Stand, Double or Split follows; if only peek is disabled, the three-card 21 still loses to the dealer natural, with the same money.
- Reject the custom chart missing the soft 13 row before the run opens; never fill holes from basic strategy or guess an action. A complete chart must also declare the insurance choice as TAKE or DECLINE: a missing insurance choice is rejected before opening, never defaulted. These invalid opening requests play 0 hands, consume 0 cards and book 0 accepted wagers; no partial run may start.
- Tests cover unaffordable insurance (skipped without error, the hand continues), an unfunded Double following its fallback, insurance settled both ways with and without a player natural, a three-card 21 that is not a natural, wagered totals that include the insurance, and missing chart rows or insurance choices rejected before opening without draws or accepted wagers.

DISQUALIFYING:
FAIL if the answer endorses, for this declared table, insurance priced on the current bankroll or the full stake, insurance against a ten-value upcard, letting the Double proceed with 15 units (overdraft or a free Double), rejecting the whole hand instead of following the chart fallback, paying the three-card 21 as a natural (50 units returned), returning insurance when the dealer has no natural, returning only 20 for a winning insurance, leaving the insurance out of the wagered total, filling the missing soft 13 row from basic strategy, defaulting an absent insurance choice, or starting a run with either incomplete chart.
