---
name: comp-affordability
description: Use when implementing affordability or financial-vulnerability checks - UKGC Stage 1/2 thresholds and decision logic. Keywords affordability, UKGC, financial vulnerability, net loss, CRA.
---

# comp-affordability

## When to use / When NOT
- Use when: gating a deposit/bet on net-loss thresholds, running a frictionless CRA check, or applying gross deposit limits and pre-deposit prompts.
- NOT for: self-exclusion/GamStop (→ `comp-self-exclusion`); reality checks, break intervals, session/loss caps (→ `comp-responsible-gaming`); audit-log integrity (→ `comp-audit-and-privacy`).

## Default stack (+ escape hatch)
Default: TS + Node, server-side check at the deposit/bet boundary, decimal.js for money, authoritative time-synchronized server clock. Other stacks: keep the same boundary gate; map "CRA provider" → your credit-reference adapter, "rolling net loss" → your ledger aggregate.

## Process
1. **Boundary gate (server-side).** Every deposit/bet request runs the affordability check before debit. Client never decides; it renders the server verdict. Compute rolling **net loss = stakes − returns** over a 30-day window from the authoritative ledger (decimal.js, gross figures).
2. **Stage 1 — frictionless.** When rolling net loss approaches ~£150/month, trigger a background credit-reference-agency (CRA) check for signs of financial vulnerability (e.g. defaults, insolvency). Frictionless: no player document upload, no blocking UI. Cache the result with a TTL; on vulnerability signal, escalate.
3. **Stage 2 — enhanced.** On escalation, require income/affordability documentation. Target ~90% of cases resolved within 24h; until cleared, hold deposits/play above the assessed level. Record verdict, evidence refs, and reviewer.
4. **Gross deposit limits.** Enforce a **gross** (not net) deposit limit per the player's setting. Show a **pre-deposit limit prompt** before the first deposit so a limit is set up front, and send **6-month reminders** to review it. Never let an increase take effect without cool-off/reauth.
5. **Fail closed.** If a CRA/provider call errors or times out, deny or down-level rather than allowing unchecked play; log context for review.

```dot
digraph { rankdir=LR; node[shape=box];
  D[label="deposit/bet"] -> NL[label="rolling 30d net loss"];
  NL -> S1[label=">= ~£150 net/mo?"];
  S1 -> CRA[label="Stage 1 CRA\n(frictionless)" ]:e [color=red];
  S1 -> OK[label="allow (≤ limit)"];
  CRA -> S2[label="vulnerability signal?"];
  S2 -> DOC[label="Stage 2 income docs\n90% < 24h"];
  S2 -> OK;
}
```

## Pitfalls / red flags
- Mislabeling **net vs gross**: net loss drives Stage triggers; deposit **limits** are gross. Do not swap them.
- Client-side enforcement or trusting client timestamps — both bypassable; gate on the server clock.
- Stage 1 that blocks/asks for documents — it must be frictionless; only Stage 2 requests income docs.
- Missing the pre-deposit prompt or 6-month reminders; allowing limit increases with no cool-off.
- Failing open when the CRA provider is down.
- Hardcoding the ~£150 figure / 24h SLA / 6-month cadence inline instead of config (thresholds are regulator-tunable).

## Verification
- Boundary test: a deposit pushing rolling net loss past the threshold triggers a Stage 1 CRA call before debit; a vulnerability signal escalates to Stage 2 and holds play.
- Provider timeout test proves fail-closed.
- Audit shows pre-deposit prompt fired once, 6-month reminder scheduled, and every gross-limit increase carried a cool-off/reauth.
