---
name: math-paytable-config
description: Use when agents define or audit slot paytables, symbol weights, reel strips, payout scalers, count offsets, stake normalization, or public/private RTP variant configuration.
metadata:
  constraints: C1, C14
---

# math-paytable-config

> **Core insight:** The resolved outcome generator defines the probability model; a paytable defines money only after its scaler, count indexing, stake basis, rounding and caps are explicit.

## When to use / When NOT
- Use for config-as-math contracts, payout decoding and variant wiring.
- Not for EV derivation or simulation; use `math-rtp-modeling` and `math-montecarlo-simulation` respectively.

## Process
1. Trace game code, action, variant selector and private config into the outcome generator before interpreting strips or weights. MetaWin's production server (MSS) `games/bloodMoonRising/math/engine/drop-source.ts` `createCellSource` draws weighted cells; its public `wheels` are cosmetic, as documented in `games/bloodMoonRising/README.md`.
2. Derive the payout contract: `basePayout = paytable[id][index(count)] / scaler × stakeBasis`. Record evaluator and multiplier policy separately. MSS `games/sweetyCluster/gameLogic.ts` `detectClusterWin`/`normalizeWins` use scaler 20 and `min(count,15)-5`; MSS `games/fruitNudge/gameLogic.ts` `detectPaylineWins` uses `repeats-1` and normalizes by `totalPaylines`. Never assume scaler 10, direct count indexing or total-bet units.
3. Validate symbol IDs, allowed aliases, paying ranges, modes and weight domains against the actual evaluator. Preserve strip order and repetition. Treat a field such as `dropWeight` according to its consumers. Decode RLE only when that game's format requires it; prove encode/decode agreement, including the highest count range.
4. Represent stakes, caps and payouts as exact integer atoms; use rational paytable factors and an explicit rounding rule. Trace whether rounding occurs per win, per wave or after accumulation, then apply caps and termination in the declared order. Legacy MSS `fixValue` calls are evidence of rounding locations, not an integer-money implementation to copy.
5. Register and test every action/variant route and affected fork; reject unknown routes before play. Derive ordinary public payout fields from behavioral private math, or verify parity. Record explicit exceptions and mismatches: MSS `games/zeusPromo/gamePlay.ts` `playMain`/`playBuyFreegames` always choose `myRtp1075MathConfig`, despite public labels. A documentary target does not prove runtime RTP or certification.

## Correctness constraints
- **C1:** With fixed payoffs, normalized probabilities of independent single draws enter EV multilinearly. RTP is generally rational in raw weights because probabilities require normalization; reused parameters, retries and state need not preserve multilinearity. A weight change does not scale RTP proportionally and can move it oppositely; recompute full EV and contribution shares.
- **C14:** Switch only among pre-certified behavioral variants and display the active economics. Changes to weights, paytables or feature logic change the math model, including Promo changes; RNG-external promotions are a separate case.

## Pitfalls / red flags
- Certifying display strips, trusting RTP labels, changing strip repetitions, or silently falling back from an unknown variant.
- Assuming payout scaling remains linear through rounding, rejection or caps.

## Verification
- Retain source/config provenance and fixtures for every count boundary, scaler, multiplier and action selector; reconcile declared and actual payouts.
- Run actual settlement at minimum and representative stakes, covering rounding, caps and termination. Absolute currency-floor editions need route-specific checks around `K/C` (`K` = currency floor, `C` = cap multiple; see the dedicated payout-floor skill). Verify RTP with `qa-math-validation`.
