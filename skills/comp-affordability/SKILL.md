---
name: comp-affordability
description: Use when implementing affordability or financial-vulnerability gates, gaming net-loss triggers, gross-deposit limits, credit-reference review or pending-exposure policy. Keywords affordability, UKGC, net loss, CRA, deposit totals, vulnerability.
---

# comp-affordability

> **Core insight:** Deposits change deposit totals; gaming net loss is settled stakes minus returns. Define the regulatory metric separately before using it to gate acceptance.

## When to use / When NOT
- Use for: financial-vulnerability assessment and approved deposit/wagering eligibility policies.
- NOT for: wallet balance sufficiency (`build-wallet-and-money`), self-exclusion (`comp-self-exclusion`), session controls (`comp-responsible-gaming`) or audit storage (`comp-audit-and-privacy`).

## Process
1. **Define separate aggregates.** Gross deposits sum accepted deposits. Gaming net loss is `settledStakes-settledReturns`, including signed gains where returns exceed stakes. Deposits do not increase this loss. Define the applicable regulatory metric independently; do not assume it equals gaming net loss or deposit-minus-withdrawal flow.
2. **Use authoritative entries.** Derive windowed totals from the ledger with event-time/window boundaries, currency, reversals and duplicate handling specified. MetaWin's production server (MSS) `games/roulette-1000/index.ts` `settleChunk` accumulates `wageredAtoms` and `returnedAtoms` after spin settlement; these are wagering totals, not deposit totals.
3. **Keep money exact.** Use currency atoms or exact decimals; never mix currency units or add floats before parsing. MSS `common/settlementModule/money.ts` `majorToAtoms` rejects invalid/off-grid input. WF `scripts/money.mjs` `toAtoms` converts an individual amount to BigInt without rounding. Define valuation/time/precision explicitly when aggregating currencies.
4. **Reserve exposure separately.** Before accepting a stake, compute the policy's prospective exposure from unsettled reservations plus the proposed stake. Update reservations and eligibility atomically with acceptance; settled stakes/returns replace reservations without double counting. A deposit gate can read loss history, but the deposit itself changes deposit totals only.
5. **Version the review policy.** Specify thresholds, windows, provider schema, result freshness, escalation, permitted pending exposure and reviewed limits. UNKNOWN, invalid or unavailable required assessments block unchecked acceptance. Record policy version, evidence references, reviewer/verdict and effective time; clients render decisions. Activate increases only under the approved cooling/review policy.
6. **Source jurisdiction requirements.** UKGC thresholds, Stage 1/2 scope, review SLAs, deposit prompts and reminder timings are (unverified) here. Obtain current authoritative requirements before configuring them; repository code does not establish regulatory compliance.

## Pitfalls / red flags
Deposit raising a stakes-minus-returns trigger; balance checks mislabeled vulnerability assessments; stale/provider-error verdicts treated as clearance; unsigned window totals; ignored pending stakes; hardcoded unsourced regulatory numbers.

## Verification
- Deposit tests change gross-deposit totals and leave gaming net loss unchanged. Settled wagering tests move loss by stake minus return; gains, reversals and retries preserve the defined aggregate.
- Integration tests cover exact boundaries, currency conversion, concurrent reservations, window rollover, provider UNKNOWN/timeouts, escalation/holds and approved limit changes. Retain refusal/no-debit evidence and policy-linked review records; predicates alone cannot prove these gates.
