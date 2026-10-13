---
name: build-pooled-market-operations
description: Use when building pooled (parimutuel) market operations, including selling shares through resale orders and an order book, cancelling an invalid pool, computing winner allocation and rake, largest-remainder atom allocation, or capping pool payouts. Keywords sell order, ask price, order book, price-time priority, wash trade, pool cancel, parimutuel, tote, rake, largest remainder, win cap.
metadata:
  pillar: build
---

# build-pooled-market-operations

> **Core insight:** Preserve money under declared fee, refund and cap policies.

## When to use / When NOT

- Use for resale, refunds, rake and caps; NOT quotes, redemption or fixed odds (`build-prediction-market-games`, `math-fixed-odds-event-markets`).

## Default stack (+ escape hatch)

TypeScript + PixiJS/Phaser + Node; exact integer/decimal money. Other stacks preserve source holdings, fee bases, atom allocation and authoritative settlement; clients render server decisions.

## Process

1. **Resale:** sell only the caller's named source round and outcome, subtracting that source's already-listed shares; missing or nonpositive size means the remainder. Fill asks ascending, equal asks by age, min(budget / ask, listed, source holdings); debit source, skip own asks, preserve unfilled listings. Declare markup, quote-relative minimum, default-ask ceiling, quote clamps and tolerance; gates use real or configured phantom-inclusive pretrade pools. MetaWin's production server (MSS) `games/horse-pro/index.ts` `server.tick` defaults min(.99, quote×1.02); explicit legal asks reach 1; its 0.5×quote floor/self-fills are unsafe precedents. MSS `games/football-pro/index.ts` `server.tick` gates net+phantom pools. MSS `games/snakes-pro/index.ts` `server.tick` uses max(.01,(1−fee)×quote) floor; books net resale proceeds to seller's source round; mints residual-budget shares net of pool fee at ordinary post-trade prices. Verify ownership, overselling, partial fills and priority.
2. **Share cancellation:** if rules require two positively held outcomes and fewer remain, refund remaining net pools by shares plus ALL earned pending proceeds, including cashouts; preserve pending credits on zero-share source tickets; never reverse fees. Per-outcome refunds give outcome remainder to its last ticket; whole-pool refunds give remainder to last overall ticket. MSS `games/horse-pro/index.ts` `server.tick`; MSS `games/snakes-pro/index.ts` `server.tick`. Declare no-winning-stake policy; exclude zero-share winning/dust recipients. MSS `games/horse-pro/index.ts` `settleMarket` leaves pools unpaid when winner-tagged rows are absent. Verify pending plus residual conservation.
3. **Binary cancellation:** declare one ticket per player, accepting only time < drawEndTime; restart empty pools; cancel one-sided pools' original accepted roundIds for gross refunds without fees or winner allocation. MSS `games/hit/index.ts` `server.command`, `server.tick`. Verify cutoff and identity.
4. **Tote cancellation:** declare original-stake refunds before rake for void, below-minimum or no-winning-stake pools, without allocation; settle held tickets, never display odds. MSS `games/hit-ai-wars/pool.ts` `settlePool`; MSS `games/hit-ai-wars/tote.ts` `settleToteContext`. An otherwise valid one-sided winning pool can pay after rake. Verify every branch.
5. **Loser-funds fee policy:** pay round8(stake + losingPool×round8(stake / winningPool)×(1−fee)), rounding to eight decimals; fee touches allocated loser funds only, never principal. MSS `games/hit/index.ts` `server.tick`. Ratio rounding can underpay OR overpay; declare signed residual ownership/correction. Atoms must preserve this fee base before allocation. Verify principal, rounding and signed residuals.
6. **Atoms:** separately declared whole-pool rake gives D=total−floor(total×rake). Allocate floor(D×weight/totalWeight); distribute shortfall one atom each by descending fractional remainder, ties by ascending unique key. Reuse for winnings/excess refunds. MSS `games/hit-ai-wars/pool.ts` `dealProRata`, `settlePool`. Verify sum=D and replay-stable ties.
7. **Caps:** declare over-cap policy and effective whole credit multiple≥1; MSS `games/hit-ai-wars/pool.ts` `payoutLimitOf` rejects negative, nonfinite and (0,1) values, floors configured positive multiples before stake multiplication; 0 disables its cap. Default RETURN_EXCESS: if D>cap×winningStake, pay winners cap×stake; return D−cap×winningStake to other tickets proportionally with exact remainders; house keeps prior rake only. MSS `games/hit-ai-wars/pool.ts` `settleOverLimit` also supports separately declared VOID_POOL/full refunds. Verify excess ownership and refunds≤stake.

## Pitfalls / red flags

Self-fills and ask floors below (1−fee)×quote invite wash trades.

## Verification

Ordered keys A-1/B-1/B-2/B-3; first ticket wins; RETURN_EXCESS; 0.01 atoms; stakes 1/20/20/15.50; rake 3%, cap 50×: credits 50/1.74/1.73/1.34, house 1.69. Verify ties and credits+rake=56.50.
