---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Retain wild coordinates, roles, per-wild multipliers and the remaining feature horizon separately from ordinary displayed symbols. Shift retained wilds right before refill, overlay them on the fresh reels, then collect and evaluate; ordinary wild substitution alone does not model this feature.
- Collect only uncovered coins in each eligible wild's own column, with the collectible reels and rows stated explicitly. Each eligible gold wild pays that column's coin pool with its retained multiplier, alongside evaluator awards. The covered 7-unit coin is excluded: the retained wild's collection component is 3 x (2 + 4) = 18, not a complete respin total without the evaluator and any other eligible collections.
- The new 5x tier belongs to the fresh wild; the surviving wild keeps 3x. New arrivals extend the remaining respin horizon. Complete-feature RTP includes the trigger award and the scheduled respin awards with these state transitions, rather than reducing retained wilds to ordinary-wild averages or a fixed respin count.
- Validate covered coins, eligible reels/rows, preserved multipliers and new-arrival horizon extensions with deterministic feature paths; any Monte Carlo estimate must simulate complete paths and report confidence intervals.

DISQUALIFYING:
FAIL if the answer endorses ordinary-wild evaluation plus an unrestricted refill sweep as sufficient, collecting covered coins (including the 7-unit coin), sweeping every reel for every wild, upgrading the retained 3x wild to 5x on the new arrival, or ending at a fixed nominal respin count despite new arrivals extending the horizon.
