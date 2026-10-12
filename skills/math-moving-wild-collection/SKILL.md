---
name: math-moving-wild-collection
description: Moving, sticky, nudging and jumping wilds, tier merging, collectors and feature termination. Use when developers model moving wild, sticky wild, nudge or collector mechanics.
metadata:
  pillar: math
  constraints: C6
---

# math-moving-wild-collection
> **Core insight:** Wild identity, remaining movement and collection scope determine rewards; identical visible boards can have different continuation value.

## When to use / When NOT

- Use for retained wild movement, resets, jumps, collision upgrades and moving collectors.
- Evaluators belong to `math-lines-ways-cluster`; retained coin boards to `math-hold-and-win`; cascade modifiers to `math-cascade-modifiers`.

## Process

1. Model retained coordinates, roles, multipliers, remaining paths, collection balances, phase and horizon separately from displayed symbols. Server transitions resolve rewards; use `math-montecarlo-simulation` for complete-path EV.
2. Stacked respins retain trigger-stack coordinates, shift those stacks, then convert eligible ordinary symbols before evaluation. Converted baby wilds do not become retained stacks. Separate conversion tables by phase; pay trigger and respin awards. MetaWin's production server (MSS) `games/maneater/gameLogic.ts` `loadBaseGame` uses this distinction; `loadFreeGames` converts different symbol classes.
3. Nudge retained wilds toward exit, overlay fresh reels, evaluate, then RESET the next retained board. Carry their multipliers and extend the horizon for arrivals/resets; include the exit-only final respin. MSS `games/fruitNudge/gameLogic.ts` `getGameView` and `loadBaseGame` preserve this ordering.
4. Moving collection shifts retained wilds before refill and excludes covered coins. Specify collectible reels/rows; each eligible wild pays its column pool with its retained multiplier alongside evaluator awards. New-wild tiers need not upgrade survivors; new arrivals extend the horizon. MSS `games/piggyBank/gameLogic.ts` `getGameView` and `loadBaseGame` implement these rules.
5. Jump collisions resolve before collection: retain one occupant, start at the highest incoming tier, upgrade once per extra incoming wild up to the tier cap, and retain the longest remaining path. Model last-step arrivals and final cleanup separately; MSS `games/barValhalla/gameLogic.ts` `getRandomJumpGameView` merges paths, while `loadRandomJumpingGame` rejects new gold wilds on its cleanup board.
6. Sample moving/collecting roles before role-dependent placement. One-shot collectors sweep the eligible pool once, then a round multiplier applies to both ways and coins, not once per collector. Pin mode eligibility: MSS `games/piggyBank/gameLogic.ts` `getInitGameView` and `loadBaseGame` allow collecting only in free-game modes; one collector gives 1×, two-plus sample one round multiplier.
7. Accumulating collectors retain selected reels/wilds while ordinary collection symbols refresh. Pay evaluated wins per respin, accumulate collections, then pay the collector once at exit. Reuse the first feature board rather than redrawing it. MSS `games/allaboutthefish/gameLogic.ts` `analyseElvisView` and `loadBaseGame` follow this contract.

## Correctness constraints

- **C6:** Geometric/retrigger variance is exact only for subcritical (`p·R<1`), iid, non-path-dependent structure; otherwise require validated Monte-Carlo with confidence intervals.

## Pitfalls / red flags

- Retaining converted symbols, applying RESET before payment, upgrading survivors, or collecting covered coins.
- Duplicate collision occupants, per-collector pool sweeps, or paying intermediate accumulated balances.

## Verification

- Force both conversion phases, eligible rows, covered coins, preserved multipliers, consecutive resets and exit-only respins.
- Force collisions at tier caps, unequal remaining paths, last-step arrivals and cleanup rejection.
- Compare single/multiple collectors, empty pools, mode eligibility, first-board reuse and one terminal payment.
