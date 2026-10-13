---
name: qa-fairness-verification
description: Use when testing provably-fair derivation, epoch history, nonce allocation, outcome mapping, engine/proof parity, or reveal privacy. Keywords KAT, fairness test, verifyEpoch, rejection sampling, selective abort.
metadata:
  constraints: C5, C8
---

# qa-fairness-verification

> **Core insight:** Round recomputation checks given inputs; fairness QA also tests their prior binding, complete epoch history, real engine/proof parity, and disclosure safety. Statistics prove neither exact uniformity nor unpredictability.

## When to use / When NOT
- Use when: verifying a fairness protocol and its production integration.
- NOT for: implementing derivation (`fair-rng-core`), seed lifecycle (`fair-commit-reveal`), or statistical batteries (`qa-rng-statistical`).

## Process
1. **Protocol/KATs:** freeze independently calculated vectors for the actual encoding, extraction, rejection cursor, draw limits/order, configuration, action and parameters. WF's bundled protocol is illustrative, not automatically production-compatible. Single-outcome `fairFloat` verifies through `deriveFn(stream, ctx)` using `ctx`, not counter-block bytes. Reject malformed inputs and invalid outcomes.
2. **Reduction:** exhaust every source value in finite-domain tests. `scripts/fair-reduction.test.mjs` enumerates one-byte domains and selected two-byte ranges; its naive `byte % 6` control gives `[43,43,43,43,42,42]`. Prove wider-domain rejection algebra and test boundary/redraw consumption.
3. **Epoch evidence:** default to `scripts/fair-epoch.mjs` `verifyEpoch` with the player's own `playerLog` (commitment, then a fresh client seed, then per-bet receipts, in write order) and played-order `rounds` including cancellations. Missing retained evidence must yield `UNVERIFIABLE`, never `PASS`; invalid evidence or history throws. Pin failures `seed_order`, `commitment`, `history_incomplete`, `client_seed`, `nonce_sequence`, `outcome`, `receipt`, `payout`, `voided_win` (receipts carrying stake/payout/void state need `payoutFn`), including a sorted export and non-plain inputs (a Proxy, a getter, an overridden iterator), which must be refused, never run. Dedicated per-player epochs require `0..k-1`; global nonces require the global allocation record, not this helper's contiguous-player assumption.
4. **Adversarial lifecycle:** test nonce skip/reuse/reorder, swapped client seed, rewritten commitment, hidden/invented bets, reused client entropy across epochs, and selective abort. Separately assert acceptance immutably binds epoch, nonce, client seed, integer-atom stake and every outcome-affecting parameter; debit precedes outcome derivation. Forbid selective cancellation/settlement after acceptance; cancellation/failure/rotation remains auditable. Existing lifecycle guidance forbids these attacks; per-round `verify()` cannot detect input selection.
5. **Serialization:** test injectivity over valid tuples; reject invalid nonce/cursor and domain-separate optional schemas. An example using nonce `"1:2"` cannot prove an exploit when nonces must be integers.
6. **Engine/proof parity:** replay identical draws through real `play`/`tick` and `proveFairness`; compare limits, counts, order, cursor/offset, recursion, cosmetic draws, variants and outcomes; test work caps. MetaWin's production server (MSS) `games/fruitMachine/test-fruitMachine.test.ts` `replayProof` demonstrates eager recursive parity; MSS `games/hitCrashers/test-fairness.test.ts` `prove` tests offsets and platform-builder parity. Adapter replay remains separate from independent player verification.
7. **Privacy:** assert active responses/proofs reveal no future outcomes, unrevealed seeds, RNG traces or private fields. MSS `games/hitCrashers/fairness.ts` `roundEvaluation` is the live-projection specimen.

## Correctness constraints
- **C5:** Require adversarial unpredictability from a CSPRNG; statistical success cannot establish cryptographic security. MT19937's state is recoverable from about 624 outputs; ISO/IEC 17025 accredits the lab, not the RNG.
- **C8:** Modulo is unbiased only when the range divides the source domain; quantify both sizes. Exhaustive reducer checks and justified rejection establish mapping uniformity; powered statistics only supplement them. Predeclare test families, adjusted thresholds and rerun policy (`qa-rng-statistical`).

## Pitfalls / red flags
Self-roundtrip presented as production proof; server-provided history substituted for player-kept evidence; missing evidence shown green.

## Verification
Run `scripts/fair-rng.test.mjs`, `scripts/fair-epoch.test.mjs`, and `scripts/fair-reduction.test.mjs`; retain results plus actual engine/proof and live-privacy evidence. Bundled passes do not certify production integration.
