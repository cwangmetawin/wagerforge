---
name: math-hold-and-win
description: Use when engineers model retained-cell bonuses, hold-and-win respins, collectors, per-cell modifiers, full-board jackpots, carried layouts, or bought entry distributions.
metadata:
  constraints: C4, C6
---

# math-hold-and-win

> **Core insight:** Hold-and-win EV belongs to the complete board transition process; retention, collector order, counter resets and carried entry states defeat per-respin and progressive-funding shortcuts.

## When to use / When NOT

- Use for retained-board respins and natural/bought entries.
- Use `econ-progressive-jackpot` for funded pools, `math-moving-wild-collection` for moving wilds, and `math-ladder-and-progression` for coin ladders.

## Process

1. Model occupied cells, retained types/values/multipliers, collector balances, mysteries, counter, tier, carry and terminal flag. Pin weights, cap, wallet grid and charged cost; use integer money atoms and exact scaling ratios. MetaWin's production server (MSS) `games/coinUp/gameLogic.ts` `playBonus` shows these transitions.
2. Declare retention/reset/termination separately: eligible landings reset; otherwise decrement; modifiers never implicitly reset. Exhaustion/full-board states are absorbing. MSS `games/coinUp/gameLogic.ts` `playBonus` retains all landings; `games/coins/gameLogic.ts` `getGameView` retains specials, refreshes normals. Expanding boards need per-reel unlocks and occupancy-dependent odds: locked cells consume no landing draws; unlocks apply after landings, usable next respin; full-reel jackpots award once. MSS `games/goldDiggers/gameLogic.ts` `loadCoinGame` follows this order.
3. Freeze order/summands. MSS `games/coinUp/gameLogic.ts` `playBonus`: landings→collectors→UP; terminal mysteries resolve before payment. `collectInto` excludes other collectors/specified mysteries. Existing cells pay finally; collected copies add contractual rewards; full-board jackpot pays once. Declare mutually exclusive multiplier/board-collector/reel-collector precedence, preserve values when specials become regulars, and sum terminal board values (MSS `games/goldDiggers/gameLogic.ts` `loadCoinGame`). Test absence explicitly: truthy collector rows skip row zero (MSS `games/discodazzle/gameLogic.ts` `loadCoinGame`). Refreshing normal pools instead contribute once per retained/new collector; accumulate increments, never starting balances or cumulative readouts as extra payments (MSS `games/coins/gameLogic.ts` `collectCoinValues`).
4. Evaluate true trigger/start-board distributions per carry; validate positions/values and isolate snapshots. Zero-paying-base conditional RTP is `P(trigger|s)*E[settled bonus|s]/charged cost`, including caps/rounding. Check feasible triggers; regenerate stale expectations. MSS `games/coinUp/gameLogic.ts` `triggerProbability` uses layout expectations; `games/coinUp/gamePlay.ts` `playMain` validates carry. Coinciding base collection precedes bonus entry: carry resulting regular values, exclude specials, preserve original trigger eligibility and separate rewards (MSS `games/goldDiggers/gameLogic.ts` `runNuggetCollect`).
5. Model buys separately: symbols, tiers, guaranteed modifiers and cost normalization can differ. MSS `games/coinUp/gamePlay.ts` `playBuy` selects separate starts/tiers. MSS `games/piggyBank/gameLogic.ts` `loadBaseGame` uses moving/collecting wilds; `games/cowAbduction/gameLogic.ts` `loadCoinCollect` uses coin lifts, not hold-all retention.
6. Derive EV by engine simulation or verified absorbing states, `V(s)=reward(s)+sum(P(s,t)*V(t))`; count terminal rewards once. Prove termination/model bounds; preserve behavioral dependencies in state reductions. Measure natural/bought and carry-conditioned sessions with `qa-game-fingerprints`; successive carried rounds need not be iid.

## Correctness constraints

- C4: Sufficiency is CI half-width below tolerance at chosen confidence; rare full-board payouts need frequency evidence.
- C6: Closed-form retrigger variance is exact only for subcritical, iid, non-path-dependent models; otherwise validated simulation with CIs or verified states.

## Pitfalls / red flags

- Modifier resets prolong bonuses and raise EV.
- Collecting after UP, refreshing retained cells or duplicating credits changes money.
- Progressive funding cannot price fixed board jackpots.

## Verification

- Test retention/refresh, modifier-only/last-respin landings, exhaustion/full-board replay, locked/newly unlocked cells.
- Force collector/UP, special precedence, row-zero collectors, mystery exclusions, multiple/fresh collectors and zero pools; check capped settlement, immutable snapshots and final payment versus display sums.
- Reject invalid carry/stale expectations; compare natural/bought EV independently; force simultaneous base/bonus triggers.
