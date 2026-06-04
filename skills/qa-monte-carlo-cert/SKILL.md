---
name: qa-monte-carlo-cert
description: Use when building the statistical simulation and certification layer for a game math model - large-N Monte-Carlo through the real game code with a convergence proof and golden math tests. Keywords Monte Carlo certification, simulation harness, convergence, golden math.
constraints: C4
---

# qa-monte-carlo-cert

## When to use / When NOT
- Use when: certifying a math model by simulating millions of spins through the REAL game code and proving RTP convergence, plus the golden math test suite.
- NOT for: deriving theoretical RTP from a model (→ `math-rtp-modeling`); raw simulation utilities (→ `math-montecarlo-simulation`); RNG statistical fitness like NIST/chi-square (→ `qa-rng-statistical`); invariant/paytable assertions alone (→ `qa-math-validation`).

## Default stack (+ escape hatch)
Default: TS + Node + Vitest; a stats module (RTP/variance/hit-frequency, multi-core map/reduce) plus a record/replay RNG decorator wrapping the injectable RNG boundary. Other stacks: keep the same two pieces — a stats accumulator and a deterministic seedable RNG; drive spins through the production resolve path, never a re-implementation. wagerforge OWNS this layer; no client-side simulator exists in the wild.

## Process
1. Compute the THEORETICAL EV by enumerating every paytable combination (closed form). This is the target.
2. Run the SIMULATION in parallel through the actual game code with a seeded RNG; accumulate RTP and per-spin variance.
3. Compare theoretical vs simulated: a gap beyond CI flags a design-vs-implementation mismatch (off-by-one, float precision, dropped outcome). Fix the code, not the test.
4. Size N from the convergence target, not a fixed count: half-width = 1.96·SD_perSpin/√N. Solve N for the required CI width at the stated confidence.
5. Accept ONLY when the declared RTP lies inside the simulated CI at that confidence. Log seeds and entropy or certification fails.
6. Gold template: a binomial-EV math test — assert the outcome distribution sums to 1, EV within band, then a large-sample Monte-Carlo distribution check.

## Correctness constraints
- **C4:** A fixed "1M spins" is NOT sufficient; sufficiency is a CI-width property, not a spin count. Half-width = 1.96·SD_perSpin/√N. High-volatility games need 5M to 1e9 spins. Accept only when the declared RTP lies within the simulated CI at the required confidence — derive minimum N from SD_perSpin and the target CI width, never assert a hardcoded N.

## Pitfalls / red flags
- "1M spins = done" — refuted; size N from volatility and CI width (C4).
- Simulating a re-implementation instead of the real resolve path — hides the exact mismatch you are certifying against.
- Dropping zero-payout (losing) spins from variance, understating SD and N.
- Unseeded or unlogged RNG — runs are non-reproducible and fail certification.
- Reporting a point RTP with no CI; calling agreement "close enough" by eye.

## Verification
- Theoretical EV (closed-form enumeration) and simulated RTP agree within the CI at the stated confidence.
- N is shown to satisfy half-width = 1.96·SD_perSpin/√N for the declared confidence and target width.
- Golden tests pass: distribution sums to 1, EV in band, large-N Monte-Carlo distribution matches.
- Seeds and entropy are logged; a replay of the same seeds reproduces results byte-for-byte.
