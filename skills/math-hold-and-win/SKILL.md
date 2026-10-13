---
name: math-hold-and-win
description: Use when engineers model retained-cell bonuses, hold-and-win respins, collectors, per-cell modifiers, full-board jackpots, carried layouts, or bought entry distributions.
metadata:
  constraints: C4, C6
---

# math-hold-and-win

> **Core insight:** Hold-and-win EV belongs to the complete board transition process; retention, collector order, counter resets and carried entry states defeat per-respin and progressive-funding shortcuts.

## When to use / When NOT

- Use for retained-board respin features and their natural/bought entries.
- Use `econ-progressive-jackpot` for funded progressive pools. Moving-wild collection and coin ladders need their own transition model.

## Process

1. Specify state: occupied cells, retained types, values, multipliers, collector balances, unresolved mysteries, counter, tier, carried layout and terminal flag. Pin weights, cap, wallet grid and charged cost. Use integer atoms for money and exact ratios for scaling. MetaWin's production server (MSS) `games/coinUp/gameLogic.ts` `playBonus` exposes the board transitions.
2. Declare which cells persist and what resets the counter. New eligible landings reset it; otherwise it decrements. Modifier-only events do not implicitly reset it. Exhaustion/full-board states must be absorbing. MSS `games/coinUp/gameLogic.ts` `playBonus` retains all landed cells; `games/coins/gameLogic.ts` `getGameView` retains only special coins, while normal coins refresh. Their reset and termination policies are separate.
3. Freeze operation order and payout summands. In MSS `games/coinUp/gameLogic.ts` `playBonus`, landings precede collectors, then UP effects; terminal mysteries resolve before final payment. `collectInto` excludes other collectors and specified mystery cells. Existing cells still pay at the end; a collected copy is an additional contractual reward. Full-board jackpot payment occurs once.
4. Evaluate each carried configuration and its true trigger/start-board distribution. Validate allowable positions and values; isolate snapshots from mutable boards. If the base otherwise pays zero, conditional RTP is `P(trigger|s)*E[settled bonus|s]/charged cost`; include caps and rounding in that expectation. Check trigger probabilities are feasible and regenerate stale expectation tables. MSS `games/coinUp/gameLogic.ts` `triggerProbability` uses layout expectations; `games/coinUp/gamePlay.ts` `playMain` consumes validated carried positions.
5. Model buys separately: entry symbols, tier mixture, guaranteed modifiers and cost normalization may differ from natural entry. MSS `games/coinUp/gamePlay.ts` `playBuy` selects separate start/tier distributions. For contrasts, MSS `games/piggyBank/gameLogic.ts` `loadBaseGame` uses moving/collecting wilds; `games/cowAbduction/gameLogic.ts` `loadCoinCollect` uses coin lifts, not a hold-all-cells board.
6. Derive EV from real engine simulation or a verified absorbing-state model, `V(s)=reward(s)+sum(P(s,t)*V(t))`, with terminal rewards counted once. Prove termination or model the explicit bound. Validate state reductions preserve all behavioral dependencies. Measure natural/bought modes and carry-conditioned sessions with `qa-game-fingerprints`; do not assume successive carried rounds are iid.

## Correctness constraints

- C4: Sufficiency is CI half-width below tolerance at chosen confidence; rare full-board payouts need their own frequency evidence.
- C6: Closed-form retrigger variance is exact only for subcritical, iid, non-path-dependent models; otherwise use validated simulation with CIs or a verified state model.

## Pitfalls / red flags

- Resetting on modifiers prolongs the bonus and raises EV.
- Collecting after UP, refreshing retained cells, or duplicating collector credits changes contractual money.
- Progressive funding formulas cannot price a fixed board jackpot.

## Verification

- Test retained/refreshing cells, modifier-only respins, last-respin landings, exhaustion and full-board terminal replay.
- Force simultaneous collector/UP and mystery-collector exclusions; check exact capped settlement and immutable snapshots.
- Reject invalid carry layouts and stale expectation tables; compare natural/bought engine EV against an independent model.
