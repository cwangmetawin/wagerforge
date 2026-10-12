---
name: math-ladder-and-progression
description: Use when agents derive conditional survival and payouts for Mines, Towers, Pump, Pepe, or RPS ladders, or model weighted scatter-meter progression and deterministic replay.
---

# math-ladder-and-progression
> **Core insight:** Ladder survival is a product of conditional probabilities; flat EV requires calibrated payouts and explicit rounding/caps. Scatter-meter progression may be stochastic, while RPS ties preserve the prize tier but consume a hand.

## When to use / When NOT

- Use for climb-or-cash-out probabilities, explicit multiplier tables, ties, and weighted progression meters.
- Not for crash distributions (see `math-crash-family`), or Hi-Lo, banker offers, and dig-or-bank state-value games (see `math-conditional-value-games`).

## Process

1. Define the actual success event, conditional state, allowed decisions, stopping horizon, cap, and stake basis. Keep outcomes and payouts server-authoritative; settle money in exact integer atoms. A game label does not establish whether success means avoiding or hitting a marked cell.
2. Derive `S_r=Π p_i`, where `p_i=P(success_i | surviving history)`. The uncapped ideal gross multiplier is `M_r=T/S_r`; only constant conditional survival permits `p^r`. On one fixed N-cell board with K mines and safe picks without replacement, `S_r=C(N−K,r)/C(N,r)`. Include actual RNG boundaries, payout rounding, and caps when calculating realized RTP.
3. Match the specimen's state model. MetaWin's production server (MSS) `games/polarMines/gameLogic.ts` `drawBoard` draws separate row mine sets; `generateLadder` uses `T×Π W/(W−k_i)`, rounded to two decimals. This is not the fixed-board model. Explicit tables also require their actual transition odds: MSS `games/pepe/index.ts` `next` uses first-step `T/M_1`, then `M_previous/M_next`. Difficulty preserves ideal EV only when probabilities and payouts are jointly recalibrated; verify rounded/capped results rather than assuming invariance.
4. Model ties separately. With equal win/tie/loss probabilities, an established uncapped claim V has continuation value `(2V+V+0)/3=V`; a tie is not a paid binary success. MSS `games/rockPaperScissors/index.ts` `next` keeps the payout tier but advances the hand counter. `main` gives a first tie no cashout; `cashout` rejects zero wins. The hand-limit tie branch settles existing winnings, or `T×bet` after all ties. Include these terminal rules, not just win-count doubling.
5. Model a progression meter as a weighted state transition, not fixed increments. MSS `games/sweetyCluster/gameLogic.ts` `processScatterLevelUp` samples by current level and new scatter count; cumulative three-plus scatters force MAX. The meter resets each base spin/free-game round. Deterministic replay needs identical initial state, configuration, triggers, and RNG draws.

## Pitfalls / red flags

- Multiplying unconditional marginal probabilities or assuming constant per-step odds.
- Declaring every cashout depth identical after rounding/caps; treating ties as wins or omitting terminal payouts.
- Calling weighted progression deterministic or replaying triggers without entropy inputs.

## Verification

- Check every depth against conditional survival and actual settled payout; a 25-cell/3-mine fixed board has two-pick survival 0.77, not 0.7744.
- Enumerate short RPS win/tie/loss paths, first-tie cashout rejection, hand-limit all-ties payout, and capped branches.
- Replay weighted meter fixtures with fixed draws; vary draws to prove multiple reachable destinations. Check cumulative three-scatter MAX and per-spin reset.
