---
name: build-prediction-market-games
description: Use when building the server engine for a live multi-player pooled prediction market — horse/sports/event books where players buy, sell, and cash out shares of outcomes at pool-derived prices before a parimutuel settlement. Keywords prediction market, parimutuel, pool, order book, shares, cash out, multiplayer market, AMM odds, horse-pro.
constraints: C2, C14
---

# build-prediction-market-games

> **Core insight:** Price is emergent from the pool, never fixed odds — every stake moves everyone's price. The order book lets players exit early, so value open shares at the LIVE pool yet settle survivors against the FINAL locked composition, conserving payouts to the pot exactly (last-winner dust).

## When to use / When NOT
- Use when: writing the server `IMultiplayerGame` engine for a LIVE pooled market — N per-outcome pools + N order books, buy/sell/cash_out of shares at pool-derived prices, parimutuel settlement (horse-pro, football-pro, snakes-pro).
- NOT for: the generic RGS contract (→ `build-game-server-rgs`); parimutuel rake/EV/pricing economics (→ `econ-tournament`); crash/target math (→ `math-crash-family`); wallet legs (→ `build-wallet-and-money`); durable-settlement primitives (→ `build-durable-settlement`).

## Default stack (+ escape hatch)
Default: TS `IMultiplayerGame` (`init`/`join`/`command`/`tick`/`replay`); `state = { pools, orderBook[], bets[] }`; `fixValue` money. Other stacks: map `command`/`tick` to your handler/clock; keep pool/share/price math identical. Real status names: `waiting→playing→ended→settled`.

## Process
1. **One pool + one order book per outcome.** `pools[o]` accumulates net stake on outcome `o`; `orderBook[o]` holds resale `SellOrder`s sorted ascending by `askPrice`.
2. **Shares, not fixed odds.** A buy mints `shares`. **Market price** of `o` `= clamp(pool[o]/totalPool, 0.02, 0.90)` renormalized so prices sum to 1 (empty → uniform `1/N`); it moves on EVERY stake — recompute per command, never cache a quote. A holding's **value** is the parimutuel share `= shares/totalOutcomeShares × pool` — distinct from the price.
3. **Secondary market.** `buy_<o>` mints from the pool; `sell_<o>` lists shares at an ask; `cash_out` realizes current proportional value; match/fill against the sorted book.
4. **Phase machine on `tick`.** Strip outcome-revealing fields (winner/finishOrder/finishTime) from live responses; once the result is known, REJECT `sell`/`cash_out`.
5. **Parimutuel settlement against the FINAL composition.** `valuePerShare = floor(payablePot / winningTotalShares)` (floored ≤ pot); `payout = shares × valuePerShare`; the **last winner absorbs the dust** (`payablePot − Σpaid`) so payouts sum to the pot exactly.
6. **Idempotent commands.** Each buy/sell/cash_out is an atomic accept-OR-cancel guarded write keyed by command id; query shares O(1) via a per-tick cache.

## Correctness constraints
- **C2:** Every money leg (buy debit, cash-out/settlement credit) is an atomic, overdraft-safe, idempotent guarded write co-committed with the append-only ledger; never authorize a payout from a cache or replica.
- **C14:** The gross-vs-net pool spread (rake) sets the certified RTP; switch among pre-certified rake/RTP variants at deploy without re-cert — re-cert only if the share/settlement math model changes.

## Pitfalls / red flags
- Quoting a price once instead of re-pricing as the pool moves.
- Settling against the LIVE composition, not the FINAL locked one.
- Payouts not conserving to the pot (rounding drift, no last-winner dust) → money created/destroyed.
- Cash-out paid from a cache/replica, or non-idempotent buy/sell → double-spend/replay (C2).
- Leaking the result: unstripped winner/finish state, or sell/cash_out accepted post-result.
- O(n) share queries in the hot tick instead of an O(1) cache.

## Verification
- `Σ payouts == payablePot` exactly (dust to last winner); `valuePerShare · winningShares ≤ payablePot`.
- Market price `== clamp(pool/totalPool,0.02,0.90)` (renormalized) and shifts after each stake; cash-out pays value `shares/totalOutcomeShares × pool` at command time.
- Settlement uses the locked final composition; `sell`/`cash_out` rejected post-result; no outcome field in any live response.
- Replaying a command id debits/credits exactly once.
