---
name: econ-tournament
description: Use when designing tournaments, leaderboards, or parimutuel/prediction-market structures - prize-pool distribution, rake, and EV. Keywords tournament, leaderboard, parimutuel, prediction market, prize pool, rake.
---

# econ-tournament

## When to use / When NOT
- Use when: a leaderboard/tournament or parimutuel/prediction-market pool's split, rake, per-participant EV.
- NOT for: one game's aggregate RTP/house edge (→ `math-rtp-modeling`) or bonus pricing (→ `econ-bonus-design`).

## Default stack (+ escape hatch)
Server-authoritative settlement; decimal.js / integer minor units. Other stacks: same formulas, never float math.

## Process
1. **Pool stakes.** `gross = Σ stakeᵢ`; rake off the top: `net = gross × (1 − rake)`. Rake is the operator's only margin; pool otherwise zero-sum. Continuous markets: rake **per-buy** (`netᵢ = stakeᵢ × (1 − rake)`), tracking per-outcome **gross pool** (pre-fee, player-facing) vs **net pool** (post-fee, settlement).
2. **Distribute net pool**, split summing to `net` exactly:
   - *Parimutuel/prediction market:* winners share `net` by winning **shares**: `valuePerShare = net / Σ(winning shares)`, `payoutᵢ = sharesᵢ × valuePerShare`. Rake taken at buy → **no further fee**. Round `valuePerShare` *down*; dust → last winner.
   - *Continuous AMM pricing:* `price = outcomePool / totalPool`, clamped to `[floor, ceiling]` (e.g. 0.02–0.90), renormalized to sum 1.0; empty pool → uniform `1/N`. Optional **order book**: post asks (sorted ascending; buyers fill book *before* minting); `cash_out` sells back proportionally. Phase: buy while *waiting*/*playing*; sell/cash_out only while *playing*.
   - *Leaderboard/tournament:* fixed rank-weight `w` (Σw = 1) over paid places; `prizeᵣ = net × wᵣ`. Top-heavy `w` raises variance; flatter `w` pays more places.
3. **Participant EV** = `P(win) × payout_if_win − stake`. Parimutuel payout depends on the final pool → exact only at settlement; pre-resolution, model expected composition. Edge needs `P(win)` > pool-implied `outcomePool / totalPool`.
4. **Conserve money.** Sum prizes; assign remainder deterministically; `Σ prizes + rake = gross` to minor unit.

## Pitfalls / red flags
- Rake taken AFTER odds, or twice — take once off the top; never re-apply at settlement.
- Split weights not summing to `net`; float rounding that leaks/mints money — round `valuePerShare` down, route dust to one deterministic winner.
- Net (post-fee) pool shown to players, or settling off gross — keep gross (display) and net (settlement) separate.
- Fixed-odds quoted for a parimutuel pool — odds move with the pool, final at close; continuous prices are clamped+renormalized estimates, not guarantees.
- EV called positive for a large prize; without an edge, mean EV = `−rake × stake`.
- Thin pools: one large late stake collapses everyone's odds — cap or disclose. Order-book buys must fill the book before minting, else price discovery breaks.

## Verification
- Reconciliation: `Σ payouts + Σ rake == gross` exactly in minor units, across random pools incl. buy/sell/cash_out churn.
- Zero-rake parimutuel is fair: avg EV = 0; with rake, mean EV = `−rake × stake` (Monte-Carlo RTP → `1 − rake`, e.g. 98% at 2% — matches reusable N-outcome port: snakes-pro 2-way / football-pro 3-way / horse-pro 10-way).
- Prices sum to 1.0 after clamp+renormalize, within band; empty pool → uniform `1/N`.
- Leaderboard weights sum to 1, paid places ≤ entrants; remainder deterministic.
