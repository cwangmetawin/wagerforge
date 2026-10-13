---
name: econ-sink-faucet
description: Use when reconciling player balance flows, comparing promotional outflows with expected gaming margin, or diagnosing cohort-level economy leaks. Keywords sink, faucet, settled stakes, cashable promotions, theoretical margin, ledger reconciliation.
---

# econ-sink-faucet
> **Core insight:** Reconcile gross stakes against game returns, or compare promotions alone with expected edge; adding game wins after netting them into the sink counts them twice.

## When to use / When NOT

- Use for cohort/currency flow reconciliation, promotional budget coverage, and margin-leak diagnosis.
- Not for individual bonus pricing (`econ-bonus-design`), theoretical game RTP (`math-rtp-modeling`), or lifetime forecasts (`econ-ltv-cac`).

## Process

1. **Set the accounting boundary.** Choose cohort, currency, and window; record opening/closing balances, deposits, withdrawals, escrow, pending credits, and transfers. Authoritative amounts use exact integer atoms; reject off-grid inputs (`build-wallet-and-money`). MetaWin's production server (MSS) `common/settlementModule/money.ts` `majorToAtoms` parses the decimal representation and refuses amounts finer than the wallet grid; its legacy float specimens are not a money-arithmetic template.
2. **Reconcile realized flows.** Let S be settled stake debits, W credited game returns, and P operator-funded cashable promotional/loyalty value, each counted once. Without external funding or pending-liability changes, `playerDelta = W + P - S` and `houseMargin = S - W - P` before operating costs. Add deposits minus withdrawals and other identified transfers to player movement when present. Reverse refunded stakes; rejected bets create no settled turnover. Keep open bets and pending payouts as liabilities, not losses. Derive fate from durable decisions; use `qa-settlement-integrity` for replay/refund handling.
3. **Keep expectation separate.** Theoretical margin is `H = sum(stake*(1-activeRTP))`, with the correct action/stake/strategy model (`econ-rtp-cost`). It is not realized ledger loss. If H>0, promotional coverage is `P/H`: game wins are excluded from that numerator because H already nets expected wins. At H<=0 the ratio is undefined or misleading; report signed expected margin and promotional spend separately.
4. **Attribute promotional flows once.** Separate bonus conversion, cashback, loyalty, and other observed programs; restricted bonus face value is not automatically cashable spend. If a verified loyalty contract pays fraction a of theoretical loss, model its outflow jointly with H: changing edge changes both. Do not assume MSS or an external host implements a particular winback stack, feature flag, or accrual formula.
5. **Diagnose by cohort and uncertainty.** Compare realized margin with expected margin, payout concentration, promotional spend, and liability changes. High-volatility tail outcomes can dominate short windows. Trend reconciled flows and investigate anomalies before changing RTP; a low coverage ratio or high churn alone does not establish causation. Validate interventions through `econ-ab-testing`.

## Pitfalls / red flags

Wins in both gross-credit and net-edge accounting; turnover mistaken for profit; expected edge called realized loss; refunds counted as gaming wins; pending credits treated as free margin; noncashable grants valued as withdrawals; whole-book averages hiding loss-making cohorts.

## Verification

For S=100, W=96, P=0, player movement is -4 and house margin +4; promotional coverage is zero, not 24. Reconcile exact atom balances including external transfers and liabilities, compare expected/realized margin separately, and backtest alerts against retained ledger evidence.
