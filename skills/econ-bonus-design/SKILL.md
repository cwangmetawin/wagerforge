---
name: econ-bonus-design
description: Use when designing or pricing a bonus, free-spin, or wagering-requirement offer and estimating its true expected cost or break-even. Keywords bonus, free spins, wagering requirement, playthrough, EV, completion rate.
constraints: C3
---

# econ-bonus-design

> **Core insight:** Playthrough is operator revenue that OFFSETS the give-away, not an additive cost — high WR can pencil EV-positive. Real cost hides in completion rate and sticky-vs-cashable, never the arithmetic.

## When to use / When NOT
- Use when: setting a wagering requirement, estimating a bonus's expected cost / break-even.
- NOT for: aggregate game RTP accounting (→ `econ-rtp-cost`) — out of MVP scope.

## Default stack (+ escape hatch)
`scripts/bonus.mjs`. Other stacks: same formula.

## Process
1. Expected cost per completing player = `bonus − houseEdge × (wageringMultiple × bonus)`.
2. Break-even wagering multiple = `1/houseEdge`; STRICTLY above it the offer is EV-positive, AT it it is EV-neutral (cost 0). (`isEvPositive` uses strict `>`.)
3. Adjust the real net cost by completion rate (~10–40% clear WR), sticky-vs-cashable, game-weighting, and abuse rules.
4. Real engine is server-authoritative: the host `bonusing_*` GraphQL contract has the backend track `requirements[].{currentValue,targetValue,remainingValue,progressPercentage,isCompleted,maxBetSize}` plus `minimumBalanceThreshold`/`fundsContext` (sticky vs cashable) over an `AWARDED→ACTIVE→PENDING_COMPLETION/PENDING_CANCELLATION` lifecycle. The client renders this progress; it never computes WR completion or eligibility.

## Correctness constraints
- **C3:** Bonus cost is NOT `bonus + houseEdge×wagering`. The house-edge × wagering term is operator REVENUE (player expected loss) that OFFSETS the give-away. $100 @ 30× @ 96% RTP has expected cost `100 − 0.04×3000 = −$20` (a profit; break-even WR = 25×). Real net cost is dominated by completion rate and sticky-vs-cashable mechanics, not an additive playthrough term.

## Pitfalls / red flags
The additive-playthrough fallacy (C3); ignoring completion rate; modeling sticky bonuses as cashable (real field: `minimumBalanceThreshold`/`fundsContext`); no max-bet/abuse controls (real field: per-requirement `maxBetSize`); treating break-even as already EV-positive (it is EV-neutral); computing WR progress client-side instead of trusting the server's `progressPercentage`.

## Verification
`scripts/econ-comp.test.mjs`: cost = −20 for the canonical case; break-even = 25×.
