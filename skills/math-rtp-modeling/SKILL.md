---
name: math-rtp-modeling
description: Use when modeling, computing, or tuning a slot or game's RTP and house edge from reel strips, paytables, and symbol weights — or estimating how a weight change moves RTP. Keywords RTP, house edge, reel weights, paytable, hit frequency.
constraints: C1
---

# math-rtp-modeling

## When to use / When NOT
- Use when: deriving RTP/house-edge/hit-frequency from a model, or estimating a weight change's RTP impact.
- NOT for: empirically validating an implementation (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `rtpFromOutcomes`. Other stacks: same `RTP = Σ P(outcome)·payout`; build outcomes from reel-weight products.

## Process
1. Enumerate outcomes (or their probabilities from reel-weight products) with payouts; `RTP = Σ p·payout`; `houseEdge = 1 − RTP`.
2. Variance includes ALL outcomes (losses too) — never drop zero payouts.
3. Weight change: recompute the full weighted RTP; do NOT scale proportionally.

## Correctness constraints
- **C1:** RTP is a MULTILINEAR function of per-reel probabilities. Changing one symbol's weight changes only the combinations using it (linearly per combination), and reel normalization simultaneously lowers every other symbol's contribution — so the net total-RTP move is small and can even be opposite-signed. Estimate via full weighted recomputation, weighted by EV/contribution share, NOT by fraction of wins.

## Pitfalls / red flags
Proportional-scaling intuition (C1); excluding losses from variance; conflating on-screen visibility weight with payline probability.

## Verification
`rtpFromOutcomes` closed-form tests; cross-check against `math-montecarlo-simulation`.
