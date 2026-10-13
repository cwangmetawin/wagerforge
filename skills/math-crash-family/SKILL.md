---
name: math-crash-family
description: Use when deriving crash or limbo target RTP, instabust probability, floored multipliers, payout caps, or correlated cash-out tiers. Keywords crash, limbo, survival, inverse CDF, instabust, Chase.
---

# math-crash-family

> **Core insight:** Crash target RTP is constant only above 1x, before binding payout caps and settlement transforms; shared crash tiers have correlated outcomes.

## When to use / When NOT
- Use for inverse-CDF crash distributions and target/cash-out pricing.
- Not for uniform-interval dice, discrete ladders (`math-ladder-and-progression`), or slot outcomes (`math-rtp-modeling`).

## Process
1. **Define the event.** For ideal raw crash point `C`, `P(C >= x) = (1-h)/x` for `x > 1`, with atom `h` at `C=1`; `P(C >= 1)=1`. Require target `T>1`, aligned to the settlement grid, so instabust loses. MetaWin's production server (MSS) `games/chase/rtp98.ts` `cashOutAtMin` is `1.01`; MSS `games/chase/index.ts` `validateParams` checks the grid.
2. **Sample, floor, settle.** With uniform `u` in `[0,1)`: `u<h` gives `1`; otherwise `(1-h)/(1-u)`. Floor to the display grid and settle against that same value; rounding upward raises survival and RTP. MSS `games/chase/index.ts` `rollCrashPoint` floors to hundredths before applying `maxCrash`; `settle` uses `tier <= crashPoint`. The displayed `1.00` mass includes continuous values floored down, so exceeds the raw atom when `h<1`.
3. **Price caps explicitly.** Ideal uncapped gross RTP is `(1-h)`. For a single target with payout cap `K` expressed as a stake multiple, RTP is `(1-h)*min(T,K)/T`, provided the outcome cap permits `T`. A currency payout cap `A` means `K=A/stake`, making RTP stake-dependent. An outcome cap below `T` instead makes winning impossible. Quantize money in exact integer atoms under the declared payout rule; recompute resulting RTP. MSS `games/chase/index.ts` `settle` caps the aggregate monetary payout at `maxWinCap`.
4. **Model shared tiers jointly.** Expected uncapped tier payouts add by linearity, but their survival events are nested: joint survival is determined by the highest target, never the product of marginal probabilities. Include covariance in variance and apply aggregate caps to the joint payout. MSS `games/chase/index.ts` `settle` splits stake across tiers sharing one crash point.
5. **Use the correct helpers/specimen.** WF `scripts/rtp.mjs` exports `crashSurvival`, `crashEV`, and `crashTargetRTP`; it has no crash sampler. MSS `games/chase/index.ts` `rollCrashPoint` is the specimen. MSS `games/crash/index.ts` `play` is legacy, with commented-out `proveFairness`; do not scaffold from it. MSS `games/primedice/index.ts` `main` uses interval probability, not this crash sampler.

## Pitfalls / red flags
- Claiming target invariance under binding caps, off-grid targets, or rounded payouts.
- Treating parallel tiers as independent, or copying legacy monetary floats.

## Verification
- Check atom boundaries, minimum target, floor transitions, finite RNG mapping, outcome caps, and aggregate payout caps with deterministic fixtures.
- Compare actual settled returns per target, stake, variant, and tier count against analytic/joint predictions; report simulation confidence intervals using `math-montecarlo-simulation`. Use `fair-verify` for player-held proof evidence.
