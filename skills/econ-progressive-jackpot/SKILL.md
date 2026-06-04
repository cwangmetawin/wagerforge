---
name: econ-progressive-jackpot
description: Use when designing a progressive, network, or mystery jackpot funding model - contribution rate, seed economics, and network viability. Keywords progressive jackpot, network jackpot, mystery, seed, contribution rate.
constraints: C14
---

# econ-progressive-jackpot

## When to use / When NOT
- Use when: sizing a progressive/network/mystery jackpot's per-wager contribution, seed, reset, and player-base viability.
- NOT for: aggregate base+bonus RTP accounting (→ `econ-rtp-cost`); deriving base-game RTP from weights (→ `math-rtp-modeling`); certification mechanics (→ `comp-rtp-certification`).

## Default stack (+ escape hatch)
`decimal.js` money math, server-authoritative pool ledger. Other stacks: same algebra — `advertisedRTP = baseRTP + jackpotContributionRTP`; seed is a separate capital line, never a third RTP summand.

## Process
1. **Contribution:** pick a per-wager rate `c` in 1–5%. Each bet routes `c·stake` to the pool; the base game runs at a lower `baseRTP` because that slice leaves the base.
2. **Advertised RTP = baseRTP + jackpotContributionRTP.** The per-wager contribution `c` SPLITS into a *meter* slice (increments the displayed jackpot, eventually paid to players) and an *escrow/reserve* slice (recovers the operator's seed → returns to the operator). Only the meter slice is player return, so `jackpotContributionRTP ≈ c_meter`, NOT the full `c`. Certify and publish that player-return portion.
3. **Seed (reset value):** funded by operator capital from OUTSIDE the wager stream. It does NOT enter the advertised RTP sum. It lifts *effective* player return above advertised until recovered.
4. **Seed recovery:** the escrow/reserve slice repays the operator's seed over time. The payback horizon is a function of the reserve slice size, hit frequency, and seed magnitude — NOT a fixed fraction of turnover. Size the reserve so expected payback completes before the next hit is statistically likely.
5. **Network viability:** check the player base feeds the pool fast enough that the advertised grow rate is attractive and seed exposure stays bounded. Thin player base → starved jackpot or unrecoverable seed.
6. **Certify and publish the jackpot RTP contribution separately** from base RTP (see C14).

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert (display the active percent). Operator-funded promotions outside the game RNG do NOT change the certified RTP. Re-cert is required only when the math model (weights/paytable/feature logic) changes.

## Pitfalls / red flags
- Treating the seed as a third RTP summand — it is outside-stream capital, not bet-stream return.
- Forgetting `baseRTP` drops by the contribution slice; double-counting inflates advertised RTP.
- Sizing for an insufficient player base → pool grows too slowly or seed never recovers.
- Switching the active certified variant without displaying the new active percent (C14).
- Re-certifying for an operator-funded promo that never touches the RNG (C14).

## Verification
- `advertisedRTP − baseRTP == jackpotContributionRTP` (the meter slice paid to players), which is ≤ the full contribution `c` (the remainder funds seed recovery); the seed appears on no RTP line.
- Simulated seed payback completes within the modeled horizon for the chosen reserve slice (not a fixed % of turnover); pool grow rate and hit cadence are viable at the target player base; published jackpot contribution matches the certified variant's active percent.
