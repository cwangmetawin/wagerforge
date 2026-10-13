---
name: econ-bonus-design
description: Use when pricing promotional bonuses or free spins, choosing wagering requirements, or estimating offer cost with bust, forfeiture, sticky balances, and completion. Keywords bonus EV, actual turnover, wagering requirement, bonus cost.
metadata:
  constraints: C3
---

# econ-bonus-design
> **Core insight:** Bonus cost depends on actual stopped turnover and withdrawal rules; nominal wagering requirements cannot turn a no-deposit bonus into direct operator profit.

## When to use / When NOT

- Use for promotional grant cost, completion/bust economics, and offer ROI.
- Not for natural or bought game features already in RTP (`econ-rtp-cost`). MetaWin's production server (MSS) `games/tartarus/gamePlay.ts` `playMain` pays natural free-game value through game-win legs; it is not a separate promotional grant.

## Process

1. **Pin the offer contract.** Define grant B, deposited funds, eligible games, required eligible turnover, weighting, stake/max-bet rules, expiry/abandonment, forfeiture, withdrawal limits, and sticky-versus-cashable treatment. Distinguish a WR multiple from its absolute turnover target. Authoritative grants, debits, progress, and withdrawals use exact integer atoms (`build-wallet-and-money`); the server decides eligibility and completion from durable records.
2. **Use stopped turnover.** With constant conditional house edge h and justified optional-stopping/integrability assumptions, terminal-balance cost is `B - h*E[tau]`, where tau is actual charged turnover until completion, bust, or abandonment. Required turnover `WR*B` is only the no-bust bound: substituting it overstates edge revenue. Withdrawal forfeiture, sticky deductions, and caps require their actual cashflows, not just this balance identity.
3. **Use the current helper.** `scripts/bonus.mjs` exports `bonusExpectedCost({bonus, expectedTurnover, houseEdge})` and `isEvPositiveForOperator` with the same input. They accept finite nonnegative inputs; the old `wageringMultiple` input and `isEvPositive` export are obsolete. `bonusBreakEvenWR(h)=1/h`, for h>0, applies only to guaranteed turnover. A no-deposit bonus/free-spin offer has direct cost >=0 at every WR; its investment rationale is incremental LTV (`econ-ltv-cac`).
4. **Simulate withdrawals.** `simulateBonusCost({bonus, deposit, wageringRequirement, stake, playRound, rng, n, sticky, z})` uses one player per trial, whole fixed stakes, forfeiture of unfinished balances, and deduction of sticky bonus on withdrawal. All money is BigInt atoms: `playRound(rng, stake)` returns that round's gross payout in atoms, rounded by the game's own rule; `wageringRequirement` is absolute turnover. A float running total can misjudge completion (nine 0.1 stakes summing below 0.9). Outputs include `meanCost`, `ciHalfWidth`, `ci`, `completionRate`, and `meanTurnover`. Verify that these semantics match the offer. Variable weighting, voluntary abandonment, or other unsupported rules need a matching cashflow model; do not invent helper parameters. These are analytical estimates; verify production money-grid rounding with an atom-based offer model.
5. **Report unconditional acquisition cost.** In that simulator, cost is withdrawal minus deposited funds. Report its CI and completion/turnover diagnostics. Derive completion-conditioned cost from completed paths separately; never multiply a completion rate by a cost already conditioned on completion or by the no-bust formula.

## Correctness constraints

- **C3:** Edge times actual turnover is operator revenue that offsets the grant, not additive cost. Bankruptcy and withdrawal conditions prevent nominal playthrough from guaranteeing profit. For B=100, two 100-stake rounds returning 200 with probability .48 each, `E[tau]=148` and unconditional balance cost is 94.08, not the fixed-turnover 92.

## Pitfalls / red flags

Negative no-deposit cost; unsupported completion percentages; sticky credit treated as withdrawable cash; client-calculated completion; unverified host GraphQL fields; double-counted promotional spend.

## Verification

Check analytical finite-path examples, zero-WR/bust/sticky cases, actual turnover, withdrawal accounting, and CI precision against the documented offer. Run `scripts/bonus.test.mjs`; local helpers do not prove platform offer enforcement.
