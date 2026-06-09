---
name: comp-math-cert-report
description: Use when generating the lab-ready math certification report - RTP, max win, volatility, and simulation evidence. Keywords math cert report, certification evidence, max win, RTP report.
constraints: C4
---

# comp-math-cert-report

## When to use / When NOT
- Use when: assembling the artifact a third-party lab (GLI/iTech/BMM/eCOGRA) signs off — theoretical RTP, max win, volatility, hit frequency, plus simulation evidence with CIs.
- Do NOT use for: deriving RTP (→ `math-rtp-modeling`); running the sim engine (→ `math-montecarlo-simulation`); empirical implementation checks (→ `qa-math-validation`).

## Default stack (+ escape hatch)
Theoretical figures from `math-rtp-modeling`; sim figures + CIs from `math-montecarlo-simulation`. It only marshals them. Other stacks: same evidence + CI-acceptance rule, container differs.

## Process
1. **Theoretical block.** State `RTP = Σ p·payout`, `houseEdge = 1 − RTP`, max win (multiplier from the maximal payout path, incl. capped/free-game caps), volatility (SD of per-spin return, ALL outcomes), hit frequency — each closed-form, not a sample.
2. **Simulation evidence.** Report N, mean RTP, SD, and two-sided CI half-width `1.96*SD_perSpin/sqrt(N)` (95%) / 2.576 (99%) — a convergence proof at the stated confidence, not a raw spin count. A GDK-style runner (`npx slotify-gdk stats … --variant=…`) emits a `CL: ±X%` line: quote it, confirm it tightens with N (±0.31% at 100M → ±0.063% at 2B), not your own.
3. **Acceptance gate.** Accept only when the declared theoretical RTP lies inside the simulated CI at the required confidence (C4). If outside, model and implementation disagree — fail; don't pad N.
4. **Max-win + volatility evidence.** Attach per-path max-win reachability (`Maxwin Cap Hit Rate: 1 in N`; `1 in ∞` = unreachable, max win reached only via the hitting path) plus a payout-distribution table — its loss bucket (`[0–0.5]`, ~90%) proves zero-payouts stayed in the SD.
5. **Cross-game comparison table** — one row per title:

   | Game | RTP % | House edge % | Max multiplier | Bet limits |
   |------|-------|--------------|----------------|------------|
   | …    | …     | …            | …×             | min–max    |

6. Run and report **per certified variant** (e.g. `rtp96`/`rtp97`/`rtp98`); config `rtpValues` are documentary/not-enforced, so each figure comes from a fresh sim, not the config string.
7. Attach the RNG-cert reference and seed/config hash for reproducibility.

## Correctness constraints
- **C4:** A fixed "1M spins" is NOT sufficient. Sufficiency is a CI-width property: half-width = `1.96*SD_perSpin/sqrt(N)`. High-volatility games need 5M–1e9 spins to tighten the interval. Accept ONLY when the declared RTP lies within the simulated CI at the required confidence — target half-width plus the in-CI check, not hardcoded N.

## Pitfalls / red flags
- Citing a raw spin count as "proof", not a CI half-width (C4).
- Dropping zero-payout outcomes from the volatility/SD calc.
- Reporting mean RTP without N, SD, confidence level.
- Quoting `rtpValues` from config not a fresh sim; max win ignoring caps or the maximal multi-feature path.
- Comparison table missing bet limits or house edge — labs reject incomplete rows.

## Verification
- Half-width recomputed from reported N and SD matches the CI.
- Declared theoretical RTP is inside that CI at the stated confidence.
- Run reproducible from the seed/config hash; figures match `math-rtp-modeling` closed-form.
