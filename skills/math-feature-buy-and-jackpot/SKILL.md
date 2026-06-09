---
name: math-feature-buy-and-jackpot
description: Use when pricing a bonus-buy / feature-buy or modeling a progressive jackpot RTP contribution. Keywords bonus buy, feature buy, RTP parity, progressive jackpot, contribution.
constraints: C14
---

# math-feature-buy-and-jackpot

## When to use / When NOT
- Use when: pricing a bonus-buy/feature-buy entry, or reporting a jackpot's RTP contribution — fixed-multiplier tiers (MetaWin's real pattern) or a pooled/networked progressive.
- NOT for: base RTP/house-edge/weight derivation (→ `math-rtp-modeling`); empirical convergence (→ `math-montecarlo-simulation`).

## Default stack (+ escape hatch)
`scripts/bonus-buy.mjs` — `bonusBuyCost` (buy cost at RTP parity), `rtpParity` (variant-RTP gap), `decomposeJackpotRtp` (advertised = base + pooled-jackpot slice). Fixed-tier example: a `jackpotWeights: [regular, mini, minor, major, mega]` array annotated with each tier's target RTP contribution, baked into the certified math config. Other stacks: same identities below; price = expected feature value at the disclosed buy-variant RTP, never a markup.

## Process
1. **Bonus-buy price.** `buyCost = E[feature payout] / buyVariantRTP`. The buy variant MAINTAINS RTP PARITY — buyVariantRTP ≈ base RTP (equal or slightly above), never below. The buy compresses variance in TIME; it does NOT raise EV.
2. Compute and DISCLOSE buy-variant RTP separately from base; assert `buyVariantRTP ≥ baseRTP` within tolerance, report the gap.
3. **Jackpot — two shapes.** (a) FIXED-MULTIPLIER TIERS (MetaWin's real pattern): tiers (mini/minor/major/mega) won in-game, paid as `multiplier·bet`; their RTP contribution is baked INTO the certified base math via tier WEIGHTS — no external pool or seed, just a documented slice of the one certified RTP. (b) POOLED/NETWORKED PROGRESSIVE: `c` = 1–5% per-wager contribution into a pool; `advertisedRTP = baseRTP + jackpotContributionRTP` (base runs lower because skim `c` feeds the pool). The reset SEED is operator capital from OUTSIDE the wager stream — a top-up lifting EFFECTIVE return ABOVE advertised, NOT a third summand.
4. Publish jackpot RTP contribution alongside base: fixed tiers, a documented slice of certified weights; pooled progressive, a separately-certified summand — never fold either silently into the headline number.

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-certification (display the active percent). Operator-funded promotions OUTSIDE the game RNG do NOT change the certified RTP. Re-cert is required ONLY when the math model (weights/paytable/feature logic) changes.

## Pitfalls / red flags
- Pricing a buy above parity ("house take on the buy") — wrong; parity is the rule, gap must be ≥0 and small.
- Claiming the buy raises expected value — it only reshapes variance over time.
- Modeling a pooled progressive (skim + seed) when the game has fixed-multiplier tiers — those pay in-game as `multiplier·bet`, contribution already in the certified tier weights, no pool/seed.
- For a pooled progressive, forgetting base runs below advertised RTP once the skim is removed.
- Treating a pre-certified variant switch, or an operator promo outside the RNG, as needing re-cert (C14).

## Verification
- `scripts/bonus-buy.mjs` `rtpParity` / `bonusBuyCost`: assert `buyVariantRTP ≥ baseRTP` and price = E[feature]/buyVariantRTP within tolerance.
- `scripts/bonus-buy.mjs` `decomposeJackpotRtp`: assert `advertisedRTP = baseRTP + jackpotContributionRTP` (operator-funded seed is a separate top-up, not a summand); cross-check `math-montecarlo-simulation`.
