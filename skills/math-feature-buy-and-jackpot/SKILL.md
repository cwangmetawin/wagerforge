---
name: math-feature-buy-and-jackpot
description: Use when pricing a bonus-buy / feature-buy or modeling a progressive jackpot RTP contribution. Keywords bonus buy, feature buy, RTP parity, progressive jackpot, contribution.
constraints: C14
---

# math-feature-buy-and-jackpot

## When to use / When NOT
- Use when: pricing a bonus-buy/feature-buy entry, or splitting per-wager contribution into a progressive jackpot pool and reporting the jackpot's RTP contribution.
- NOT for: base RTP/house-edge/weight derivation (→ `math-rtp-modeling`); empirical convergence (→ `math-montecarlo-simulation`).

## Default stack (+ escape hatch)
`scripts/bonus-buy.mjs` — `bonusBuyCost` (buy cost at RTP parity), `rtpParity` (variant-RTP gap), and `decomposeJackpotRtp` (advertised = base + jackpot meter slice). Other stacks: same identities below; price = expected feature value at the disclosed buy-variant RTP, never a markup.

## Process
1. **Bonus-buy price.** `buyCost = E[feature payout] / buyVariantRTP`. The buy variant MAINTAINS RTP PARITY — buyVariantRTP ≈ base RTP (equal or slightly above), never below. The buy compresses variance in TIME (you reach the feature now), it does NOT raise EV.
2. Compute and DISCLOSE the buy-variant RTP separately from base; assert `buyVariantRTP ≥ baseRTP` within tolerance, report the gap.
3. **Progressive jackpot.** Take `c` = 1–5% per-wager contribution; route `c·bet` into the pool. The advertised RTP from the bet stream is `advertisedRTP = baseRTP + jackpotContributionRTP` (the base game runs lower because the skim `c` feeds the progressive). The reset SEED is operator capital injected from OUTSIDE the wager stream — a separate top-up that lifts players' EFFECTIVE return ABOVE advertised; it is NOT a third summand that reconciles to the advertised number.
4. Certify and publish the jackpot RTP contribution SEPARATELY from base-game RTP; never fold it silently into the headline number.

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-certification (display the active percent). Operator-funded promotions OUTSIDE the game RNG do NOT change the certified RTP. Re-cert is required ONLY when the math model (weights/paytable/feature logic) changes.

## Pitfalls / red flags
- Pricing a buy above parity ("house take on the buy") — wrong; parity is the rule, gap must be ≥0 and small.
- Claiming the buy raises expected value — it only reshapes variance over time.
- Folding jackpot contribution into base RTP instead of publishing it separately.
- Forgetting the base game runs below advertised RTP once the progressive skim is removed.
- Treating a pre-certified variant switch, or an operator promo outside the RNG, as needing re-cert (C14).

## Verification
- `scripts/bonus-buy.mjs` `rtpParity` / `bonusBuyCost`: assert `buyVariantRTP ≥ baseRTP` and price = E[feature]/buyVariantRTP within tolerance.
- `scripts/bonus-buy.mjs` `decomposeJackpotRtp`: assert `advertisedRTP = baseRTP + jackpotContributionRTP` (the operator-funded seed is a separate top-up, not a summand); cross-check against `math-montecarlo-simulation`.
