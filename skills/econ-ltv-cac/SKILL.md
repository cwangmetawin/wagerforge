---
name: econ-ltv-cac
description: Use when modeling player lifetime value vs acquisition cost - cohort forecasting, segmentation, and bonus ROI. Keywords LTV, CAC, cohort, retention, FTD.
---

# econ-ltv-cac

## When to use / When NOT
- Use when: forecasting cohort LTV, comparing it to CAC, segmenting players, or sizing a dynamic offer for true acquisition ROI.
- NOT for: pricing a single bonus / wagering requirement in isolation (→ `econ-bonus-design`); aggregate game RTP margin accounting (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/ltv.mjs` exports `ltv({ monthlyMargin, churnRate })` (geometric-sum LTV = monthlyMargin / churnRate), `ltvCacRatio(ltvValue, cac)`, and `maxAcquisitionSpend({ ltvValue, targetRatio = 3 })` (max spend per player holding the target LTV:CAC). Other stacks: same model — group FTD cohorts, fit retention/spend curves, discount future net margin to present value.

## Process
1. Define the cohort by acquisition channel, geo, and device (the segmentation axes that move retention and spend); anchor on first-time deposit (FTD) as the cohort entry event.
2. Project per-cohort LTV = discounted sum of expected net gaming revenue (house edge × wagering) minus bonus give-away over the retained lifetime; fit retention and spend curves from cohort history rather than a flat average.
3. Compute CAC = acquisition spend ÷ FTDs for that cohort. iGaming CAC runs roughly $280–$1,400 per FTD; segment it, never average across channels.
4. Evaluate LTV:CAC against the ~3:1 target. Below it, the cohort is over-priced or under-monetized; above ~5:1 you may be under-investing in growth.
5. Optimize LTV UPFRONT: use segmentation to deliver dynamic, per-segment offers that raise retained value, rather than chasing the cheapest CAC. The lever is LTV, not just acquisition price.
6. Account for freebet / campaign bets correctly: they are stake-only, never fiat-converted, so they cost give-away but generate no deposit revenue — exclude them from deposit-driven LTV and count only their margin effect.

## Pitfalls / red flags
- Blended LTV:CAC that hides a money-losing channel inside a profitable average — always segment.
- Treating CAC as the only lever; the higher-leverage move is raising LTV upfront via segmentation and dynamic offers.
- Counting freebet / campaign stakes as deposit revenue, or fiat-converting them — they are never fiat-converted.
- Flat retention/spend assumptions instead of cohort-fitted curves; ignoring the discount on future revenue.
- Optimizing CAC down at the expense of cohort quality (cheap traffic, poor retention) so LTV:CAC silently collapses.

## Verification
- Per-segment LTV:CAC lands near the 3:1 target with cohort-fitted curves, not a blended single number.
- CAC inputs fall in the $280–$1,400/FTD range or are explicitly justified when outside it.
- Freebet/campaign stakes contribute zero deposit revenue in the model and are never fiat-converted.
- `scripts/ltv.mjs` reproduces a known cohort within tolerance: `ltv` from monthly margin and churn, `ltvCacRatio` against CAC, and `maxAcquisitionSpend` at the target ratio.
