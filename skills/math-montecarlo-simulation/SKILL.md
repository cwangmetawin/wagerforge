---
name: math-montecarlo-simulation
description: Use when empirically estimating a game's RTP, volatility, or hit frequency by simulation, and deciding how many spins are enough. Keywords Monte Carlo, simulation, convergence, confidence interval, variance.
constraints: C4
---

# math-montecarlo-simulation

## When to use / When NOT
- Use when: running large-N simulations and reporting RTP with confidence bands.
- NOT for: the closed-form model (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `monteCarlo`/`requiredN`, sampling from `fair-rng.mjs` for reproducibility. Other stacks: same CI math.

## Process
1. Drive trials from a seeded RNG so runs are reproducible.
2. Report mean (RTP), variance, hit frequency, and the 95% CI (`ciHalfWidth = 1.96·sd/√n`).
3. Choose N with `requiredN(sdPerSpin, tolerance)` — size to a target CI, not a round number.

## Correctness constraints
- **C4:** "1M spins is sufficient" is FALSE. Sufficiency is a CI-width property: half-width `= 1.96·SD_perSpin/√N`. High-volatility games need 5M–10^9 spins to reach a tight tolerance. Accept only when the declared RTP lies within the simulated CI at the required confidence.

## Pitfalls / red flags
Fixed "1M = done" (C4); unseeded/non-reproducible sims; ignoring volatility when sizing N; peeking and stopping early.

## Verification
`monteCarlo` exact-stats test on a deterministic sample; `requiredN` formula test.
