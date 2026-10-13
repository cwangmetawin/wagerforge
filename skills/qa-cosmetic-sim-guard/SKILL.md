---
name: qa-cosmetic-sim-guard
description: Use when checking that Plinko physics or other cosmetic simulations visibly match a server-resolved bucket without influencing payout.
---

# qa-cosmetic-sim-guard
> **Core insight:** Compare the independently measured visual landing with the server bucket before any correction; payout always follows the server-resolved result.

## When to use / When NOT

- Use for cosmetic physics, wheels or dice that present a server-decided outcome.
- Server math: `qa-math-validation`; genuinely player-controlled wager outcomes require a separate authority model (skill-wager games: `build-skill-wager-games`).

## Process

1. Define server result fields and their presentation mapping before building the guard. MetaWin's production server (MSS) `games/plinko100k/index.ts` `settle` resolves `multiplierIndex`, optional ball multiplier, combined capped multiplier and `win`. Render their server-resolved meaning; physical landing never authorizes a payment.
2. Inspect the actual client implementation. Named Canvas/provider files, launch pools and engine settings are unavailable in MSS and remain (unverified); do not infer their behavior from the server. Identify where the simulated position becomes a bucket and where server-result correction occurs.
3. Capture the raw physics-derived bucket before overwriting position, index or label with server data. Compare that snapshot to the server `multiplierIndex`, with rows/risk/layout included in the context. A comparison after correction can compare a value with itself.
4. Define reproducible per-drop inputs: actual launch parameters, fixed timestep, geometry, collision settings and layout. If launch pools exist, test all supported entries or document sampling coverage; do not rotate unspecified pool state inside a reproducibility test. A fixed launch point alone does not prove engine determinism across runtimes.
5. Cover every supported bucket and layout, including extremes; test ball-multiplier presentation independently from landing. Keep runtime drift diagnostics separate from the authoritative payment path. In production, correct or degrade the presentation to the server result while preserving the settled receipt; a cosmetic mismatch must not re-roll or repeat the bet.
6. Record server receipt, raw landing, corrected display and simulation inputs together. Prevent test capture from exposing private state or future outcomes.

## Pitfalls / red flags

Payout derived from physics; assertions after server correction; screenshots without bucket evidence; viewport-dependent geometry; variable timestep; assuming one launch point covers every pool entry; claiming a verified client bug from MSS alone.

## Verification

Retain a coverage matrix and per-drop raw-bucket comparisons. Perturb geometry, gravity, launch parameters or timestep and show the affected guard detects drift. Inject a mismatch and verify production presentation converges to the server result with exactly the original payment. Mark browser/client execution unverified until those artifacts exist.
