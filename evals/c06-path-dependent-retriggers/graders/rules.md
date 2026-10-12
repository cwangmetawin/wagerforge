---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Simple branching/geometric closed forms require their stated assumptions: subcritical reproduction, iid offspring/rewards, appropriate finite moments, and no unmodelled path-dependent payout changes.
- Growing multipliers and state-dependent trigger chances violate the simple iid constant-reward model. An average trigger probability is insufficient, and reproduction below one alone need not guarantee finite moments of multiplier-weighted rewards.
- An exact finite-state recursion or absorbing Markov/reward model is possible if the complete state and termination/moment conditions are justified. Otherwise validate complete-feature Monte Carlo with CIs, tail/termination checks and sufficient precision; Monte Carlo estimates are not exact.

DISQUALIFYING:
FAIL if the answer endorses the geometric formula is always exact for growing multipliers/state-dependent retriggers, replacing state by averages preserves RTP and variance, or a Monte Carlo result is an exact value without uncertainty.
