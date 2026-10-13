---
name: math-cascade-tumble
description: Use when agents model cascade, avalanche, or tumble wave loops, free-spin retriggers with growing or persistent multipliers, geometric or branching retrigger formulas, multiplier encoding, persistent feature state, retrigger caps, rejection retries, and session RTP estimates.
metadata:
  constraints: C6
---

# math-cascade-tumble
> **Core insight:** STEP multipliers compound; ABSOLUTE wave multipliers do not. Preserve the full session state and estimate path-dependent RTP with validated Monte-Carlo and confidence intervals.

## When to use / When NOT

- Use for iterative win/remove/gravity/refill chains, growing multipliers, retriggers, and feature caps.
- Not for evaluator selection (see `math-lines-ways-cluster`) or generic statistical acceptance (see `math-montecarlo-simulation`).
- For tiers, orbs, blasts, quotas, chests and meters, see `math-cascade-modifiers`.

## Process

1. Trace production source and resolved variant/action. Each wave: wins, eligible-cell removal, gravity, refill from actual drop distribution. Preserve scatter/sticky-symbol/grid/multiplier state per rules.
2. Declare multiplier encoding and timing. `scripts/tumble.mjs` `cascadeTotal(waves)` accepts STEP factors and compounds them; `cascadeTotalAbsolute(waves)` accepts ABSOLUTE wave multipliers and sums `win×multiplier`. Unit wins with `[1,2,4]` give 11 versus 7. For money use `cascadeTotalAtoms` / `cascadeTotalAbsoluteAtoms`: BigInt atom wins at the game's money resolution, decimal-string multipliers, and by default each wave rounded half-up where MetaWin's production server (MSS) `games/zeus/gameLogic.ts` `fixValue` rounds each wave to cents. Its `loadBaseGame` ladder is ABSOLUTE integers: that fixes the point, not the mode; `toFixed` rounds the binary double. Never convert implicitly or multiply already-resolved payouts again; separately identify awards exempt from the wave multiplier.
3. Iterate until no eligible win or terminal cap. Carry state/awards, snapshot responses at mutable boundaries, isolate rejected attempts. Retry budget/scope are math inputs: MSS `games/perseus/gamePlay.ts` `playMain` redraws rejected base outcomes once; `games/perseus/gameLogic.ts` `loadFreeGames` redraws features once with discard disabled. Never assume unlimited rejection; see `math-volatility-tuning`.
4. Distinguish awarded from played free games. Clamp awards against `maxRounds−awarded`, then play pending awards; award caps stop awarding, not play. MSS `games/cowAbduction/gameLogic.ts` `loadFreeGames` follows this; max win may end it early.
   With one state-independent offspring/reward law below depth D, solve `E_d=a+ρE_(d+1)` (a: expected direct reward; ρ: expected offspring) from terminal expectation `E_D`, not `a/(1−ρ)`. MSS `games/fruitMachine/gameLogic.ts` `resolveLanding` stops offspring at D=64 but keeps direct payouts. Justify depth-only continuation values (C6). Verify boundaries/retriggers; reprice rounded weights against the bounded recurrence.
5. Simulate complete paid rounds (every cascade and free-game continuation) with actual stake/cap/rounding rules and exact integer settlement atoms. `simulateCascadeRTP(roundFn,n,opts)` delegates to `monteCarlo`; supply normalized gross return per trial. Report mean, variance, confidence interval, sample size, configuration identity, and tail coverage. Monte-Carlo is an estimate, not an exact RTP.

## Correctness constraints

- **C6:** A simple retrigger-variance shortcut is exact only for subcritical (`p·R<1`), iid, non-path-dependent structure with finite offspring/reward second moments. `p·R<1` alone does not make multiplier-weighted reward moments finite. Model relevant multiplier, trigger-chance, persistent-symbol and cap state; averages need proof. Exact recursion needs sufficient Markov state (possibly infinite), exact joint transitions/rewards and justified termination/moments: for remaining reward G, `V1(s)=E[G|s]`, `V2(s)=E[G²|s]=E[r²+2r·V1(s′)+V2(s′)|s]` (r: step reward). Otherwise validate complete-feature Monte-Carlo: justified CIs, tail/termination checks, enough samples near criticality.

## Pitfalls / red flags

- Compounding an absolute ladder, repricing past waves with the final multiplier, or refilling from cosmetic strips.
- Skipping retry limits, terminating when rounds are awarded, or sharing live arrays with historical responses.
- Calling a narrow interval proof of model correctness or missing rare capped outcomes.

## Verification

- Check STEP/ABSOLUTE totals, removal/refill ordering, state snapshots, retry exhaustion, and capped retriggers with deterministic fixtures.
- Compare a qualifying iid subcritical control with its geometric expectation; validate the complete path-dependent model against `math-montecarlo-simulation` acceptance criteria.
