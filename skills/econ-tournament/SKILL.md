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

1. **Specify funding and execution.** Define paid entries, subsidies, every trade fee, gross/display versus net/settlement pools, share issuance, and withdrawal/void policies. For a closed entry-only book, `net = gross*(1-rake)`; secondary trading needs its actual fee/debit/proceeds ledger. Fill eligible resale orders before minting remaining-budget shares. MetaWin's production server (MSS) `games/football-pro/index.ts` `server.tick` implements that ordering and deducts the matched-trade fee from seller proceeds; entry-fee conventions cannot be extended blindly to every trade.
2. **Allocate fairly in atoms.** Rank tournaments need funded prize weights, paid places, ties, and deterministic remainders; rank EV is `sum(P(rank)*prize(rank))-entryCost`. Share winners receive their fraction alpha of the payable pot. Use exact integer share units/rational proportions and allocate `potAtoms*shares_i/totalWinningShares`, with documented atom rounding/remainder allocation. Do not floor value-per-share to whole currency units. MSS `games/snakes-pro/index.ts` `computePayouts` scales to 12 decimals with tolerance-based dust correction; that legacy implementation is not proof of exact currency conservation.
3. **Derive EV with fees.** For fixed final holdings/pot, `EV = p*alpha*net - stake`; if holdings or pot vary, use the conditional expectation on winning paths. In a closed stake-proportional book with `q=outcomeStake/gross`, `EV=stake*(p*(1-rake)/q-1)`, so positive EV requires `p>q/(1-rake)` for rake<1. At p=.505, q=.5, rake=.02, EV is negative. Neither q nor this threshold applies directly to AMM-issued shares or rank prizes.
4. **Verify market-specific exceptions.** Empty quotes need declared priors: MSS `games/football-pro/types/game.types.ts` `calculatePrices` defaults to .40/.25/.35. Clamp then renormalize can violate the original bounds: MSS `games/horse-pro/types/game.types.ts` `calculatePrices`; use a bounded-simplex method if final bounds are mandatory. MSS `games/snakes-pro/index.ts` `server.tick` caps cash-out at remaining original net investment after earlier realized receipts. For an unbacked winner, MSS `games/horse-pro/index.ts` `settleMarket` can pay zero; MSS `games/football-pro/index.ts` `server.tick` refunds residual net pools. Encode and test the chosen policy explicitly. `RTP=1-rake` requires all net funds to be returned under the modeled outcomes.
5. **Close liabilities durably.** Use exact atoms, debit before outcome, persist the terminal decision before credit, and bind retry identity to content; conflicting replay is rejected. Every bet has one terminal fate: rejected, settled, or refunded. Record partial exits and remaining liabilities (`qa-settlement-integrity`).

## Pitfalls / red flags

Ignoring rake in EV; applying stake odds to shares; whole-unit share-value flooring; duplicate fees; unbacked winners excluded from tests; pool conservation mistaken for outcome fairness (`fair-verify`).

## Verification

Across buys, resales, partial exits, unbacked winners, and voids, reconcile opening liabilities plus funded inflows to credited returns, fees, declared retained funds, and closing liabilities. Test allocation fairness, zero-share policies, final quote bounds, and rank/tie remainders; production float tolerances are insufficient.
