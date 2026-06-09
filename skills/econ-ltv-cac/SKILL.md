---
name: econ-ltv-cac
description: Use when modeling player lifetime value vs acquisition cost - cohort forecasting, segmentation, and bonus ROI. Keywords LTV, CAC, cohort, retention, FTD.
---

# econ-ltv-cac

## When to use / When NOT
- Use when: forecasting cohort LTV, comparing to CAC, segmenting players, or sizing a dynamic offer for true acquisition ROI.
- NOT for: pricing a single bonus / wagering requirement (→ `econ-bonus-design`); aggregate game RTP margin accounting (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/ltv.mjs` exports `ltv({ monthlyMargin, churnRate })` (geometric-sum LTV = monthlyMargin / churnRate), `ltvCacRatio(ltvValue, cac)`, and `maxAcquisitionSpend({ ltvValue, targetRatio = 3 })` (max per-player spend holding target LTV:CAC). Other stacks: same model — group FTD cohorts, fit retention/spend curves, discount future net margin to present value.

## Process
1. Define the cohort by acquisition channel, geo, and device (axes that move retention and spend); anchor on first-time deposit (FTD) as the entry event.
2. Project per-cohort LTV = discounted sum of expected net gaming revenue (house edge × wagering) minus bonus give-away over retained lifetime; fit retention/spend curves from cohort history, not a flat average.
3. Compute CAC = acquisition spend ÷ FTDs for the cohort. iGaming CAC runs ~$280–$1,400/FTD; segment it, never average across channels.
4. Evaluate LTV:CAC against the ~3:1 target. Below it, the cohort is over-priced or under-monetized; above ~5:1 you may be under-investing in growth.
5. Optimize LTV UPFRONT: use per-segment offers that raise retained value rather than chasing the cheapest CAC. The lever is LTV, not acquisition price.
6. Model freebet / campaign bets per the real contract (`@mini-games/studio` `Campaign type:'freeBets'`, `config{bets,amount,currency}` + `playerState{used,totalWin,amount}`): the STAKE is a fixed free grant that never settles to the native balance as a deposit, so it adds zero deposit revenue — count only its give-away/margin. Freebets are currency-locked (applied only when player currency == `config.currency`); attribute that margin to the campaign's native-currency cohort only.

## Pitfalls / red flags
- Blended LTV:CAC hiding a money-losing channel inside a profitable average — segment.
- Treating CAC as the only lever; the higher-leverage move is raising LTV upfront via segmentation and offers.
- Counting freebet / campaign STAKES as deposit revenue: a free grant never settles to the native balance as a deposit. (Native is truth, fiat display-only — yet the WIN is still fiat-converted for display; don't confuse "no deposit settlement" with "no display conversion".)
- Modeling freebet margin in the wrong cohort: campaigns are currency-locked to `config.currency`, so it belongs to that cohort only.
- Flat retention/spend assumptions instead of cohort-fitted curves; ignoring discount on future revenue.
- Optimizing CAC down at the expense of cohort quality (cheap traffic, poor retention) so LTV:CAC collapses.

## Verification
- Per-segment LTV:CAC lands near 3:1 with cohort-fitted curves, not a blended number.
- CAC inputs fall in $280–$1,400/FTD or are explicitly justified.
- Freebet/campaign stakes contribute zero deposit revenue and never settle to the native balance as deposits; their margin is attributed to the `config.currency` cohort.
- `scripts/ltv.mjs` reproduces a known cohort within tolerance: `ltv` from monthly margin and churn, `ltvCacRatio` vs CAC, `maxAcquisitionSpend` at the target ratio.
