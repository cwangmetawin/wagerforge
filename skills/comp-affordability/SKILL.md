---
name: comp-affordability
description: Use when implementing affordability or financial-vulnerability checks - UKGC Stage 1/2 thresholds and decision logic. Keywords affordability, UKGC, financial vulnerability, net loss, CRA.
---

# comp-affordability

## When to use / When NOT
- Use when: gating a deposit/bet on net-loss thresholds, running a frictionless CRA check, or applying gross deposit limits and pre-deposit prompts.
- NOT for: self-exclusion/GamStop (→ `comp-self-exclusion`); reality checks, break intervals, session/loss caps (→ `comp-responsible-gaming`); audit-log integrity (→ `comp-audit-and-privacy`).

## Default stack (+ escape hatch)
Default: TS + Node, server-side check at the deposit/bet boundary, decimal.js for money, authoritative time-synced server clock. Other stacks: keep the boundary gate; map "CRA provider" → credit-reference adapter, "rolling net loss" → ledger aggregate.

**Real-repo mapping (MetaWin):** a crypto sweepstakes operator (multi-currency wallet — `store/banking.js`, accounts `deposit/custodial/withdrawable/bonus`), not a UKGC fiat casino, so no net-loss/CRA/Stage machinery ships today. Map "rolling net loss" → server ledger aggregate, "gross deposit limit" → per-currency deposit total. WARNING: `composables/useCheckAffordability.js` is NOT this gate — it's a client-side BigNumber balance-vs-price test raising an `InsufficientWalletBalance` modal. Never reuse, rename, or co-locate the gate.

## Process
1. **Boundary gate (server-side).** Run the check before every deposit/bet debit; client renders the verdict, never decides. Compute rolling **net loss = stakes − returns** over 30 days from the authoritative ledger (decimal.js, gross figures).
2. **Stage 1 — frictionless.** When rolling net loss nears ~£150/month, fire a background credit-reference-agency (CRA) check for vulnerability signs (defaults, insolvency). No player upload, no blocking UI. Cache with TTL; escalate on signal.
3. **Stage 2 — enhanced.** On escalation, require income/affordability docs. Target ~90% resolved within 24h; hold play above the assessed level until cleared. Record verdict, evidence refs, reviewer.
4. **Gross deposit limits.** Enforce a **gross** (not net) deposit limit per player setting. Show a **pre-deposit limit prompt** before the first deposit; send **6-month reminders** to review it. No increase without cool-off/reauth.
5. **Fail closed.** If a CRA/provider call errors or times out, deny or down-level rather than allow unchecked play; log context.

## Pitfalls / red flags
- Mislabeling **net vs gross**: net loss drives Stage triggers; deposit **limits** are gross. Don't swap them.
- Client-side enforcement or trusting client timestamps — both bypassable; gate on the server clock.
- Confusing the regulatory gate with a wallet **balance-sufficiency** check (MetaWin's client-side `useCheckAffordability`): the gate is server-authoritative and runs before debit; the balance check only tells the UI the wallet can't cover the price.
- Stage 1 that blocks or requests documents — it must be frictionless; only Stage 2 requests income docs.
- Missing the pre-deposit prompt or 6-month reminders; allowing limit increases with no cool-off; failing open when the CRA provider is down.
- Hardcoding the ~£150 / 24h SLA / 6-month cadence instead of config (thresholds are regulator-tunable).

## Verification
- Boundary test: a deposit pushing rolling net loss past the threshold fires a Stage 1 CRA call before debit; a vulnerability signal escalates to Stage 2 and holds play.
- Provider-timeout test proves fail-closed.
- Audit shows the pre-deposit prompt fired once, a 6-month reminder scheduled, and every gross-limit increase carried a cool-off/reauth.
