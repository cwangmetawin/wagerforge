---
name: econ-ab-testing
description: Use when A/B testing game parameters - pre-validating with simulation, sizing the test, and avoiding peeking. Keywords A/B test, experiment, sample size, Bonferroni, peeking.
constraints: C4
---

# econ-ab-testing

## When to use / When NOT
- Use when: designing an A/B test on a game parameter (RTP, volatility, trigger odds, bet multiplier), sizing it, or pre-validating the variant by simulation.
- NOT for: theoretical RTP impact of a weight change (→ `math-rtp-modeling`); building the simulator itself (→ `math-montecarlo-simulation`); generic experiment plumbing (→ `wagerforge:*`).

## Default stack (+ escape hatch)
Monte-Carlo via `math-montecarlo-simulation`; the power/sample-size calc is a thin from-scratch helper (no off-the-shelf wagerforge skill) computing `N = 2·(z_α/2 + z_β)²·σ² / Δ²` per arm. Real-repo grounding: cohort assignment rides Statsig (`@statsig/js-client`, host `useFeatureFlag`→`checkGate`); a variant ships via the one-bundle→N-RTP-SKU pipeline keyed by `gameCode` (`build-deploy-and-rtp-variant`). Statsig is used gate-only (`checkGate`), not `getExperiment`/`getDynamicConfig` — run the analysis in your own stats layer over the simulator, not inside the flag tool. Other stacks: same N formula; map "spin" → your unit-of-conversion event; map gate → your cohort router.

## Process
1. **Pre-validate the variant.** Simulate the changed parameter until the CI half-width drops below tolerance at the required confidence (`1.96·SD_perSpin/sqrt(N) < tolerance`) — the spins needed scale with the variant's volatility, so size N to the interval, never a round number (C4). Reject any variant whose declared RTP falls outside the converged simulated CI before it ever reaches players.
2. **Isolate one effect.** Volatility and RTP are orthogonal to each other and to hit frequency. Change RTP OR volatility per arm, never both — a confounded arm is uninterpretable.
3. **Size up front.** Fix the sample size from `α=0.05, power=0.80` and the minimum detectable effect. Compute N (and runtime) before launch.
4. **No peeking.** Do not look at significance until N is reached; sequential glances inflate the false-positive rate. Use a sequential/group-sequential design only if pre-registered.
5. **Correct for multiplicity.** Testing several metrics or arms → apply Bonferroni (or FDR) to the threshold.
6. **Block confounds.** Account for time-of-week, seasonal, and channel/geo/device effects (randomize or stratify); never compare arms run in different windows.

## Correctness constraints
- **C4:** A fixed "1M spins" is NOT sufficient. Sufficiency is a CI-width property: half-width = `1.96 · SD_perSpin / sqrt(N)`. High-volatility games need 5M to 1e9 spins to bound the interval. Accept a variant only when the declared RTP lies within the simulated CI at the required confidence — never on raw spin count alone.

## Pitfalls / red flags
- Trusting "1M spins" as proof (C4); peeking and stopping at first significance; confounding volatility with RTP changes; one threshold across many tests (forgetting Bonferroni/FDR); arms split across different time windows or channels; sizing the test after launch; assuming the flag tool (Statsig gates) computes significance for you — it only routes cohorts.

## Verification
- Power calc reproduces required N for the stated MDE/α/power; simulated CI half-width is below tolerance at the declared confidence; variant's RTP sits inside that CI; analysis runs once, at the pre-set N, with the corrected significance threshold.
