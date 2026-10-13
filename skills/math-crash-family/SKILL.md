---
name: math-crash-family
description: Use when deriving crash or limbo target RTP, instabust probability, floored multipliers, payout caps, or correlated cash-out tiers. Keywords crash, limbo, survival, inverse CDF, instabust, Chase.
---

# math-crash-family

> **Core insight:** Crash target RTP is constant only above 1x before binding caps and settlement transforms; shared crash tiers are correlated.

## When to use / When NOT

- Use for inverse-CDF crash laws and target/cash-out pricing.
- Not for interval dice, discrete ladders (`math-ladder-and-progression`), or slots (`math-rtp-modeling`).

## Process

1. **Define the event.** Ideal raw crash point C has P(C≥x)=(1−h)/x for x>1, atom h at C=1, and P(C≥1)=1. For multiplier-target settlement require grid-aligned T>1; such targets lose on instabust. MetaWin's production server (MSS) `games/chase/rtp98.ts` `cashOutAtMin` is `1.01`; `games/chase/index.ts` `validateParams` checks the minimum and grid.
2. **Sample, floor, settle.** Uniform u∈[0,1): u<h gives 1; otherwise (1−h)/(1−u). Floor to the display grid and settle against that value; upward rounding raises survival/RTP. MSS `games/chase/index.ts` `rollCrashPoint` floors hundredths before `maxCrash`; `settle` uses tier≤crashPoint. Displayed 1.00 includes continuous values floored down, exceeding the raw atom when h<1.
3. **Price caps.** Ideal uncapped gross RTP=1−h. For equality-paying target settlement, stake-multiple payout cap K gives RTP=(1−h)·min(T,K)/T if the outcome cap permits T. Currency cap A means K=A/stake, hence stake-dependent RTP. An outcome cap below T prevents winning. Quantize money in exact atoms under the declared payout rule; recompute RTP. MSS `games/chase/index.ts` `settle` caps aggregate money at `maxWinCap`.
4. **Model dependence.** Shared-tier expectations add; nested survival depends on the highest target, never multiplied marginals. Include covariance/aggregate caps. MSS `games/chase/index.ts` `settle` splits stake across shared-crash tiers. Shared clocks need not share failures: MSS `games/skyfall/index.ts` `server.tick` draws independent fades per wager; `toRoomBet` hides unresolved fades. MSS `games/hitCrashers/fairness.ts` `takeoffDraw` stores one table-wide crash. Verify draw allocation and identical public projections when only hidden outcomes differ.
5. **Declare live-clock policy.** With floored, capped crash point C_d, outcome limit cap, positive growth g and elapsed seconds t, display floor(100·exp(g·t))/100; bust at ln(min(C_d+0.01,cap))/g. Ordinary C_d permits exits throughout its bin; at cap equality aboard loses. Even C_d=1.00 allows a valid manual exit before ln(1.01)/g, returning the net stake with certainty: return 1, not R=1−h. Recompute charged-stake return; declare a stake-side edge or require exits≥1.01, verifying atom effects. MSS `games/hitCrashers/money.ts` `netAtoms` deducts the pot contribution first. MSS `games/hitCrashers/crashLaw.ts` `multiplierX100AtElapsed`/`crashDelay`; MSS `games/hitCrashers/settle.ts` `checkEject` rejects exits at/after bust; manual settlement uses the displayed value.
6. **Use correct helpers/specimen.** WF `scripts/rtp.mjs` exports `crashSurvival`, `crashEV`, `crashTargetRTP`, no sampler. MSS `games/chase/index.ts` `rollCrashPoint` is the specimen. MSS `games/crash/index.ts` `play` is legacy with commented-out `proveFairness`; do not scaffold from it. MSS `games/primedice/index.ts` `main` uses interval probability.

## Pitfalls / red flags

Target invariance under caps, off-grid targets or rounded payouts; independent parallel tiers; legacy money floats.

## Verification

Check atom/minimum-target boundaries, floor transitions, finite RNG mapping, outcome/aggregate payout caps with deterministic fixtures; probe 1.00 manual exits and bust equality, either side, ordinary/cap points. Compare actual returns by target, stake, variant and tier count against joint predictions, with CIs via `math-montecarlo-simulation`; use `fair-verify` for player-held evidence.
