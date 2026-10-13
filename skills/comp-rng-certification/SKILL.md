---
name: comp-rng-certification
description: Use when selecting a real-money RNG, auditing entropy and seed secrecy, defining adversarial unpredictability claims, or preparing source, lifecycle and statistical evidence for an RNG certification review.
metadata:
  constraints: C5, C12
---

# comp-rng-certification

> **Core insight:** RNG assurance requires unpredictability against an adversary and evidence against input selection; deterministic replay is useful, while recoverable seeds or operator-selected inputs defeat the claim.

## When to use / When NOT

- Use when selecting/auditing an RNG or preparing certification evidence for its actual deployed configuration.
- NOT for theoretical RTP (`math-rtp-modeling`) or independent player verification (`fair-verify`). Neither simulation nor replay establishes certification.

## Process

1. **Define the threat and scope.** State what players or operators can observe, predict, recover or select; separate RNG unpredictability, input-selection resistance and outcome replay. Pin jurisdiction, lab, standard/edition and requested approval scope. External regulatory/lab requirements are unverified until supported; do not assert universal reseeding, sample sizes or named-algorithm approval.
2. **Select and trace the actual RNG.** Require a CSPRNG with documented entropy, state protection, initialization/reseed policy and failure behavior. Map the DRBG mechanism to NIST SP 800-90A, its entropy source to 800-90B and the construction to 800-90C; MT19937 fits none. A deterministic DRBG is not inherently defective. Audit production selection and every adapter, not merely the injectable function. Pin key/message encoding, extraction width, rejection cursor, draw limits/order, configuration, action, parameters and offset. The WF RNG is a standalone reference protocol, not automatic MSS compatibility. MetaWin's production server (MSS) `games/hitCrashers/fairness.ts` `takeoffDraw`/`proveFairness` reproduces 32 uint32 draws and an explicit offset/variant.
3. **Audit the disclosure boundary.** Seeds/state must remain unpredictable and unrecoverable until all dependent future outcomes retire; production must expose no live RNG/debug traces or undealt outcomes. MSS `games/blackjack-table-live/engine.ts` `Shoe.draw` draws from composition when needed; `games/blackjack-table-live/index.ts` `tick` rotates after the final draw, rather than at deal.
4. **Audit input selection separately.** Per-round `verify()` proves only the supplied tuple's outcome. Existing commit-before-client-seed, increment and no-reuse rules already forbid most attacks; round replay cannot detect skipped/reused/reordered nonces, server-selected client seeds or substituted commitments. Require player-kept commitments, fresh post-commit client entropy and complete allocation history (`fair-commit-reveal`, `fair-verify`). For chains, bind epoch/commitment, decoder/parameters and exact entropy event before an unpredictable contribution is revealed; forbid salt/chain re-selection or selective abort (`fair-hash-chain`).
5. **Choose the correct proof evidence.** Versioned metadata determines derivation, draw order/cursor, commitment scope and reveal boundary. Multiplayer can use streams, shoe ledgers, chains or signed authority reports. MSS `games/hitShooter/fairness.ts` `proveFairness` consumes zero draws: its signed reports are not RNG proof. Adapter replay and independent player verification are separate deliverables.

## Correctness constraints

- **C5:** Require CSPRNGs; MT19937's state is recoverable from about 624 outputs, which makes it unsuitable. ISO/IEC 17025 concerns lab accreditation, not RNG approval (external standard details unverified).
- **C12:** Non-CSPRNGs or predictable/recoverable seeds are defects, not missing per-bet reseeding. Stateless HMAC can be secure with protected unpredictable keys and fixed unique inputs. NIST 800-90A/B/C mapping: DRBG/entropy/construction (external editions/applicability unverified).

## Pitfalls / red flags

- Calling deterministic replay, statistical success, an algorithm name or server-returned proof certification.

## Verification

- Keep deployed source/configuration identity, seed/lifecycle audit, known-answer/draw-parity tests, preregistered statistical evidence and lab findings. Independent checks need player-kept evidence; missing evidence yields `UNVERIFIABLE`. Report lab approval only with its dated scope/artifact.
