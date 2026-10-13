---
name: math-conditional-value-games
description: Use when engineers price Hi-Lo decisions, deal/no-deal offers, dig-or-bank boards, or fair continuations after an opening edge, and distinguish flat RTP from ceilings and strategy-dependent returns.
metadata:
  constraints: C4
---

# math-conditional-value-games

> **Core insight:** Conditional continuation preserves a state value only after probabilities, legal actions, caps and currency rounding are included; equal-looking payouts do not establish strategy-neutral RTP.

## When to use / When NOT

- Use for current-rank, covered-set, board or pot decisions.
- Survival ladders: `math-ladder-and-progression`; bankroll runs: `build-bankroll-run-games`.

## Process

1. Define V(s), legal actions, player information, opening debit, paid/free continuations, config, currency grid and horizon. Include immediate rewards/terminal settlement. Optimize actions rather than only fixed depths: `V_t(s)=max(bank(s),sum(P(s'|s)*V_(t+1)(s')))` for bank/continue games. State includes secured value, at-risk levels and horizon; model bonus resets, partial losses, idle outcomes, rounding and terminal banking. Use actual integer-source probabilities (`fair-outcome-mappers`), not nominal weight/total; verify banking comparisons/caps, not headline neutrality. MetaWin's production server (MSS) `games/twist/gameLogic.ts` `applyGem` supplies these transitions.
2. Derive conditional draw-space probabilities. Uniform rank-excluding Hi-Lo has N alternatives, k winners: `p=k/N`; weighted draws use their weights. Apply `RTP/p` on the first risk-bearing win, then `1/p`; guaranteed moves use 1, preserving pending edge. Pre-risk cashout returns stake. MSS `games/highLowHit/gameLogic.ts` `drawNextCard`/`decisionRatio` distinguish these.
3. Include the kept item among covered offer values. Sub-fair offers reduce EV; fair final offers match continuation. Always-no-deal gives the unrounded/uncapped ceiling, not every strategy's RTP; recheck settlement transforms. MSS `games/mealOrNoMeal/gameLogic.ts` `computeOffer`/`offerFactor` reach final factor 1.
4. Dig/bank growth D(s) prices survival `p=V/(V+D)` only under its assumptions. MSS `games/deepDelve/gameLogic.ts` `expectedDeltaV` needs independent columns, sufficient frontier/durability state and additive chests. Cache by local state `d=E[reward]`, `s=P(clear)`, `g=E[reward*1(clear)]`: own-column g versus other-column d*s preserves correlation. Verify direct enumeration; rebuild tables after behavior changes. `stability` applies the price. MSS `games/cheeseHeist/index.ts` `server` and `games/thinIce/index.ts` `server` reuse this engine. Guaranteed openings track probability/reward/reward-on-completion mass across frozen layouts before decisions; calibrate weights to `targetRTP*charged-mode-cost`, checking achievable bounds/monotonicity and rounded/settled results. MSS `games/deepDelve/test-deepDelve.test.ts` `solveBlank` is test-only calibration.
5. Equality needs a martingale; bounds need a supermartingale. Optional stopping requires bounded horizon or justified integrability; caps, finite grids and rounding can break equality. Aggregate opening EV is draw-count*mean-reward, with edge once. Binary multiplier-or-zero continuations use `p=1/T` (MSS `games/kiln/gameLogic.ts` `holds`). Multi-outcome shapes use `m_i=a_i/sum(p_j*a_j)`, nonnegative a and loss a=0; verify finite-grid runtime probabilities, never rounded display odds (MSS `games/sniperRange/gameLogic.ts` `stepMultipliers`). Reject cap-breaching targets/actions before RNG; verify action means, intermediate rounding and bounded adaptive stopping.
6. Compute wallet-grid EV with atoms/exact ratios. Floor/ceil shifts EV; stochastic rounding chooses adjacent units with remainder probability. Replay extra draws/limits (MSS `games/highLowHit/gameLogic.ts` `applyStochasticRatio`). Classify flat RTP, ceiling or strategy-dependent RTP, stating rounding-error bounds.

## Correctness constraints

- C4: Sample sufficiency requires CI half-width below tolerance at chosen confidence; rare strategies and dependent continuations cannot inherit an arbitrary round count.

## Pitfalls / red flags

- Charging edge on every decision compounds advantage; removing equal-rank exclusion/unconditional Hi-Lo odds; unbounded optional stopping/tiny-stake neutrality claims.

## Verification

- Enumerate ranks/directions, guaranteed moves, fair/sub-fair offers, zero boards, caps/adaptive stopping.
- Check minimum-stake rounding EV, missing/extra draws, manual/autobet parity.
- `fair-verify`: player-saved pre-bet commitment, player-generated client seed, contiguous nonces; missing player evidence means UNVERIFIABLE.
