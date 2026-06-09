---
name: math-plinko-lottery
description: Use when computing the Plinko two-axis economy (E[bucket] times E[ball]) or discrete-distribution lottery paytables - keno (hypergeometric), diamonds (gem partition), blitz (birthday paradox), wheel (weighted slots), loot-box cases/packs (multiplier x probability). Keywords plinko, keno, hypergeometric, two-axis, lottery paytable, wheel, loot-box, case.
---

# math-plinko-lottery

## When to use / When NOT
- Use when: calibrating Plinko multiplier arrays to an RTP target, decomposing a two-axis (bucket x ball) economy, or building keno/diamonds/blitz paytables from a discrete distribution.
- NOT for: reel-strip slot RTP (→ `math-rtp-modeling`); constant-house-edge crash/dice/limbo or ladder games (→ those sibling skills); empirical validation (→ `math-montecarlo-simulation`).

## Default stack (+ escape hatch)
TS + Node + decimal.js; closed-form combinatorics, server-authoritative. Other stacks: same formulas — `C(n,k)` via a stable binomial, exact rationals where precision matters.

## Process
1. **Plinko bucket axis.** `P(bucket k) = C(rows,k)/2^rows` (symmetric binomial). Multiplier array is hand-calibrated, not derived: choose symmetric `mult[k]`, then solve so `Σ P(k)·mult[k] = RTP`. The edge buckets carry the branded jackpot (e.g. 100000x) but have tiny probability.
2. **Plinko two-axis economy.** If an independent ball-multiplier axis exists, total EV factorizes: `E[total] = E[bucket]·E[ball]` only when the axes are independent. Split the RTP across axes (e.g. bucket axis tuned to 0.98/3, ball axis E=3, product = 0.98) so the headline jackpot can be large while RTP stays fixed.
3. **Keno (hypergeometric).** For `p` picks, `k` matches in a 10-draw / 40-ball game: `P(X=k) = C(p,k)·C(40-p,10-k)/C(40,10)`. Build the per-pick paytable so `Σ_k P(X=k)·pay[p][k] = RTP·bet`.
4. **Diamonds (gem partition).** Outcome probability = count of matching gem partitions / total partitions; pay each tier by its partition probability.
5. **Blitz (birthday paradox).** P(no collision drawing N cards from 52) = `∏_{i=0}^{N-1} (52-i)/52`; the collision payout uses `1 −` that product.
6. **Wheel / loot-box (discrete weighted slots).** A Wheel is `segments` equiprobable slots, most paying 0×, with one edge ≈ `segments·RTP`; calibrate so `Σ (1/segments)·mult[slot] = RTP` per (segments, risk). Loot-box cases/packs are the same shape with explicit weights: a `multiplier→probability` map (derive individual probs from a cumulative vector) with `Σ prob·mult = RTP`. Like Plinko, the multiplier values are calibrated, the slot/case probabilities are fixed.

## Pitfalls / red flags
- Treating `mult[k]` as derivable — it is calibrated; only the bucket probabilities are fixed by `C(rows,k)/2^rows`.
- Multiplying `E[bucket]·E[ball]` when the axes are correlated — factorization holds only under independence.
- Hypergeometric (draw without replacement) vs binomial (with replacement) — keno is hypergeometric; using binomial overstates high-match odds.
- Forgetting the `k=0` / no-win mass when summing the paytable to RTP.
- Float drift in `C(40,10)` and `2^rows` — use exact integers / decimal.js.

## Verification
- Plinko: `Σ P(k) = 1` and `Σ P(k)·mult[k] = RTP` to tolerance; two-axis product equals the single-axis RTP.
- Keno/diamonds/blitz: distribution sums to 1; realized RTP per pick-count within tolerance; cross-check against `math-montecarlo-simulation`.
