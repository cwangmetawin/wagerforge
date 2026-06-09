---
name: econ-sink-faucet
description: Use when balancing a game or casino economy - sinks (wagering, house edge) vs faucets (wins, bonuses, loyalty) - and monitoring margin health. Keywords sink, faucet, economy balance, margin, churn.
---

# econ-sink-faucet

## When to use / When NOT
- Use when: auditing whether faucets (wins, bonuses, loyalty) and the wagering sink are in balance per cohort, or diagnosing margin compression / bonus-driven churn.
- NOT for: deriving a single game's RTP/house edge (→ `math-rtp-modeling`); per-offer bonus cost and wagering requirements (→ `econ-bonus-design`); LTV:CAC forecasting (→ `econ-ltv-cac`).

## Default stack (+ escape hatch)
Default: Node + decimal.js over a server-side ledger; cohort rollups in SQL. Money is float-safe (integer minor units or decimal). Other stacks: same identity — sum signed ledger flows per cohort over a rolling window; map your wins/bonus/loyalty events to faucets and your settled wagers to the sink.

## Process
1. Classify every economy flow. Faucets (value entering player balances): wins, bonus credits, and the loyalty stack — instant rakeback/"Theo-based" winback, daily/weekly/monthly cashback, rank-up, streak, reload. Sink (value permanently exiting): the house edge realized on settled wagering — i.e. `sink = Σ wager × houseEdge`, not gross wager turnover.
2. Pick a cohort key (channel/geo/device/signup-week) and a rolling window; never aggregate the whole book — a healthy whale cohort hides a bleeding bonus-hunter cohort.
3. Compute per cohort: total faucet value vs total sink volume. Health ratio `faucetValue / sinkVolume`. > 1 means more value is dispensed than the edge captures — margin erodes. Persistently « 1 with high churn means the offering feels too tight.
4. Trend the ratio over time; alert on rate-of-change, not just level. A ratio drifting up week-over-week is the early margin-compression signal.
5. Attribute moves: split faucet into wins vs bonus vs each loyalty program separately (winback / cashback / rank-up / streak are independently feature-flagged and tuned) so you know which lever caused the imbalance before changing RTP, bonus generosity, or loyalty accrual.

## Pitfalls / red flags
- Counting gross wager turnover as the sink — only the house edge actually exits; using turnover wildly overstates sink and hides leaks.
- Whole-book aggregation masking a toxic cohort; always slice by cohort.
- Treating sticky/non-withdrawable bonus credit as realized faucet value before it converts — overstates faucets.
- Ignoring loyalty/cashback as a faucet; it is real outflow that compounds, and it is a stack of separately-toggled programs, not one line item.
- Modeling rakeback/"Theo-based" winback as a fixed cost: it is a fraction of theoretical loss (wager × houseEdge), so it auto-scales with the sink — tightening RTP raises both the realized edge and this faucet, partly cancelling the margin gain; model the two together.
- Reacting to one noisy window instead of the trend; faucet variance is high at low volume.
- Tightening RTP to fix a ratio that bonuses actually caused — fix the right lever.

## Verification
- Reconcile: `Σ faucets − sink` per cohort should match the cohort's net ledger movement (house P&L) over the window; a gap means a flow is misclassified or double-counted.
- Backtest the alert threshold against a past margin-compression episode — it should have fired before margin moved.
