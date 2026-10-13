---
name: econ-ab-testing
description: Use when designing game A/B experiments, choosing analysis units, sizing cohorts, comparing payout distributions, or staging an economic rollout. Keywords A/B test, MDE, power, fingerprint, drain, multiplicity.
metadata:
  constraints: C4
---

# econ-ab-testing
> **Core insight:** A/B evidence depends on independent analysis units and validated payout distributions; raw spin counts, mean RTP alone, and cohort-routing tools cannot establish a safe or profitable treatment.

## When to use / When NOT

- Use for game-economy experiments involving retention, net margin, volatility, or feature frequency.
- Not for deriving game math (`math-rtp-modeling`) or establishing certification scope (`comp-rtp-certification`).

## Process

1. **Declare the experiment.** Specify treatment, primary metric, analysis unit, minimum detectable effect, confidence, power, duration, exclusions, and stopping rules. Use stable player assignment for player metrics; shared pools may require room-level assignment to prevent cross-arm interference. Repeated spins from one player are not independent players; use aggregation or cluster-aware inference.
2. **Validate math before exposure.** Resolve actual action/variant/stake/strategy through `econ-rtp-cost`; simulate complete paid rounds through `math-montecarlo-simulation`. Compare the whole distribution: hit/dead rates, SD, tail concentration, Gini, drain/ruin, and feature segments against declared sibling targets. MetaWin's production server (MSS) `common/stats/fingerprint.ts` `Fingerprint.processWagers` stores return histograms and unbinned moments; `tools/profile.js` `cmdFinalize` rejects stale sources. Check imported behavioral dependencies too: MSS `tools/fingerprint-wrapper.ts` `computeConfigHash` hashes only direct game-folder files. Regenerate after math changes; label intermediate and thin-tail evidence (fingerprint/drain analysis: `qa-game-fingerprints`).
3. **Size the correct unit.** For equal independent arms with common unit-level SD, approximate per-arm `n = 2*(z_(1-alpha/2)+z_(1-beta))^2*sigma_unit^2/MDE^2`. Player-metric power needs player-level variance, not per-spin SD. Account for clustering, attrition, unequal exposure, and heavy tails; do not substitute a simulator's round count for cohort size.
4. **Control inference.** Fix the test family and analysis schedule before launch. Bonferroni controls family-wise error; FDR controls a different quantity. Apply the selected adjusted threshold to decisions, not conflicting raw-p bands. Repeated significance checks require a predeclared sequential design; monitor money/safety guardrails continuously under separate stop rules.
5. **Stage the rollout.** Validate routing and assignment/exposure logs, then use a bounded cohort with a holdout and rollback criteria before expansion. Audit actual variant resolution, payout liabilities, and active-round continuity. Block channel/time/geo/device confounds. Vendor gates or SKU pipelines require implementation evidence before relying on them.

## Correctness constraints

- **C4:** Simulation sufficiency is CI half-width below tolerance at declared confidence, not a fixed number of spins. Under independent finite-variance rounds, half-width is approximately `z*SD/sqrt(N)`. Tolerance acceptance requires `abs(mean-target)+halfWidth <= tolerance`; target-in-CI alone is compatibility, not equivalence. Rare tails and correlation require justified sampling/inference.

## Pitfalls / red flags

Spin-level pseudoreplication; mean-only sign-off; stale fingerprints; undeclared coupled math changes; significance peeking; routing mistaken for analysis; unverified Statsig/SKU claims.

## Verification

Retain unit-level power inputs, fresh per-mode distribution evidence, assignment/exposure checks, adjusted decision thresholds, rollout guardrail results, and the prespecified final analysis. Use `qa-monte-carlo-cert` for simulation evidence.
