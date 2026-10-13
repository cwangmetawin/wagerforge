---
name: build-live-table-operations
description: "Use when building shared live table operations: chip undo, clear-table refunds, empty rounds, dependent side bets, command windows and deadlines, seat queues and idle release, withdrawal, unboard, stand or restake before risk."
metadata:
  pillar: build
---

# build-live-table-operations

> **Core insight:** Server clocks, debit identities and declared lifecycle policies determine when a stake can safely unwind.

## When to use / When NOT

Use for shared-table operations; phases: `build-live-table-games`; limits: `build-wager-limit-admission`.

## Default stack

TypeScript + PixiJS/Phaser + Node, exact integer/decimal money; other stacks map authoritative ticks, clocks and cancellations.

## Process

1. **Undo/clear:** before deadline, cancel original independent debits once; remove tickets from settlement/volume, retain wager/control command tombstones. Answer replay from its receipt; never a second cancel, debit or rebooking. Refunds are never wins. Amount undo scans caller's spot newest-first, taking whole tickets fitting the remainder; skip oversized chips and continue. Clear selects all caller-owned accepted tickets. Identifier undo matches caller-owned command/client/group ID union once; no match refunds zero. Shared-debit legacy tickets remain for settlement: report `heldBack` / `LEGACY_PRESS_LOCKED`. MetaWin's production server (MSS) `games/world-spin/index.ts` `server.tick`; MSS `games/baccarat-live/index.ts` `chipsToUndo`. Verify gaps/overlap/replay.
2. **Empty rounds:** consume one declared dice/card/pocket sequence, record history, settle nothing, schedule next. Shared-shoe zero-stake hands follow basic-strategy hit/stand only. Empty own-shoe mode uses shared shoe; funded own-shoe rounds add an independent standing display hand and played-out dealer. MSS `games/blackjack-table-live/index.ts` `server.tick`. Verify exact RNG/history, zero wallet legs, rescheduling.
3. **Dependent sides:** ordered admission requires positive main stake from earlier accepted commands; side-first rejects, cancelling only an existing debit. Last-main undo cancels all side chips. MSS `games/blackjack-table-live/index.ts` `server.tick`. Verify both orders/no orphans.
4. **Windows:** use a command's platform receipt stamp, never client fields (tick fallback if unusable); declare phase and lower-bound/skew policy. Examples: OPEN requires safe-integer stamp in [opening,deadline); fixed allows BETTING only; live allows BETTING/RUNNING before round cutoff; terminals close. Recheck tick-state phase; queued wagers precede that tick's outcome advance/reveal, keeping pre-draws hidden. Valid older wagers precede late-tick closing; undo requires current tick<deadline. MSS `games/world-spin/index.ts` `parseCommandEnvelope`; MSS `games/hit-ai-wars/bets.ts` `validateWager`; MSS `games/snakes-hit/index.ts` `commonWagerProblem`. Verify equality.
5. **Seat policies:** lowest free without waiters; otherwise FIFO. Round promotion is unfunded-only; head may fund free seat immediately. Release requires grace plus queue-pressure idle-round threshold; exclude funded seats, preserve just-claimed round grace; queue heartbeat resets idle. Separate participation/transport clocks; check transport when transport-grace is declared. However, MSS `games/hitCrashers/seats.ts` `releaseIdle` uses participation `la`; transport `lc` governs presence. Continuous policy reaps expired queue entries before each tick's promotion; release uses participation `idleReleaseMs`, never releasing open lives: MSS `games/hitShooter/tick.ts` `upkeep`. Verify clocks/no bypass.
6. **Silent lives:** require existing alive player, no pending leave, elapsed>=vanishedMs since max(seat.lc,life.t), or life.t without seat; never gameplay-input age. Then alive leave pays stake+bank. Pending leave remains at risk; death pays zero. MSS `games/hitShooter/worldTick.ts` `settleVanished`. Verify heartbeat/input/leave races.
7. **Withdrawal/replacement policies:** single-main protocol debits/validates new before cancelling old; rejected replacement preserves old, cancelling only new debit. Fresh platform ID restakes despite same client ID; identical ID replays. Client-ID deduplication is a different policy: MSS `games/world-spin/index.ts` `lookupFastIdempotency`. Before takeoff unboard refunds/retains seat; stand refunds/releases; queue stand removes waiter. Funded participants remain locked through terminal, even after cash-out. MSS `games/hitCrashers/stakes.ts` `acceptMain`. Open-life protocol forbids stand; unboard requires unarmed and elapsed<armMs; kill/death/report/leave or timeout ends eligibility. MSS `games/hitShooter/lives.ts` `applyUnboard`. Verify identities/arming/deadlines.

## Pitfalls / red flags

Refund-as-win; orphaned wagers; conflated clocks.

## Verification

At terminal: accepted stakes = cancelled stakes + settled stakes. Wallet change = -debits + refunds + gross returns; include house/transfer accounts for ledger conservation. Verify losses/wins/partial undo.
