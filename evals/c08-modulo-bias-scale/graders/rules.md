---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- For M = 2^32 and n = 37, M mod n = 7. Seven buckets get one extra source value; the per-bucket absolute probability error is less than 1/M and relative error is about 1e-8. This bias is not severe in the stated small-range case.
- Bias magnitude depends on range/source ratio, not just source bit width. A range of 3,000,000,000 is comparable to 2^32 and has substantial bias; do not generalize the tiny roulette error to every uint32 reduction. Divisor ranges, including valid power-of-two ranges, have zero modulo bias.
- Use rejection sampling: limit = M - (M % n), reject x >= limit, then return x % n from a fresh uniform draw. Keep arithmetic exact and validate the range/source contract; statistical test success alone does not prove absence of mapping bias.

DISQUALIFYING:
FAIL if the answer endorses uint32 % 37 has severe bias, every uint32 modulo reduction has negligible bias including the three-billion range, or wrapping/clamping rejected samples makes the reducer unbiased.
