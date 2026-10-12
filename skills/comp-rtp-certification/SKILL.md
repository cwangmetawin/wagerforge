---
name: comp-rtp-certification
description: Use when deciding RTP variant approval scope, certifying actual payout routes, checking displayed economics, or investigating field RTP drift after math changes.
metadata:
  constraints: C4, C9, C14
---

# comp-rtp-certification
> **Core insight:** Certification follows the resolved behavioral SKU and its payment rules; changing private Promo weights requires certification even when public RTP labels remain unchanged.

## When to use / When NOT

- Use for variant/change classification, certification evidence and field monitoring.
- Target derivation: `math-rtp-modeling`; simulation: `qa-monte-carlo-cert`; report: `comp-math-cert-report`; cryptographic player evidence: `fair-verify`.

## Process

1. Inventory registrations, actions, strategies, stake regimes, wallet grids and certified models. Trace `config(variant)`, private resolution and fallback branches. MetaWin's production server (MSS) `games/riseOfTheWolf/index.ts` `server.config` switches variants; `games/tothetopPromo/index.ts` `server.config` ignores variant and `server.play` selects private Promo math. Verify each route rather than assuming one environment selector.
2. Source targets from approved behavioral models. Normalize percent/fraction units explicitly. Public `rtpValues` and displayed labels are cross-checks, not behavioral authority; require displayed RTP/paytables to match the certified active SKU. Record discrepancies as release blockers, including fixed Promo exceptions.
3. Collect complete API-round evidence with exact integer-atom costs and incremental payments, including paid continuations and full buy costs. Convert only dimensionless ratios to approximate statistics; preserve exact atom totals. Separate base/feature contributions from separately purchased feature RTP. Use independent-round statistics and the correct fixed-cost or paired-round ratio estimator; distinguish bankroll return from per-stake RTP (bankroll-run games: `build-bankroll-run-games`).
4. Identify cap ownership and units per action. Exposure metadata, platform currency ceilings and certified game payout caps are distinct. MSS `games/fruitMachine/index.ts` `spin` preserves natural wins without a game-side ceiling; `games/deck52/gameLogic.ts` `playDeck52` applies multiplier and currency caps; `games/zeus100k/gamePlay.ts` `playMain` substitutes a natural-play floor. Include rounding, truncation and termination in the certified model.
5. Classify changes against documented approval scope. Selecting an already approved variant requires its correct display and routing. Weights, paytable, feature logic, rejection, caps or rounding changes require math change-control and applicable certification, even if EV is preserved. A Promo changing private weights needs its own certified model; external promotional credits require separate economic accounting.
6. Monitor field RTP by resolved SKU/action/strategy/stake regime, with volatility and dependence accounted for. Predeclare confidence, sampling windows, multiplicity/sequential policy and escalation. A statistical discrepancy triggers investigation; repeated unplanned 95%→99% testing is not confirmation.
7. Retain approval documents, source/dependency hashes, routing/payment tests and audit records showing outcome/variant finalization before presentation. Runtime integration and external approval require their own evidence.

## Correctness constraints

- **C4:** Simulation acceptance requires |mean−target| + CI half-width ≤ tolerance and n ≥ `requiredN(modelSd, tolerance, z)` from `scripts/rtp.mjs`; variable costs need a ratio CI.
- **C14:** Switch only within documented pre-certified variant scope and display the active economics. RNG-external promotions leave certified game RTP unchanged; math-model changes, including private Promo weights, require certification.
- **C9:** Certified-slot outcomes are server-determined and audit-logged before animation; cryptographic commit/reveal is the separate provably-fair model.

## Pitfalls / red flags

Hidden Promo targets; universal cap formulas; undocumented legal/vendor approval assumptions.

## Verification

Reproduce every resolved route and payment boundary; prove displayed SKU alignment, statistical gates and approval scope from retained artifacts.
