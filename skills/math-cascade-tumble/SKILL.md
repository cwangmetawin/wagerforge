---
name: math-cascade-tumble
description: Use when agents model cascade, avalanche, or tumble wave loops, multiplier encoding, persistent feature state, retrigger caps, rejection retries, and session RTP estimates.
metadata:
  constraints: C6
---

# math-cascade-tumble
> **Core insight:** STEP multipliers compound; ABSOLUTE wave multipliers do not. Preserve the full session state and estimate path-dependent RTP with validated Monte-Carlo and confidence intervals.

## When to use / When NOT

- Use for iterative win/remove/gravity/refill chains, growing multipliers, retriggers, and feature caps.
- Not for evaluator selection (see `math-lines-ways-cluster`) or generic statistical acceptance (see `math-montecarlo-simulation`).

## Process

1. Trace the production outcome source and resolved variant/action. One wave evaluates wins, removes the specified cells, applies gravity, and refills from the actual drop distribution. Preserve scatter, sticky-symbol, grid, and multiplier state according to the game's rules.
2. Declare multiplier encoding and timing. `scripts/tumble.mjs` `cascadeTotal(waves)` accepts STEP factors and compounds them; `cascadeTotalAbsolute(waves)` accepts ABSOLUTE wave multipliers and sums `win×multiplier`. Unit wins with `[1,2,4]` give 11 versus 7. For money use `cascadeTotalAtoms` / `cascadeTotalAbsoluteAtoms`: BigInt atom wins at the game's money resolution, decimal-string multipliers, and by default each wave rounded half-up, as MSS `games/zeus/gameLogic.ts` `fixValue` rounds each wave to cents. MetaWin's production server (MSS) `games/zeus/gameLogic.ts` `loadBaseGame` uses an absolute wave ladder. Never convert implicitly or multiply already-resolved payouts again; separately identify awards exempt from the wave multiplier.
3. Iterate until no eligible win or the configured terminal cap. Carry current state and accumulated awards, snapshot response arrays at mutable boundaries, and isolate rejected attempts. A retry budget and its rejection scope are math inputs: MSS `games/perseus/gamePlay.ts` `playMain` redraws a rejected base outcome once; MSS `games/perseus/gameLogic.ts` `loadFreeGames` redraws a feature once with discard disabled. Do not model either as unlimited rejection; see `math-volatility-tuning`.
4. Distinguish awarded free games from played free games. Clamp new awards against `maxRounds−awarded`, then play pending awards; reaching the award cap stops further awards, not play. MSS `games/cowAbduction/gameLogic.ts` `loadFreeGames` follows this rule; max win may terminate the feature early.
5. Simulate complete paid rounds, including every cascade and free-game continuation, using actual stake/cap/rounding rules and exact integer atoms for settlement. `simulateCascadeRTP(roundFn,n,opts)` delegates to `monteCarlo`; supply normalized gross return per trial. Report mean, variance, confidence interval, sample size, configuration identity, and tail coverage. Monte-Carlo is an estimate, not an exact RTP.

## Correctness constraints

- **C6:** A geometric/retrigger shortcut is exact only for subcritical (`p·R<1`), iid, non-path-dependent structure. Growing multipliers, persistent symbols, or caps invalidate that shortcut; require validated Monte-Carlo with confidence intervals and adequate sample size near criticality.

## Pitfalls / red flags

- Compounding an absolute ladder, repricing past waves with the final multiplier, or using cosmetic strips as the refill model.
- Skipping retry limits, terminating when rounds are awarded, or sharing live arrays with historical responses.
- Calling a narrow interval proof of model correctness or missing rare capped outcomes.

## Verification

- Check STEP/ABSOLUTE totals, removal/refill ordering, state snapshots, retry exhaustion, and capped retriggers with deterministic fixtures.
- Compare a qualifying iid subcritical control with its geometric expectation; validate the complete path-dependent model against `math-montecarlo-simulation` acceptance criteria.
