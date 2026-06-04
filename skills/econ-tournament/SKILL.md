---
name: econ-tournament
description: Use when designing tournaments, leaderboards, or parimutuel/prediction-market structures - prize-pool distribution, rake, and EV. Keywords tournament, leaderboard, parimutuel, prediction market, prize pool, rake.
---

# econ-tournament

## When to use / When NOT
- Use when: designing a leaderboard/tournament, a parimutuel/prediction-market pool, its prize-pool split, rake, and per-participant EV.
- NOT for: a single game's aggregate RTP/house edge (→ `math-rtp-modeling`) or bonus pricing (→ `econ-bonus-design`).

## Default stack (+ escape hatch)
Server-authoritative settlement; money via decimal.js / integer minor units. Other stacks: same formulas, never float math.

## Process
1. **Pool the stakes.** `gross = Σ stakeᵢ`. Take rake off the top: `net = gross × (1 − rake)`. Rake is the operator's only margin here — the pool is otherwise zero-sum among players.
2. **Distribute the net pool.** Choose a split and make it sum to `net` exactly:
   - *Parimutuel/prediction market:* winners on the resolved outcome share `net` in proportion to their winning stake. Payoutᵢ = `stakeᵢ × net / Σ(winning stakes)`. Decimal odds for a side = `net / stakeₒₙ_ₜₕₐₜ_ₛᵢdₑ`; shorter as more money piles on a side.
   - *Leaderboard/tournament:* a fixed rank-weight vector `w` (Σw = 1) over paid places; prizeᵣ = `net × wᵣ`. Top-heavy w raises variance/excitement; flatter w pays more places.
3. **Compute participant EV.** EV = `P(win) × payout_if_win − stake`. Parimutuel payout depends on the final pool, so EV is only known at settlement; pre-resolution, model it from expected pool composition. Edge exists only when your `P(win)` beats the pool-implied probability `stakeₒₙ_ₛᵢdₑ / net`.
4. **Conserve money.** Sum all distributed prizes; assign any rounding remainder deterministically (e.g. to the top rank). `Σ prizes + rake = gross` must hold to the minor unit.

## Pitfalls / red flags
- Rake taken AFTER computing odds, or charged twice — take it once, off the top, before distribution.
- Split weights that don't sum to `net` (over/under-paying the pool); float rounding that leaks or mints money.
- Quoting fixed-odds payouts for a parimutuel pool — odds move with the pool and are final only at close.
- Treating EV as positive because the prize is large; without an edge over pool-implied probability, EV = `−rake × stake` on average.
- Thin pools: one large late stake collapses everyone's odds; cap or disclose.

## Verification
- Reconciliation test: `Σ prizes + rake == gross` exactly, in minor units, across random pools.
- Zero-rake parimutuel is a fair game: average participant EV = 0; with rake, mean EV = `−rake × stake`.
- Leaderboard weights sum to 1 and paid places ≤ entrants; remainder lands deterministically.
