---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. The production rule this case encodes: sum only the CURRENT values of cells at x2 or more, pay base times that sum (or base times 1 when the sum is zero), and only THEN activate or double the cells for later waves. An answer may note that the multiplier policy is game-specific, but it must apply this rule to this game.

MUST-HAVE:
- This wave pays 0.5 x (2 + 4) = 3. Inactive and x1 cells add nothing to the current sum.
- After paying, the cells become x1, x2, x4, x8, x1 (inactive cells activate at x1; active cells double, capped at 1024). The upgrades apply only to later waves.
- A cluster with no cell at x2 or more pays its base pay (multiplier 1), never zero.

DISQUALIFYING:
FAIL if the answer endorses doubling before paying, adds x1 cells to the current sum (paying 3.5), pays 8 or another value from upgraded cells, or pays zero when the sum is zero.
