---
name: qa-rng-statistical
description: Use when planning RNG statistical batteries, measuring detectable bias, testing integer reducers, or reviewing multiplicity and CSPRNG evidence. Keywords NIST SP 800-22, Diehard, TestU01, chi-square, RNG test, rejection sampling.
metadata:
  constraints: C5, C8
---

# qa-rng-statistical

> **Core insight:** A statistical pass means no departure detected at the stated sample size and power; it proves neither exact uniformity nor unpredictability. Reducer proofs and adversarial security evidence answer different questions.

## When to use / When NOT
- Use when: measuring distribution departures in raw entropy, derived streams and final outcome mappings.
- NOT for: RTP/payout validation (`qa-monte-carlo-cert`, `math-rtp-modeling`) or epoch/replay/privacy checks (`qa-fairness-verification`).

## Process
1. **Predeclare the experiment:** pin generator/version, production selection, stream format, source domain, intended alternative/effect size, sample size, power and hypothesis family. Choose suitable documented batteries (for example NIST SP 800-22, Diehard or TestU01); name versions and assumptions rather than imposing an unverified universal three-suite requirement.
2. **Control false alarms:** choose family-wise error rate (FWER) or false-discovery rate (FDR), and its correction before sampling. Bonferroni uses `alpha/m` for `m` tests at any family size. Raw p-value bands are descriptive; acceptance uses the adjusted rule. Predefine reruns/sequential stopping; never sample until green.
3. **Capture faithfully:** retain contiguous output, framing, byte order, sample provenance and seed/rotation boundaries. Test actual lifecycle behavior separately; document intentional reseeding instead of silently pooling incompatible streams.
4. **Prove the reducer:** for uniform integer source size `M=qR+t`, modulo residues have `q` or `q+1` preimages; bias is zero iff `t=0`. Total variation is `t(R-t)/(RM)`, potentially large when `R` approaches `M`. Use justified rejection for arbitrary ranges. MetaWin's production server (MSS) `common/rng/FloatSourcedIntegerRng.ts` `randomInteger` reduces to a power-of-two domain then rejects `>=limit`; its source must produce exact uniform uint32-grid values.
5. **Exhaust source values:** run `scripts/fair-reduction.test.mjs`, covering every one-byte value for all one-byte ranges and every two-byte value for selected ranges; prove wider-domain algebra and test boundaries/redraw consumption. The naive `byte % 6` control gives `[43,43,43,43,42,42]`; finite statistical samples can miss this bias.
6. **Supplement with statistics:** test raw output, final integer ranges and actual game distributions against their declared expected probabilities. Investigate departures under the predeclared plan. MSS `games/horse-pro/tests/race/test-race-fairness.ts` `simpleRng`/`chiSquaredTest` is a winner-distribution regression with an injected, per-race-reseeded LCG using `%limit`; it does not exercise the production RNG or rejection reducer.
7. **Assess unpredictability separately:** document entropy, state protection and resistance to an adversary predicting future outputs. Deterministic derivation is compatible with cryptographic security; passing batteries or naming an algorithm supplies no such proof.

## Correctness constraints
- **C5:** Require a CSPRNG with an adversarial unpredictability rationale; MT19937's state is recoverable from about 624 outputs. Statistical tests cannot certify security; lab accreditation and algorithm suitability require distinct evidence.
- **C8:** Bias depends on both source and target domains, not bit width alone. Exact uniformity needs reduction analysis/exhaustive checks; powered statistics are supplementary.

## Pitfalls / red flags
Uniformity or security inferred from p-values; arbitrary raw bands overriding multiplicity; test RNG mistaken for production RNG; uniform expectations imposed on weighted outcomes.

## Verification
Retain the predeclared plan, source/reducer proofs, exhaustive counts, battery versions, raw and adjusted results, power and investigation record. Report security and production integration evidence separately; an unexplained departure blocks sign-off.
