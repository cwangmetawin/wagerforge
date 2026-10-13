---
name: qa-regression-golden
description: Use when freezing canonical game results, detecting payout or RNG-call regressions, or validating strict request-by-request replay.
---

# qa-regression-golden
> **Core insight:** RNG sequences are replay inputs; a golden additionally freezes the expected canonical result and rejects changed draw limits, exhaustion, fallback and unused draws.

## When to use / When NOT

- Use for deterministic server-result regressions and reviewed math changes.
- Statistical convergence: `qa-monte-carlo-cert`; payout invariants: `qa-math-validation`; player fairness evidence: `qa-fairness-verification`.

## Process

1. Inject RNG at the real resolver boundary. Record each request's action, params, variant/resolved config, incoming state, stake and wallet grid, plus ordered draws and their requested limits. Capture purpose labels where available. Reconstruct continuation state from the preceding response.
2. Store replay input separately from expected canonical response, state, next actions and incremental payment. MetaWin's production server (MSS) `common/rng/TrackedRNG.ts` `createTrackedRNG` records inputs; `games/perseus/PerseusCheats.json` contains draw strings, not expected output assertions.
3. Require a strict adapter: validate finite integer draws in [0, limit), match every recorded limit and order, reject exhaustion immediately, forbid live-RNG fallback, and reject leftover input after each request. MSS `common/rng/TrackedRNG.ts` `createTrackedRNG` only logs over-limit values and falls back on exhaustion; `common/cheats/CheatFinder.ts` `holds` checks fallback and full consumption for non-pinned records. Pinned exceptions are insufficient for goldens.
4. Replay each request with its own sequence and correct action/state/variant; never reuse one whole-round stream for separate requests. MSS `common/cheats/CheatFinder.ts` `verifyCheat` carries base-response state into each follow-up. Freeze the limits explicitly; old value-only sequences cannot detect every range change.
5. Canonicalize without discarding economic meaning: stable keys, preserved array order, exact integer atoms for money, explicit types. Reject non-finite or unsupported values; JSON serialization can collapse NaN into null. Normalize nondeterministic transport fields explicitly; do not erase payout, state or variant differences.
6. Cover losses, boundary wins, max-win paths, features, buys, stopping policies and multi-step incremental payments. Keep boundary fixtures permanently; add cases after defects instead of arbitrary quarterly rotation.
7. Gate CI on exact canonical comparison. Intended behavior changes require explicit fixture regeneration and review of input/output diffs plus certification implications; never overwrite mismatches automatically.

## Pitfalls / red flags

Seed-only replay with changing draw order; cheat predicates accepted as output assertions; loose comparisons; undocumented canonicalization; production RNG or future-outcome traces exposed by test tooling.

## Verification

Run unchanged fixtures twice. Inject payout-only, requested-limit, extra-draw, missing-draw and unused-input changes; each relevant fixture must fail. Confirm request boundaries, zero payouts and complete state transitions are compared.

Golden replay proves reproducibility, not player fairness. `fair-verify` must use the player's pre-bet saved commitment, player-generated client seed and contiguous accepted-bet nonces; missing evidence is UNVERIFIABLE, never PASS.
