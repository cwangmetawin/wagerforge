---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed.

MUST-HAVE:
- Double and Split are NEW paid stakes: the additional stake (equal to the affected hand's stake) is debited before any extra card is drawn; an unaffordable Double or Split is refused without drawing or changing state.
- Hit and Stand are free continuations; a repeated opening-bet amount on a continuation is at most a binding shadow of the opening wager, never a new debit.
- The server declares each action's money semantics and validates the declared debit mode and the active hand before mutating state or consuming RNG; it never infers a new debit from an amount that happens to equal the opening bet.

DISQUALIFYING:
FAIL if the answer endorses "only the first action is charged" for Double or Split, lets Double or Split increase exposure without a new debit, or charges a new stake on Hit or Stand because the client repeated the opening amount.
