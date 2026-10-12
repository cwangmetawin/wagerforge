---
name: econ-tournament
description: Use when pricing tournament or leaderboard prizes, calculating parimutuel/share-market EV, or reviewing rake, cash-out, empty-market prices, and unbacked winners. Keywords tournament, prize pool, rake, shares, parimutuel EV.
---

# econ-tournament
> **Core insight:** Positive EV must clear the fee-adjusted price, and advertised rake predicts total return only if the actual settlement rules distribute every net fund.

## When to use / When NOT

- Use for funded rank prizes or pooled/share-market fees, participant EV, and liability accounting.
- Not for fixed-odds event quotes (`math-fixed-odds-event-markets`), individual bonuses (`econ-bonus-design`), or game implementation (`build-prediction-market-games`).

## Process

1. **Specify funding/execution.** Define paid entries, subsidies, trade fees, gross/display versus net/settlement pools, share issuance and withdrawal/void policies. Closed entry-only books use `net = gross*(1-rake)`; secondary trades need actual fee/debit/proceeds ledgers. Fill eligible resales before minting remaining-budget shares. MetaWin's production server (MSS) `games/football-pro/index.ts` `server.tick` follows this order, deducting matched-trade fees from seller proceeds; entry-fee conventions do not generalize to every trade.
2. **Allocate fairly in atoms.** Rank prizes require funding, weights, paid places, ties and deterministic remainders; `rankEV=sum(P(rank)*prize(rank))-entryCost`. Share winners receive fraction alpha of the payable pot: exact integer shares/rational proportions, `potAtoms*shares_i/totalWinningShares`, declared atom rounding/remainders; never whole-currency value-per-share flooring. MSS `games/snakes-pro/index.ts` `computePayouts` uses 12-decimal scaling/tolerance dust correction, not exact-conservation proof. Exit bonuses rank unrounded authoritative relative exit times, never arrival order, with deterministic ties; declare bots, no-winner and caps. MSS `games/hitCrashers/settle.ts` `laterThan` breaks ties by higher seat; `settlementTick` includes bots, awards no bonus with riders remaining, and caps only bonus. For one-credit wallet rounds, `settleExit` defers the current candidate's base return until bonus resolution, releasing displaced candidates. Verify delivery permutations, remaining riders and cap boundaries.
3. **Derive fee-adjusted EV.** Fixed holdings/pot: `EV = p*alpha*net - stake`; varying holdings/pot require conditional expectation on winning paths. Closed stake-proportional books: `q=outcomeStake/gross`, `EV=stake*(p*(1-rake)/q-1)`; positive EV requires `p>q/(1-rake)` for rake<1. At p=.505, q=.5, rake=.02, EV is negative. Neither q nor this threshold directly applies to AMM-issued shares/rank prizes.
4. **Verify market exceptions.** Declare empty-quote priors: MSS `games/football-pro/types/game.types.ts` `calculatePrices` defaults .40/.25/.35. Clamp/renormalize can violate bounds: MSS `games/horse-pro/types/game.types.ts` `calculatePrices`; mandatory final bounds need bounded-simplex methods. MSS `games/snakes-pro/index.ts` `server.tick` caps cash-out at original net investment remaining after realized receipts. Unbacked winners: MSS `games/horse-pro/index.ts` `settleMarket` can pay zero; MSS `games/football-pro/index.ts` `server.tick` refunds residual net pools. Encode/test the chosen policy. `RTP=1-rake` requires returning all net funds under modeled outcomes.
5. **Close liabilities durably.** Use exact atoms; debit before outcome; persist terminal decisions before credit; bind retries to content, rejecting conflicts. Every bet has one immutable terminal fate: rejected, settled or refunded. Record partial exits/remaining liabilities (`qa-settlement-integrity`).

## Pitfalls / red flags

Ignoring rake in EV; applying stake odds to shares; whole-unit share-value flooring; duplicate fees; unbacked winners excluded from tests; pool conservation mistaken for outcome fairness (`fair-verify`).

## Verification

Across buys, resales, partial exits, unbacked winners, and voids, reconcile opening liabilities plus funded inflows to credited returns, fees, declared retained funds, and closing liabilities. Test allocation fairness, zero-share policies, final quote bounds, and rank/tie remainders; production float tolerances are insufficient.
