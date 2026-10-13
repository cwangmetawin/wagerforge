---
name: math-feature-buy-and-jackpot
description: Use when pricing bonus buys or feature buys, comparing buy RTP, or separating fixed jackpots, progressive meter contributions, and reset seed returns.
metadata:
  constraints: C14
---

# math-feature-buy-and-jackpot

> **Core insight:** Buy RTP is return per actual charged cost, parity is product policy, and recurring progressive reset seeds contribute to the money players receive.

## When to use / When NOT
- Use for buy pricing, route-specific return, and jackpot decomposition.
- Base distribution modeling belongs to `math-rtp-modeling`; funded-pool operation belongs to `econ-progressive-jackpot`.

## Process
1. Pin each actual bought route: charged cost B=c·innerBet, entry mix, retry/rejection rules, payout cap, and settlement rounding. MetaWin's production server (MSS) `games/zeus/index.ts` `play` divides the charged buy bet by its cost; `games/zeus/gamePlay.ts` `playBuyFreegames` selects product-specific entry and `buyBands`. A bought feature need not share the natural feature distribution.
   Condition bought moving-wild entry on trigger eligibility and minimum starting height before replay; natural-entry pricing misstates EV. MSS `games/sheriffNudge/gameLogic.ts` `getInitGameView`. Verify bottom-only rejection, RESET satisfying the height guard, and accepted entry distribution; movement: `math-moving-wild-collection`.
2. Sum only newly payable gross wins across the complete round in exact integer atoms; retain display totals separately. Price identity: B=E[W]/rBuy. If changing B changes the distribution or rounding, recompute E[W] at the proposed price. MSS `games/tartarus/gamePlay.ts` `playMain` subtracts the already paid base win on natural continuations; `playBuyFreegames` initially pays zero and its continuation pays the full feature win.
3. Declare the parity policy and disclose base and buy RTP separately. Higher rBuy means higher expected return per unit charged; a buy's variance is measured, not assumed. `scripts/bonus-buy.mjs` `bonusBuyCost({expectedFeaturePayout,buyVariantRTP})` implements the price identity; `rtpParity({buyVariantRTP,baseRTP,tol})` returns a gap and whether buy RTP is at least base minus tolerance. Reject non-finite inputs; expectation must be nonnegative and rBuy positive.
4. Classify jackpots by actual payout mechanism. Fixed awards already belong to the game distribution: MSS `games/maneater/gameLogic.ts` `loadBaseGame` pays configured jackpots times bet; `games/coinUp/gameLogic.ts` `playBonus` sums cell values and a fixed grand. Do not add their EV again as an external pool slice.
5. For a modeled progressive cycle with turnover T, recurring reset seed S, and fully paid meter cT: effective jackpot return=E[S+cT]/E[T]=c+S/E[T] for constant S. Funding transfers are not additional player payouts. A one-time seed vanishes only in the infinite-turnover limit. `decomposeJackpotRtp({baseRTP,jackpotMeterRTP})` merely adds those supplied components and labels the result `advertisedRTP`; it does not compute seed return or establish an approved disclosure model.
6. Check stake regimes and natural/buy eligibility separately. MSS `games/zeus100k/gamePlay.ts` `fgBandReject` applies route-specific rejection below the absolute-floor threshold; bought routes keep their own cap (currency-floor editions: `math-guaranteed-payout-floor`).

## Correctness constraints
- **C14:** Switching already approved variants within scope differs from changing weights, paytable, rejection, or feature logic. Display the active certified model; an outside-RNG operator promotion is not permission to hide a math-changing Promo or skip applicable recertification.

## Pitfalls / red flags
Unverified contribution percentages; mandatory parity presented as a theorem; price based on natural-entry EV; double-counted fixed jackpots; recurring seed return erased by reserve funding.

## Verification
Retain per-route charged-cost/payout evidence, minimum and representative stake checks, caps and rounding cases, and converged RTP CIs. For progressives reconcile complete cycle payouts and turnover; keep funding accounting separate.
