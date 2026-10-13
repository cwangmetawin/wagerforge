---
name: comp-self-exclusion
description: Use when integrating self-exclusion registers or enforcing exclusion at registration, login, deposit and bet boundaries. Keywords self-exclusion, GamStop, UNKNOWN register result, exclusion expiry, periodic scan, egress allowlist.
---

# comp-self-exclusion

> **Core insight:** UNKNOWN is not clearance: validate exclusion records, then enforce the verdict at every entry and money gate; predicate tests cannot prove provider or transaction integration.

## When to use / When NOT
- Use for: local exclusion records and external register adapters, including GamStop.
- NOT for: session/loss limits (`comp-responsible-gaming`), financial vulnerability (`comp-affordability`) or audit retention (`comp-audit-and-privacy`).

## Process
1. **Normalize verdicts.** Distinguish excluded, valid clearance and UNKNOWN. Timeouts, provider errors, stale results and malformed responses block acceptance. Never turn unavailable register data into an empty exclusion list.
2. **Validate first.** Check player identity, authoritative timestamps, complete exclusion records and amounts before comparison. Money gates use exact currency atoms. MetaWin's production server (MSS) `common/settlementModule/money.ts` `majorToAtoms` demonstrates rejecting invalid/off-grid money; it supplies no register integration.
3. **Use predicates accurately.** `scripts/self-exclusion.mjs` exports `isSelfExcluded` and `shouldBlockBet` for `{playerId, exclusions, asOfMs, maxAgeMs, nowMs}`: `asOfMs` is when the register answered, and missing, future-dated or stale answers throw, so a failed lookup turned into an empty list cannot clear a player. Times are epoch milliseconds. Each record needs a non-empty `playerId` and safe-integer `untilMs`, or explicit `null` for indefinite exclusion. `nowMs` is a non-negative safe integer; finite expiry blocks while `nowMs<untilMs`. The entire list is validated; malformed input throws. The script does not call a provider or enforce a transaction.
4. **Wire every gate.** Registration, login, deposit and bet consume the server verdict. Bind its version/freshness to acceptance; recheck queued money actions before debit and invalidate clearance when exclusion changes mid-session. Treat thrown validation/provider failures as refusal. The client displays the restriction without deciding eligibility.
5. **Verify network requirements.** If the verified provider contract requires egress allowlisting, register every active/failover egress address. `egressIpWhitelisted({ip,whitelist})` tests exact string membership only; it does not observe real traffic or reject HTTP calls. GamStop-specific network requirements and scan/response timings are (unverified).
6. **Retain scan evidence.** Configure rescans from sourced scheme requirements; record run id, authoritative time, provider status, policy version and enforcement result durably. Retry UNKNOWN checks without accepting the blocked action; require valid fresh clearance before resuming. Display neutral exclusion information without promotional nudges.

## Pitfalls / red flags
Missing expiry interpreted as expired; invalid records hidden after an earlier match; UNKNOWN converted to clear; signup-only checks; untested failover egress; predicate coverage advertised as end-to-end enforcement.

## Verification
- `scripts/self-exclusion.test.mjs` covers record-window, malformed-input and whitelist predicates only.
- Add integration tests for all four gates, timeout/UNKNOWN/invalid results, mid-session changes, queued/concurrent bets, real egress/failover rejection, scan scheduling, durable logs and restart recovery. Prove refusal prevents acceptance/debit and no stale clearance permits play.
