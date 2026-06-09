---
name: econ-progressive-jackpot
description: Use when designing a progressive, network, or mystery jackpot funding model - contribution rate, seed economics, and network viability. Keywords progressive jackpot, network jackpot, mystery, seed, contribution rate.
constraints: C14
---

# econ-progressive-jackpot

## When to use / When NOT
- Use when: sizing a progressive/network/mystery jackpot's per-wager contribution, seed, reset, and player-base viability — a pool ACCUMULATING from bets between hits.
- NOT for: **fixed-tier instant jackpots** (Mini/Minor/Major/Mega/Grand at fixed bet-multiples, e.g. 20×/100×/500×/2000×/20000×, picked by weighted RNG and **summed into the certified RTP** — MetaWin's only real jackpot pattern) → `econ-rtp-cost` / `math-rtp-modeling`; base+bonus accounting → `econ-rtp-cost`; RTP from weights → `math-rtp-modeling`; certification → `comp-rtp-certification`.

## Default stack (+ escape hatch)
`decimal.js` math, server-authoritative pool ledger. Other stacks: same algebra — `advertisedRTP = baseRTP + jackpotContributionRTP`; seed is a separate capital line, never an RTP summand.

## Process
1. **Contribution:** pick per-wager rate `c`, 1–5%. Each bet routes `c·stake` to the pool; base game runs at lower `baseRTP` (that slice leaves it).
2. **Advertised RTP = baseRTP + jackpotContributionRTP.** `c` SPLITS into a *meter* slice (displayed jackpot, paid to players) and an *escrow/reserve* slice (recovers seed). Only the meter slice is player return, so `jackpotContributionRTP ≈ c_meter`, NOT full `c`; certify/publish only that.
3. **Seed (reset value):** operator capital from OUTSIDE the wager stream. Not an advertised-RTP summand; lifts *effective* return above advertised until recovered.
4. **Seed recovery:** the reserve slice repays the seed. Payback depends on reserve size, hit frequency, and seed magnitude — NOT a fixed fraction of turnover. Size reserve so payback completes before the next likely hit.
5. **Network viability:** confirm the player base feeds the pool fast enough to keep grow rate attractive, seed exposure bounded. Thin base → starved jackpot or unrecoverable seed.
6. **Certify/publish the jackpot RTP contribution separately** from base RTP (see C14).

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert (display the active percent). Operator-funded promotions outside the game RNG do NOT change the certified RTP. Re-cert is required only when the math model (weights/paytable/feature logic) changes.

## Pitfalls / red flags
- **Misapplying pool/seed/contribution math to a fixed-tier instant jackpot.** A bet-multiple shown as a certified RTP line (e.g. real cert "Jackpot Total: 1.498%" inside 96.579%) is an in-game payout summand, NOT a contribution-funded pool — no contribution rate, seed, or reset. Route to `econ-rtp-cost`.
- Treating the seed as a third RTP summand — it is outside-stream capital, not bet-stream return (genuine progressives only).
- Forgetting `baseRTP` drops by the contribution slice; double-counting inflates advertised RTP.
- Sizing for too small a player base → pool grows too slowly, seed never recovers.
- Switching active certified variant without displaying its new percent (C14).
- Re-certifying an operator-funded promo that never touches the RNG (C14).

## Verification
- `advertisedRTP − baseRTP == jackpotContributionRTP` (meter slice), ≤ full `c` (remainder funds recovery); seed on no RTP line.
- Simulated seed payback completes within the modeled horizon for the reserve slice; pool grow rate and hit cadence viable at target player base; published contribution matches the certified variant's active percent.
