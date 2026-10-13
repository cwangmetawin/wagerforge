---
name: econ-ltv-cac
description: Use when forecasting player lifetime value, comparing cohort acquisition cost, evaluating promotional ROI, or discounting retained net gaming margin. Keywords LTV, CAC, FTD cohort, churn, discount rate, net margin.
---

# econ-ltv-cac
> **Core insight:** LTV is a discounted net-margin forecast with explicit cashflow timing; deposits and free grants are not gaming revenue, and a blended LTV:CAC ratio can hide losing cohorts.

## When to use / When NOT

- Use for cohort forecasts, acquisition budgets, segmentation, and incremental offer ROI.
- Not for pricing one bonus (`econ-bonus-design`) or deriving a game's RTP (`math-rtp-modeling`).

## Process

1. **Define the cohort and accounting.** Specify entry event, such as FTD, attribution window, channel, geography, device, currency, and observation/censoring period. Acquisition spend and cohort counts must share the same boundary. Reconcile authoritative money in exact integer atoms; convert only under a declared valuation policy (`build-wallet-and-money`).
2. **Build net-margin cashflows.** Gaming margin is settled stakes minus game returns, with promotional and direct operating costs deducted once. Deposits are funding transfers, not revenue; free promotional stakes supply no deposit revenue. Record realized promotional cost through `econ-bonus-design`, preserving campaign/currency attribution without assuming an external campaign API. Use newly paid returns rather than cumulative display totals: MetaWin's production server (MSS) `games/tartarus/gamePlay.ts` `playMain` returns incremental continuation `win` separately from cumulative `totalWin/clientWin`.
3. **Declare timing and model assumptions.** Fit retention and spend from cohort history. `scripts/ltv.mjs` `ltv({monthlyMargin, churnRate, discountRate=0})` assumes constant monthly margin M, constant monthly churn q, monthly discount d, and first margin at t=0: `LTV = M*(1+d)/(q+d)`. With d=0 this is M/q. If the first margin arrives at t=1, the corresponding model is `M/(q+d)`; do not shift timing silently. Uneven margins or retention require the explicit discounted survival-weighted sum instead.
4. **Validate inputs and forecasts.** The helper requires finite signed margin, `0<q<=1`, and finite `d>=0`; negative margins remain visible. Estimate uncertainty, disclose censoring, and backtest against held-out mature cohorts. These finite-number helpers are analytical estimates, not authoritative money arithmetic.
5. **Price acquisition explicitly.** `CAC = attributed acquisition spend / acquired cohort members`; an FTD cohort uses FTDs as denominator. `ltvCacRatio(ltvValue, cac)` requires finite positive CAC. `maxAcquisitionSpend({ltvValue, targetRatio=3})` divides forecast LTV by a positive planning ratio; 3 is a helper default, not an industry requirement. Negative LTV implies no positive acquisition budget under this model. Measure incremental margin and retention uplift from offers via `econ-ab-testing`.

## Pitfalls / red flags

Blended cohorts; deposits counted as revenue; promotional spend counted in both forecast and CAC; double-counted wins; unsupported CAC/ratio benchmarks; invented Studio currency-lock contracts; optimistic extrapolation from immature cohorts; discounting t=0 margin.

## Verification

Retain reconciled cohort inputs, timing/discount conventions, uncertainty and backtests. `ltv({monthlyMargin:100,churnRate:.1,discountRate:.05})` is approximately 700 under t=0 timing; verify numerical tolerance and invalid-input rejection with `scripts/ltv.test.mjs`. A ratio target is a decision input, not proof of profitability.
