---
name: econ-bonus-design
description: Use when designing or pricing a bonus, free-spin, or wagering-requirement offer and estimating its true expected cost or break-even. Keywords bonus, free spins, wagering requirement, playthrough, EV, completion rate.
constraints: C3
---

# econ-bonus-design

## When to use / When NOT
- Use when: setting a wagering requirement, estimating a bonus's expected cost / break-even.
- NOT for: aggregate game RTP accounting (→ `econ-rtp-cost`) — out of MVP scope.

## Default stack (+ escape hatch)
`scripts/bonus.mjs`. Other stacks: same formula.

## Process
1. Expected cost per completing player = `bonus − houseEdge × (wageringMultiple × bonus)`.
2. Break-even wagering multiple = `1/houseEdge`; at or above it the offer is EV-positive.
3. Adjust the real net cost by completion rate (~10–40% clear WR), sticky-vs-cashable, game-weighting, and abuse rules.

## Correctness constraints
- **C3:** Bonus cost is NOT `bonus + houseEdge×wagering`. The house-edge × wagering term is operator REVENUE (player expected loss) that OFFSETS the give-away. $100 @ 30× @ 96% RTP has expected cost `100 − 0.04×3000 = −$20` (a profit; break-even WR = 25×). Real net cost is dominated by completion rate and sticky-vs-cashable mechanics, not an additive playthrough term.

## Pitfalls / red flags
The additive-playthrough fallacy (C3); ignoring completion rate; modeling sticky bonuses as cashable; no max-bet/abuse controls.

## Verification
`scripts/econ-comp.test.mjs`: cost = −20 for the canonical case; break-even = 25×.
