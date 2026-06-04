---
name: qa-rng-statistical
description: Use when statistically testing an RNG - NIST SP 800-22, Diehard, TestU01, chi-square - and confirming it is a CSPRNG. Keywords NIST 800-22, Diehard, TestU01, chi-square, RNG test, CSPRNG.
constraints: C5,C8
---

# qa-rng-statistical

## When to use / When NOT
- Use when: running a statistical battery on an RNG stream and confirming the generator is a CSPRNG.
- NOT for: validating RTP/payout math (→ `qa-monte-carlo-cert` / `math-rtp-modeling`); deterministic seed/replay regression (→ `qa-fairness-verification`).

## Default stack (+ escape hatch)
NIST STS, Dieharder, TestU01 (SmallCrush/Crush/BigCrush) over raw uint32 output. Other stacks: same battery on any binary stream; map "p-value pass" → your suite's report verdict.

## Process
1. Capture a long contiguous output stream (millions of uint32s; BigCrush wants ~10^11 bits) — never re-seed mid-stream.
2. Run the full multi-suite battery: NIST SP 800-22 AND Diehard AND TestU01. ALL must pass; one suite is not a substitute for another.
3. Set significance α=0.05 (use α=0.01 for high-stakes). When running 15+ tests, apply a Bonferroni correction so the family-wise false-positive rate stays controlled.
4. Add a chi-square test over the FINAL integer mapping (the player-facing range), not just raw output — this is the empirical uniformity guard.
5. A single Diehard/chi-square failure is a signal to INVESTIGATE (re-run on a fresh independent stream, check the mapping), not to ignore and not to auto-fail.
6. Confirm the generator is a CSPRNG by property, not by passing tests alone (passing batteries ≠ cryptographic security).

## Correctness constraints
- **C5:** Mersenne-Twister is cryptographically broken for real money — full internal state is recoverable from ~624 consecutive outputs, making future and past outputs predictable; require a CSPRNG (e.g. ChaCha20, Fortuna, `/dev/urandom`). ISO/IEC 17025 accredits the LAB, not the RNG; the RNG requirements come from GLI-19 / WLA-SCS and mandate PROPERTIES (unpredictability / non-determinism), not a named algorithm. Apply Bonferroni when running 15+ statistical tests.
- **C8:** Modulo bias is negligible (~1e-8) when reducing a full 32-bit-or-larger value, and exactly zero for power-of-two ranges; it is NOT a meaningful real-money flaw on its own. The correct fix when it does matter is rejection sampling, not "avoid modulo." Statistical uniformity (chi-square) is the empirical guard for the integer mapping.

## Pitfalls / red flags
- Treating α=0.05 as a hard pass/fail gate, or skipping Bonferroni at 15+ tests.
- Passing one suite and declaring victory; CSPRNG claimed from test passes alone (C5).
- MT19937 / `Math.random` / LCG in a money path (C5).
- Re-seeding mid-stream, or testing raw output but never the player-facing integer mapping (C8).
- Auto-failing on a lone Diehard/chi-square miss instead of investigating.

## Verification
- All three suites report pass at the chosen α (Bonferroni-adjusted for 15+ tests); chi-square on the integer mapping is non-significant; the generator is a documented CSPRNG with an unpredictability/non-determinism rationale, not just a battery printout.
