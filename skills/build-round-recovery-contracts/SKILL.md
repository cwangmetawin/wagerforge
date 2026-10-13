---
name: build-round-recovery-contracts
description: Use when a live multiplayer round must survive a fatal tick, a stalled authority tick, a restart or a legacy-state upgrade, or needs abandoned-round auto-resolution, command-ID memory limits, catch-up ordering or late manual exits. Keywords void, refund, cancels, tombstone, stall watchdog, persisted rounding policy, retention epoch, abandonment, catch-up, grace window, late cash-out.
metadata:
  pillar: build
---

# build-round-recovery-contracts

> **Core insight:** One fate per accepted debit.

## When to use / When NOT

- Use for recovery; NOT wallets (`build-durable-settlement`).

## Default stack (+ escape hatch)

TypeScript + PixiJS/Phaser + Node; exact integer/decimal money. Else preserve authoritative ticks, persistence, debit identity, replay; clients render server decisions.

## Process

1. **Fatal void:** declare entry-state refunds once per open accepted debit, discarding unpaid results including accepted unpaid exits. Credit readable non-practice rows: matching room precision, parseable nonnegative money, positive stake, valid roundId, stake+bank<=declared return ceiling; cancel other identifiable open debits. Return banks funded by closed rows; cancel-all forbids open-row value from closed rows. Union readable evidence, including queued debits; exclude entry-proven terminals; preserve readable history, authority watermarks; tombstone refunds; close consumed draws once, preserving closed markers. MetaWin's production server (MSS) `games/hitShooter/recovery.ts` `buildVoid`, `vouchedRows`. Verify no refund/cancel overlap against platform debit identity; conflicting reuse cannot cancel booked originals.
2. **Stalls:** declare anchor/comparison: deadline age>3×longest healthy wait, or open-life authority gap≥grace (empty rooms exempt; first life refreshes stamp). Reject bets/cashouts; void entry liabilities without catch-up draws; restart. Anchor rollover to prior bust; missed takeoff grants full pause; freeze/reanchor roster/money at actual takeoff. MSS `games/hit-ai-wars/phases.ts` `isStalled`; MSS `games/hitShooter/stateProblem.ts` `authorityProblem`. Verify boundaries/downtime.
3. **Accepted rules:** persist rounding, original masked-E6 targets/relative delays. MSS `games/hitCrashers/money.ts` `payoutAtoms`: new cash=floor(net×mX100/100); legacy missing/half-up stays half-up; unknown policies fault before payout; bonus follows rounding. Rebuild only missing new-schema delays; reject present-invalid values; preserve legacy absolute arithmetic. Reject retired-market new stakes; settle legacy tickets next eligible event or refund at end. Migrate only wholly legacy shapes: new topology absent, Double/Split false; preserve shoe/order/stake, declare current Double/Split activation. Shared-debit legacy cannot undo; mixed undo cancels only new tickets; recognized replays never recancel. Merge pendingReleases once into same-round return/fatal refund; clear terminally, never mint/carry. MSS `games/world-spin/index.ts` `worldSpin.tick`. Verify restart, epoch-invariant ordering and migration economics.
4. **Command state:** budget controls/player/round and room bytes before mutation; exempt money commands; debited controls refund/tombstone. Pass/look replay changes only presence/gaze. Retain terminal IDs throughout epoch; retire only older nonopen IDs after platform replay-window confirmation; pause new commands at byte limit. MSS `games/hitShooter/state.ts` `dropStaleIds`. Verify pressure/replay.
5. **Abandonment:** declare deterministic GAME_RULES: bank legal claims; before first success play first legal pick/throw 0; continue heads/rock/no-choice to terminal; accept offers, otherwise first unrevealed nonkept plate; or close before any action at zero, forfeiting stake. Declare threshold units; MSS `games/pepe/index.ts` `server.action` banks surviving payout>1.5 currency units, otherwise continues. Never open another paid round. Verify paths across stakes.
6. **Catch-up:** declare commands before/after catch-up, death-before-withdrawal precedence and whether delayed dispatch extends admission. Advance fixed steps within horizon/dispatch budget; declare debt policy: retain unfinished and fractional debt, or round elapsed/interval, cap steps, drop remainders (MSS `games/snakes-pro/index.ts` `server.tick`); stop at terminal. Inputs: ceil((stamp−epoch)/step); clamp late/future; preserve per-player sequence/held inputs; admit earliest fresh within remaining per-player capacity. Idle money rooms: no debt; first life resets idle epoch. Retaining: MSS `games/hitShooter/worldTick.ts` `advanceWorld`. Verify epochs/overflow/no lost or duplicate steps.
7. **Manual exits:** normalize numeric/digit-string stamps: seconds→ms, floor; unusable→previous-tick time. Judge original stamp<bust; clamp payment time to takeoff/current/bust bounds. At bust, mark aboard bets pending; pre-bust stamps pay during grace; finalize afterward. MSS `games/hitCrashers/settle.ts` `ejectInstant`. Verify equality/backward clocks/late delivery.

## Pitfalls / red flags

Evicted tombstones; unitless thresholds.

## Verification

Fault each stage; restart/redeliver; verify one fate/debit.
