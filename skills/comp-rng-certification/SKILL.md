---
name: comp-rng-certification
description: Use when preparing RNG certification - CSPRNG selection, entropy sourcing, and GLI-19/WLA-SCS requirements. Keywords RNG certification, GLI-19, WLA-SCS, NIST 800-90, entropy.
constraints: C5,C12
---

# comp-rng-certification

## When to use / When NOT
- Use when: selecting an RNG, sourcing entropy, or assembling the evidence pack (source review, seeding audit, field-vs-theoretical RTP) for an accredited lab.
- NOT for: deriving theoretical RTP (→ `math-rtp-modeling`); player-verifiable commit/reveal (→ `fair-verify`); live RTP drift monitoring (→ `comp-rtp-certification`).

## Default stack (+ escape hatch)
Default: a CSPRNG (OS-provided or a NIST SP 800-90A DRBG) seeded from a high-entropy source, with an injectable RNG boundary for deterministic replay. Other stacks: keep the same property — unpredictability/non-determinism — and a recorded seed audit; map your DRBG/entropy modules onto the 800-90A/B/C roles below.

## Process
1. **Frame the requirement as a PROPERTY.** The certifiable claim is unpredictability/non-determinism, demonstrated to an accredited lab (GLI/iTech/BMM/eCOGRA) under GLI-19 / WLA-SCS — not "we use algorithm X". Document which property each control provides.
2. **Choose a CSPRNG; never a statistical PRNG.** Use an OS CSPRNG or an 800-90A DRBG. Seed it from a real entropy source (800-90B); document the assembly (800-90C).
3. **Audit the seed.** Show entropy source, seed length, reseed policy, and that seeds are never logged, predictable, or attacker-recoverable.
4. **Produce field-vs-theoretical RTP.** Compare live results to the modeled RTP at 95% / 99% confidence intervals.
5. **Assemble the evidence pack:** source-code review, seeding audit, statistical test results (NIST SP 800-22), field-vs-theoretical RTP. Apply Bonferroni when running 15+ tests.

## Correctness constraints
- **C5:** Mersenne-Twister is cryptographically broken for real money — its full internal state is recoverable from ~624 consecutive outputs; require a CSPRNG. ISO/IEC 17025 accredits the LAB, not the RNG; the RNG requirements come from GLI-19 / WLA-SCS and mandate PROPERTIES (unpredictability/non-determinism), not a named algorithm. Apply a Bonferroni correction whenever running 15 or more statistical tests.
- **C12:** The real fault is a non-CSPRNG or a recoverable/predictable seed — NOT a lack of reseeding between bets; a stateless `HMAC(serverSeed, clientSeed || nonce)` is secure. NIST roles split as: 800-90A = DRBG, 800-90B = entropy source, 800-90C = assembly. Cite the correct one per claim.

## Pitfalls / red flags
- Naming an algorithm as if it were the requirement (it is a property — C5).
- Citing ISO/IEC 17025 as an RNG standard (it accredits the lab — C5).
- "We reseed every bet, so we're fine" while using a non-CSPRNG or logged seed (C12).
- Self-certification: tier-1 regulators require a third-party lab.
- Reporting many statistical tests without Bonferroni (false positives — C5).

## Verification
- Accredited-lab sign-off referencing GLI-19 / WLA-SCS.
- Seed audit proves seeds are unlogged and non-recoverable.
- NIST SP 800-22 suite passes on a large sample, Bonferroni-corrected at 15+ tests.
- Field RTP sits within the 95% / 99% CI of theoretical RTP.
