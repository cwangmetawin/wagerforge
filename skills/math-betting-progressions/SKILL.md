---
name: math-betting-progressions
description: Use when implementing or auditing automated betting progressions and run stop rules, including take-profit and stop-loss denominators, table-limit stop or reset, Martingale, Paroli, D'Alembert, Fibonacci, 1-3-2-6, Labouchere, Oscar's Grind, fixed-ratio multi-spot spreads such as James Bond, max-step caps, push freeze and next-stake tables.
metadata:
  pillar: math
---

# math-betting-progressions

> **Core insight:** A progression maps settled results to state and stakes; declared stop, cap and reset policies determine when play ends.

## When to use / When NOT

Use for next stakes and run termination; for funding see `build-bankroll-run-games`, payouts `math-table-bet-rules`.

## Process

1. **Stop lines:** compare inclusively at opening and before each hand against a declared denominator: absolute bankroll levels, or bankroll minus committed buy-in (profit≥take-profit; profit≤−stop-loss). An opening line already met allows zero hands. MetaWin's production server (MSS) `games/blackjack-1000/index.ts` `terminalReason` uses absolute levels; MSS `games/baccarat-1000/run.ts` `terminalReason` uses profit and prioritizes completion over thresholds. MSS `games/roulette-1000/index.ts` `postSpinReason` checks after settlement and prioritizes thresholds over completion. Declare reason precedence; the last stake may overshoot a line. Verify both denominators at opening.
2. **Capacity:** when next stake exceeds bankroll or table limit, declare stop or reset-and-retry the opening plan; if still impossible, leave the spin unplayed. MSS `games/baccarat-1000/run.ts` `terminalReason` stops on either. MSS `games/roulette-1000/strategies.ts` `evenMoneyPlan` resets at table limit, emitting zero stake if opening still exceeds it; MSS `games/roulette-1000/index.ts` `preSpinReason` terminates for zero stake or bankroll shortfall. Verify persisted reset fields, no draws and no played-count increments.
3. **Doubling:** stake=base×2^depth: loss depth for Martingale, win depth for Paroli (initially 0). Martingale resets after a win or last-step loss; Paroli after a loss or capped-step win; pushes freeze both. Declare caps: MSS `games/baccarat-1000/strategy.ts` `advanceStrategy` uses maxSteps for Martingale, min(3,maxSteps) for Paroli; MSS `games/roulette-1000/strategies.ts` `settleSystem` keeps loss depth until table-limit reset and fixes Paroli at three steps. Verify caps and next stakes.
4. **Unit sequences:** stake=base×unit(index); pushes freeze. D'Alembert: +1 after loss, −1 after win, minimum 1. Fibonacci (1,1,2,3,5…): +1 place after loss, −2 after win down to the start. 1-3-2-6: wins advance; a loss or last-step win resets. Declare caps/saturation/truncation: MSS `games/baccarat-1000/strategy.ts` `advanceStrategy` caps D'Alembert at maxSteps, resets Fibonacci after capped losses and truncates 1-3-2-6 to min(4,maxSteps); MSS `games/roulette-1000/strategies.ts` `settleSystem` leaves D'Alembert to table-limit reset and saturates Fibonacci. Verify first/last/past-end indices.
5. **Labouchère (1:1 bets):** stake base×(first+last), or base×sole item; win deletes both ends, loss appends staked units. Empty-line/table-limit reset restores the initial line: MSS `games/roulette-1000/strategies.ts` `wantStake`, `settleSystem`. Verify one-item and reset cases.
6. **Oscar's Grind (1:1 bets):** track cycle profit; stake min(units×base,base−cycleProfit), at least one wallet chip. Only an incomplete-cycle win raises units; losses keep them; reaching one base-unit profit resets the cycle. MSS `games/roulette-1000/strategies.ts` `wantStake`, `settleSystem`. Verify partial goals and losses.
7. **Fixed-ratio spreads:** choose the largest affordable whole-chip common unit bounded by requested unit, bankroll and table limit. Never enlarge a legal plan or cap spots separately; reject if the minimum spread cannot fit. MSS `games/roulette-1000/strategies.ts` `jamesBondPlan` scales down only for table limits; bankroll shortage stops via the cited `preSpinReason`, without rescaling. Verify ratios for legal, over-limit, short-bankroll and minimum-spread cases.

## Pitfalls / red flags

Push advancement; stake-only reset; independent spot caps.

## Verification

Drive win/loss/push sequences against independent stake tables. Check inclusive stop lines, opening zero-hand termination, one-chip shortfalls, reason precedence and returned bankroll.
