---
name: econ-progressive-jackpot
description: Use when modeling contribution-funded progressive or network jackpots, meter growth, reset funding, reserve exposure, and advertised versus effective player return. Keywords progressive jackpot, meter RTP, reset seed, reserve, network pool.
metadata:
  constraints: C14
---

# econ-progressive-jackpot
> **Core insight:** Advertised RTP adds base and meter return; operator-funded reset seeds are a separate funding exposure, while actual seed-paid returns must still be measured.

## When to use / When NOT

- Use for a persistent pool funded by wagers between hits, including reserve and reset economics.
- Not for fixed-tier in-game awards (`math-feature-buy-and-jackpot`, `econ-rtp-cost`) or hold-and-win board mechanics (`math-hold-and-win`). MetaWin's production server (MSS) `games/coinUp/gameLogic.ts` `playBonus` adds configured symbol/Grand values; MSS `games/maneater/gameLogic.ts` `loadBaseGame` pays configured jackpot multiples. These specimens do not establish a progressive-pool implementation.

## Process

1. **Specify the pool contract.** Define eligible stake/turnover, trigger rules, meter ownership, rollover, reset seed S, eligibility/expiry, winner allocation, and reserve funding. Split total contribution into meter rate c_m and reserve rate c_r. Choose rates from modeled economics, not an unsupported universal percentage. Authoritative stakes, contributions, reserves, and payouts use exact integer atoms and declared remainder rules (`build-wallet-and-money`).
2. **Keep the advertised decomposition explicit.** `advertisedRTP = baseRTP + jackpotMeterRTP`. `scripts/bonus-buy.mjs` `decomposeJackpotRtp({baseRTP, jackpotMeterRTP})` returns `advertisedRTP`, `baseRTP`, and `jackpotContributionRTP`. It validates finite nonnegative rates and performs addition only; it does not estimate triggers, seed recovery, or certification. The operator-funded reset seed is not a summand in this advertised convention; reserve funding is not meter return. Avoid counting a meter slice twice inside base RTP.
3. **Account for actual player return separately.** Measure all jackpot payouts divided by eligible turnover across complete cycles, with unfinished-pool liabilities disclosed. Repeated paid reset seeds remain actual player receipts; reserve repayment cannot erase them. A one-time injection and recurring resets have different long-run economics. Call this effective return separately from the advertised decomposition, and disclose the funding convention without claiming a verified regulatory presentation rule.
4. **Model funding risk.** Reconcile `closingPool = openingPool + meterContributions + seedInjections - jackpotPayouts`; keep reserve transfers in their own ledger. Simulate hit cadence, turnover variability, seed obligations, reserve drawdown, thin networks, and concentration. Expected recovery time is not a guarantee of recovery before the next hit. Report confidence intervals and stressed capital requirements.
5. **Review the active math.** Changes to eligibility, trigger odds, payout/reset logic, weights, or caps alter player economics. Bind evidence to the active approved configuration and display its active percentage; use `comp-rtp-certification` for change-control scope.

## Correctness constraints

- **C14:** Switching among pre-certified variants is distinct from changing the math model; display the active percent and verify the approval scope. An external operator-funded grant does not change certified game RNG math. Progressive trigger/payout changes and EV-preserving math retunes require the math-model change-control decision. Do not infer a certification exemption from constant mean RTP or funding source alone.

## Pitfalls / red flags

Pool math applied to fixed jackpots; arbitrary contribution benchmarks; full contribution counted as player return despite reserves; recurring seed receipts omitted from effective return; reserve repayment treated as negative payout; impossible guaranteed payback; unverified certification claims.

## Verification

Check advertised base-plus-meter equality, exact pool/reserve reconciliation, complete-cycle effective payouts, stressed funding adequacy, and version-bound approval evidence. The decomposition helper proves arithmetic only.
