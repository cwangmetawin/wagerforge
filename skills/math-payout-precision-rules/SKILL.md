---
name: math-payout-precision-rules
description: Use when specifying or auditing where money and probabilities are rounded, including staged floor, ceil, half-up or toFixed quantization, multiplier and win-cap scope, scatter cash outside a cap, quantized odds or chance lattices, quote repair, minimum stakes, and the probability mass of ineligible table entries. Keywords rounding stage, payout atoms, absolute cap, buy cap, ceil quote, lattice RTP, renormalize, conditional rate.
metadata:
  pillar: math
---

# math-payout-precision-rules

> **Core insight:** Actual settlement follows declared rounding stages, cap scopes, quantized probabilities and eligibility, including refunds.

## When to use / When NOT

- Use for staged quantization, caps, odds lattices and ineligible mass.
- Ledgers: `build-wallet-and-money`; guaranteed payout floors: `math-guaranteed-payout-floor`; retries: `math-forced-outcome-shaping`.

## Process

1. **Stages.** Declare each product, sum and division's units, grid and rounding direction; stake-last applies only within multiplier-space stages. Compute every floor in exact integer atoms, not floats; never substitute nearest for floor or one final round for stages. MetaWin's production server (MSS) `games/kiln/gameLogic.ts` `stretchHaul`/`payoutFor` floor each stretch, then stake×haul. On an E8 currency grid, floor charged stake÷modeCost; exclude remainder; reject positive stakes yielding zero base bet. Floor H, multiply original base-bet atoms, then floor division by 100: MSS `games/deepDelve/gameLogic.ts` `baseBetOf`/`payoutMoney`. Physical-award example: half-up stakeMicroUSD×PPM/10⁶ to reference microUSD, then floor referenceMicroUSD×10⁹/lockedAskMicroUSDPerGram to nanograms; keep the lock immutable; record purity separately: MSS `games/hitDraw/physicalGameLogic.ts` `calculatePhysicalAllocationQuantityNanograms`/`buildPhysicalResult`. Declare separately rounded normalized line descriptors versus payment normalized from the raw sum (MSS `games/fruitNudge/gameLogic.ts` `detectPaylineWins`), or summed rounded groups; preserve collector/spin/feature boundaries; accumulate authoritative respin payments before rounding/capping the round. Round coin sweep first, then round (ways+sweep)×roundMultiplier once: MSS `games/piggyBank/gameLogic.ts` `loadBaseGame`. Displayed odds/results never decide eligibility or payment. Verify stages at minimal stakes and both asset boundaries/price locks.
2. **Cap scope.** Declare per-route multiplier/cap coverage and true maximum wherever exposure or max win is stated. Round before an absolute currency cap: MSS `games/mealOrNoMeal/gameLogic.ts` `computeOffer`. Bought features can cap with base win zero, then add entry scatter cash outside feature multipliers and cap: MSS `games/perseus/gamePlay.ts` `playFreeGames`. Trigger and terminal scatter cash may bypass the wave ladder, or neither pays; declare route: MSS `games/tartarus/gamePlay.ts` `playMain` and `games/tartarus/gameLogic.ts` `loadUpgradingFreeGames`. Declare termination policy: MSS `games/sweetyCluster/gamePlay.ts` `playMain` cancels pending features at a capped base; otherwise finishes every awarded spin, clamps feature then combined payment. Stopping at cap is another policy: MSS `games/piggyBank/gameLogic.ts` `loadMovingFreeGames`. Verify route totals, cancellations and continued draws.
3. **Lattices.** RTP=Σ(probability×actual-settled-return)/charged-stake, including refunds. Declare quote direction: MSS `games/hit-ai-wars/pricing.ts` `priceE4` uses ceil E4, repairing p×quote<target for win/zero-loss quotes. Floor's target bound applies before clipping/settlement. MSS `games/snakes-hit/pricing.ts` `payoutE4ForProbability` floors (target−pDraw)/pWin, clips live odds, returns minimum odds for nonpositive/nonfinite pWin; certified table odds bypass live clipping (`deriveRoundQuote`). A quote's uplift cannot guarantee covering a floored settlement's atom loss: MSS `games/hit-ai-wars/money.ts` `applyPayoutE4` ceils winners; losses explicitly settle zero: MSS `games/hit-ai-wars/settle.ts` `settleBattle`. Let s=stakeAtoms, k=E4, r=targetRTP×10⁶, a=ceil(s×k/10000). Under this quote-bound policy, admit only a×r×10000≤s×10⁶×(k−1), exact BigInt: MSS `games/hit-ai-wars/money.ts` `fixedOddsStakeAccepted`. This prevents rounding-induced positive EV; ceil pricing bounds p by r/(100(k−1)). UI minimum=last refused stake+one atom; smaller stakes can pass. Declare refuse/suspend/clip policy and recompute RTP. Chance-grid example: units=round(target÷multiplier×source-size); uniform integer roll<units wins: MSS `games/giftBox/math.ts` `chanceUnitsFor`/`isWinningRoll`. Verify quote/payout grids, bounds, strict equality and tiny stakes.
4. **Ineligible mass.** Declare residual-to-plain without renormalizing exhausted shared run-budget special bands: MSS `games/floor13/gameLogic.ts` `rollEvents`; or renormalize retained eligible weights, making low values vanish. MSS `games/bloodMoonRising/math/engine/drop-source.ts` `multiplierChanceFor` forbids base multiplier/orb landings and scales super landing probability; `createCellSource` tests scatter q first, then bounded orb p/(1−q), else ordinary symbols. MSS `games/bloodMoonRising/math/config/math-config.ts` `compile` retains minimum-eligible ladder weights. Verify unconditional/history-dependent masses and endpoints.

## Pitfalls / red flags

Single final rounding; display-driven payment; nominal RTP; undeclared renormalization.

## Verification

Enumerate settlement atoms, route maxima and eligibility masses; retain boundary fixtures.
