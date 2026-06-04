---
name: comp-math-cert-report
description: Use when generating the lab-ready math certification report - RTP, max win, volatility, and simulation evidence. Keywords math cert report, certification evidence, max win, RTP report.
constraints: C4
---

# comp-math-cert-report

## When to use / When NOT
- Use when: assembling the cert artifact a third-party lab (GLI/iTech/BMM/eCOGRA) signs off on — theoretical RTP, max win, volatility, hit frequency, plus simulation evidence with confidence intervals.
- Do NOT use for: deriving RTP from the model (→ `math-rtp-modeling`); running the sim engine itself (→ `math-montecarlo-simulation`); empirical implementation validation (→ `qa-math-validation`).

## Default stack (+ escape hatch)
Theoretical figures come from `math-rtp-modeling`; sim figures + CIs from `math-montecarlo-simulation`. This skill only marshals them into the report. Other stacks: same evidence, same CI-acceptance rule — only the document container changes.

## Process
1. **Theoretical block.** State `RTP = Σ p·payout`, `houseEdge = 1 − RTP`, max win (the multiplier from the maximal payout path, including capped/free-game caps), volatility (SD of per-spin return, ALL outcomes), and hit frequency. Each is a closed-form figure, not a sample.
2. **Simulation evidence.** Report N, mean RTP, SD, and the two-sided CI half-width `1.96*SD_perSpin/sqrt(N)` (95%) / 2.576 for 99%. This is a convergence proof at the stated confidence — never a raw spin count.
3. **Acceptance gate.** Accept only when the declared theoretical RTP lies inside the simulated CI at the required confidence (C4). If it falls outside, the model and implementation disagree — fail, do not pad N.
4. **Cross-game comparison table** (ready template): one row per title.

   | Game | RTP % | House edge % | Max multiplier | Bet limits |
   |------|-------|--------------|----------------|------------|
   | …    | …     | …            | …×             | min–max    |

5. Attach RNG-cert reference and the seed/config hash so the run is reproducible.

## Correctness constraints
- **C4:** A fixed "1M spins" is NOT sufficient. Sufficiency is a CI-width property: half-width = `1.96*SD_perSpin/sqrt(N)`. High-volatility games need 5M to 1e9 spins to tighten the interval. Accept the report ONLY when the declared RTP lies within the simulated CI at the required confidence — a target half-width and the in-CI check are the gate, never a hardcoded N.

## Pitfalls / red flags
- Citing a raw spin count as "proof" instead of a CI half-width (C4).
- Dropping zero-payout outcomes from the volatility/SD calc.
- Reporting mean RTP without N, SD, and confidence level.
- Max win that ignores caps (`maxWin`/free-game cap) or the maximal multi-feature path.
- Comparison table without bet limits or house edge — labs reject incomplete rows.

## Verification
- Half-width recomputed from reported N and SD matches the stated CI.
- Declared theoretical RTP is inside that CI at the stated confidence.
- Run is reproducible from the attached seed/config hash; figures match `math-rtp-modeling` closed-form.
