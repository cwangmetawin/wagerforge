---
name: math-conditional-value-games
description: Use when engineers price Hi-Lo decisions, deal/no-deal offers, dig-or-bank boards, or fair continuations after an opening edge, and distinguish flat RTP from ceilings and strategy-dependent returns.
metadata:
  constraints: C4
---

# math-conditional-value-games

> **Core insight:** Conditional continuation preserves a state value only after probabilities, legal actions, caps and currency rounding are included; equal-looking payouts do not establish strategy-neutral RTP.

## When to use / When NOT

- Use for decisions priced from the current rank, covered set, board or accumulated pot.
- Use `math-ladder-and-progression` for survival ladders; bankroll-run games: `build-bankroll-run-games`.

## Process

1. Define V(s), legal actions and the player's available information. Pin opening debit, free/paid continuations, config, currency grid and horizon. Compute each action's conditional expected continuation value, including immediate rewards and terminal settlement. Optimize over legal actions to detect profitable strategies, rather than testing only fixed stopping depths.
2. Derive probabilities from the actual conditional draw space. Uniform rank-excluding Hi-Lo has N other ranks and k winners: p=k/N. Apply RTP/p only on the first risk-bearing win, then 1/p; guaranteed transitions use factor 1 and preserve the pending edge. Cashout before risk returns stake. MetaWin's production server (MSS) `games/highLowHit/gameLogic.ts` `drawNextCard` and `decisionRatio` implement this distinction.
3. Price offers against all covered values, including the kept item. Sub-fair offers reduce expected return; a fair final offer can equal continuation value. Always-no-deal gives the unrounded, uncapped RTP ceiling, not every strategy's RTP. MSS `games/mealOrNoMeal/gameLogic.ts` `computeOffer` and `offerFactor` reach factor 1 on the final offer. Recheck the ceiling after settlement transforms.
4. For dig/bank, derive expected value growth D(s) and price survival as `p=V/(V+D)`, only where its assumptions hold. MSS `games/deepDelve/gameLogic.ts` `expectedDeltaV` requires independent columns, sufficient frontier/durability state and additive chests; `stability` implements the price. MSS `games/cheeseHeist/index.ts` `server` and `games/thinIce/index.ts` `server` reuse that engine, so imported math changes affect both.
5. Prove a martingale for equality or a supermartingale for an upper bound. Optional stopping needs a bounded horizon or justified integrability conditions. Caps, discrete draw grids and rounding can break equality. MSS `games/kiln/gameLogic.ts` `holds`, `games/sniperRange/gameLogic.ts` `stepMultipliers`, and `games/twist/gameLogic.ts` `applyGem` are continuation specimens; evaluate their complete state transitions instead of copying headline neutrality claims.
6. Compute EV on supported wallet units using integer atoms and exact ratios. Deterministic floor/ceil shifts EV. Stochastic rounding selects adjacent units with the fractional remainder probability; include its extra draws and limits in replay. MSS `games/highLowHit/gameLogic.ts` `applyStochasticRatio` supplies that branch. Classify measured economics as flat RTP, an RTP ceiling, or strategy-dependent RTP, with any rounding error bound stated.

## Correctness constraints

- C4: Sample sufficiency requires CI half-width below tolerance at chosen confidence; rare strategies and dependent continuations cannot inherit an arbitrary round count.

## Pitfalls / red flags

- Charging edge on every decision compounds the house advantage.
- Removing equal-rank exclusion or using unconditional probabilities misprices Hi-Lo.
- Applying optional stopping to unbounded play, or ignoring tiny-stake rounding, creates false neutrality claims.

## Verification

- Enumerate ranks/directions, guaranteed moves, fair/sub-fair offers, zero-value boards, cap boundaries and adaptive stopping policies.
- Verify rounding EV at minimum stakes, including missing/extra rounding draws and manual/autobet parity where offered.
- Use `fair-verify` with player-saved pre-bet commitment, player-generated client seed and contiguous nonces; missing player evidence means UNVERIFIABLE.
