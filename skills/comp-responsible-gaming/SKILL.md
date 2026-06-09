---
name: comp-responsible-gaming
description: Use when implementing responsible-gaming controls — deposit, loss, and session limits, reality checks, and self-exclusion — that must be enforced server-side. Keywords responsible gaming, deposit limit, loss limit, session limit, reality check, self-exclusion.
constraints: C13
---

# comp-responsible-gaming

## When to use / When NOT
- Use when: enforcing player protection limits.
- NOT for: jurisdiction certification paperwork (→ `comp-rtp-certification`, out of MVP scope).

## Default stack (+ escape hatch)
`scripts/responsible-gaming.mjs` + a server clock. Other stacks: enforce at the transaction/DB layer.

## Process
1. Enforce ALL limits server-side, at the transaction layer, before accepting the bet/deposit.
2. Time-based limits use an authoritative, monotonic server clock — never device time.
3. Reality checks and break intervals are configurable; limit increases require a cool-off.
4. Surface a breach as a named server error at the bet/launch boundary (e.g. `PlayLimitExceededError` / `UserNotPermitted`); the client only renders a neutral restriction overlay with the server's message — it never computes or re-derives the limit (C13).

## Correctness constraints
- **C13:** Enforce limits server-side against an authoritative, time-synced server clock; hard-block at the transaction/DB layer; never trust device time. The single root cause of clock-manipulation / losing-bet-edit / interception bypasses is trusting client values — server authority neutralizes it. For elapsed-time limits use a monotonic server clock (NTP precision matters only for absolute cut-offs).

## Pitfalls / red flags
Client-side limit enforcement (C13); trusting client timestamps; allowing limit increases without cool-off/reauth; limits less prominent than promotions.

## Verification
`scripts/econ-comp.test.mjs`: session/loss/deposit boundaries; clock-manipulation (now<start) rejected.
