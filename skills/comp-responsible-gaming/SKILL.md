---
name: comp-responsible-gaming
description: Use when implementing server-side responsible-gaming deposit, loss or session limits, reality checks, cooling periods, or protection gates. Keywords responsible gaming, deposit limit, loss limit, session limit, monotonic clock, exact atoms.
metadata:
  constraints: C13
---

# comp-responsible-gaming

> **Core insight:** A protection predicate becomes a money control only when validated server inputs, exact currency atoms and the limit update share the acceptance transaction.

## When to use / When NOT
- Use for: deposit/loss/session controls and their acceptance boundaries.
- NOT for: register integration (`comp-self-exclusion`), vulnerability assessment (`comp-affordability`) or certification (`comp-rtp-certification`).

## Process
1. **Define policy inputs.** Keep gross deposits, settled gaming losses and reserved stakes separate. Specify currency, rolling windows, limit-change cooling rules, reality checks and breaks from versioned requirements. Regulatory intervals are (unverified) here.
2. **Validate before comparison.** Reject missing/non-finite/off-grid money inputs, negative stakes/limits and invalid timestamps. Parse amounts individually into exact currency atoms before adding. MetaWin's production server (MSS) `common/settlementModule/money.ts` `majorToAtoms` rejects invalid/off-grid input. WF `scripts/money.mjs` `toAtoms` returns BigInt or throws; it never rounds.
3. **Use appropriate clocks.** Sessions use monotonic elapsed time; absolute deadlines/calendar windows use synchronized authoritative server time. Preserve session accounting across reconnect/restart; never compare timestamps from different monotonic origins. Device values cannot authorize acceptance. Missing or invalid session state refuses the bet (fail closed).
4. **Know the reference scope.** `scripts/responsible-gaming.mjs` exports `sessionExceeded` (safe-integer monotonic milliseconds, blocks at `>=`), `lossLimitBlocks` and `depositLimitBlocks` (non-negative BigInt atoms, block only at `>`). Invalid input throws. These predicates perform no DB writes, rolling aggregation or exposure reservation. Define how signed gaming net loss maps to the non-negative `lossSoFar` input.
5. **Enforce atomically.** Check the authoritative limit/account state and reserve/update usage with acceptance and ledger writes in one transaction. Concurrent requests must not each spend the same remaining allowance. Exceptions, UNKNOWN exclusion results and invalid records block acceptance; use `comp-self-exclusion` for register policy.
6. **Report the decision.** Return a named server refusal and neutral client message. Apply configured cooling/review rules before activating limit increases; preserve evidence of policy/version and effective time.

## Correctness constraints
- **C13:** Hard-block at the server transaction/DB boundary using authoritative inputs. Use monotonic server time for elapsed limits and synchronized server time for absolute cut-offs; never trust client timestamps or client-calculated usage.

## Pitfalls / red flags
Check-then-write races; catching validation errors as permission; float cap comparisons; mixing clock origins; claiming a boolean helper enforces transactions.

## Verification
- `scripts/responsible-gaming.test.mjs` proves predicate validation and boundaries only, including exact-cap atoms and clock rollback.
- Integration evidence must cover concurrent deposits/bets, window rollover, queued actions, reconnect/restart, limit changes and mid-session exclusion/provider failure. Assert refusals accept no stake and produce no debit; accepted usage and ledger updates remain consistent.
