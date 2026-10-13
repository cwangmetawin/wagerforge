---
name: math-guaranteed-payout-floor
description: Use when engineers design or audit absolute currency guarantees on natural slot cap events, 100k editions, stake thresholds, route-specific replay, or base/floor twins.
metadata:
  constraints: C4, C14
---

# math-guaranteed-payout-floor

> **Core insight:** A currency floor changes only eligible natural cap events, making RTP depend on stake and route; it is neither a minimum return on every spin nor a maximum multiplier.

## When to use / When NOT

- Use for absolute guarantees attached to organic slot max-win events.
- Use `math-plinko-lottery` for branded maximum multipliers; `math-feature-buy-and-jackpot` for feature pricing and fixed jackpot tiers.

## Process

1. Write a route matrix: natural, boosted, selectable continuation, bought feature. Pin actual behavioral config, charged cost B, normalized inner stake b, absolute guarantee K and cap multiple C. Represent money in integer atoms; compute normalization exactly. MetaWin's production server (MSS) `games/zeus100k/index.ts` `server.play` normalizes boosted and bought stakes differently.
2. Resolve the organic whole-round total, including base, scatter payments and the selected feature. An eligible natural total reaching C*b pays `max(K, C*b)`; ordinary wins retain their own rules. The floor changes payment only for `b < K/C`; at equality or above, payment is C*b. Bought features follow their own cap. MSS `games/zeus100k/gamePlay.ts` `playMain` and `playBuyFreegames` implement separate substitutions.
3. Specify replay probability, route, stake bands, rejection scope and retry budget. Disable floor-specific rejection when C*b >= K; distinguish unrelated band rejection. Bounded replay is not unlimited conditioning, and does not charge another stake. MSS `games/zeus100k/gamePlay.ts` `fgBandReject` combines rejection budgets; `games/cowAbduction100k/gamePlay.ts` `maxwinRejectProb` gates only selected low stakes.
4. Apply the cap/floor to the whole round once. Sum only newly payable legs: a continuation pays final total minus amounts already credited, rather than another full guarantee. Persist the accepted result and use `build-durable-settlement` for replay identity. MSS `games/zeus100k/gamePlay.ts` `playMain` stores incremental continuation payments.
5. Audit each twin independently: compare shared engines/configs, identify intentional wrapper differences, then refresh cap-rate calibration after parent changes. MSS `games/goldDiggers100k/gamePlay.ts` `maxwinRejectProb` distinguishes main/boosted stake bands. A directory name proves nothing: MSS `games/sweetyCluster100ktest/gamePlay.ts` `FIXED_MAX_PAYOUT` is zero.
6. Calibrate and verify every route/variant below, at and above K/C, including minimum stakes and replay-band boundaries. Compute RTP from actual charged cost and settlement atoms; retain rare-event counts and uncertainty alongside the mean. Record results through `qa-game-fingerprints`.

## Correctness constraints

- C4: Sample sufficiency requires CI half-width below tolerance at the chosen confidence; a fixed spin count cannot establish convergence, especially for rare guarantees.
- C14: Switching among pre-certified variants is allowed with the active percentage displayed. RNG-external promotions leave certified math unchanged; a floor or replay retune changes the math model and requires re-certification.

## Pitfalls / red flags

- Treating K as a multiplier or flooring every win creates unintended liability.
- Rejecting organic caps above the threshold deletes legitimate wins; reusing a parent's RTP ignores the substitution.

## Verification

- Force below-cap, exact-cap and overshoot events on natural and bought routes at all three stake regimes.
- Replay an event that caps again; verify budget exhaustion, draw consumption, unchanged stake and no duplicate continuation payment.
- Fail stale twin/calibration checks. Preserve legitimate rare wins; require separate cap-frequency and RTP evidence.
