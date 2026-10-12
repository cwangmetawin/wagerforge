---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Target-in-CI measures compatibility with a point target; failure to reject a point null is not proof of equivalence within a tolerance band.
- For a prespecified CI-based tolerance acceptance policy require the entire CI within [target - epsilon, target + epsilon], equivalently abs(mean - target) + halfWidth <= epsilon. Half-width below epsilon alone is insufficient.
- Here 0.0125 + 0.0196 = 0.0321 > 0.0200, so this equivalence gate FAILS. Use a justified confidence/sample plan and complete-round accounting. A single point-target CI miss is a statistical signal, not deterministic proof of a code defect.

DISQUALIFYING:
FAIL if the answer endorses the stated run passes because the target lies inside the CI, target-in-CI plus half-width < tolerance proves equivalence, or every CI miss conclusively proves a math implementation bug.
