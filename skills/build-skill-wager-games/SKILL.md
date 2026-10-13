---
name: build-skill-wager-games
description: Use when building skill wagers with authoritative aiming, geometry, clocks, lives, shot funding, or externally reported combat results.
metadata:
  constraints: C2
---

# build-skill-wager-games

> **Core insight:** A skill wager funds an authoritative interaction, not a fixed RNG return table; authenticate external results, conserve every stake, and verify gameplay separately from signatures and cosmetic randomness.

## When to use / When NOT
- Use when player inputs affect money through server simulation, timed targeting, or life-based combat.
- Do NOT use for cosmetic flight over a predetermined RNG payout: use `qa-cosmetic-sim-guard`; for pooled spectator wagers, use `build-prediction-market-games`.

## Default stack (+ escape hatch)
Default: TypeScript + PixiJS/Phaser + Node + BigInt integer atoms. Else map renderer → presentation, Node → authority service, BigInt → exact integer type, and room state → durable storage.

## Process
1. Trace the active outcome path; classify skill, RNG, and hybrid components. MetaWin's production server (MSS) `games/hitShooter/index.ts` `server.tick` runs the room simulation; its signed-report channel is deprecated. Its money rooms draw no RNG: bots, the only consumer of the room's `random` (`sim/bots.ts`), play only in no-money practice rooms. Verify this per build; stale comments are not evidence. Do not market skill outcomes as fixed RNG RTP; report fees and strategy-dependent returns.
2. Version inputs, geometry, clock, and rules. Accept controls or aim coordinates; derive origins, collisions, targets, event order, and deadlines server-side. Persist simulation progress for restart/catch-up. MSS `games/giftBox/index.ts` `parseParams`, `canonicalTargetCenterAt`, and `server.tick` show authoritative geometry followed by payout RNG; geometry authority does not remove randomness.
3. Fund each life/shot before deriving or revealing its outcome. Persist player, round/life, currency, atoms, fee policy, and rules version. Every new debited command is accepted or cancelled; an already-handled command replays its receipt without another cancellation. Same identity with different content is a conflict. Persist one terminal decision—settled, including zero, or refunded—before its money leg; a rejected wager never revives.
4. Define legal outcome/cause pairs per game: kill, death, extract, mutual, and refund are concepts, not a universal allowed vocabulary. Specify simultaneous kills, unfunded opponents, disconnects, and refund eligibility. MSS `common/realtimeSettlement/standard.ts` `OUTCOME_CAUSES`, `GAME_CAUSES`, and `winAtoms` distinguish cause sets and returns. External authority reports hand off to `build-signed-realtime-settlement`; invalid verification leaves the round OPEN without payment.
5. Reconcile exact atoms after every event: funded stakes = credited returns + retained house amounts + open liabilities. Allocate rewards and fees without creating stakes; define rounding and cap disposition explicitly. MSS `games/hitShooter/tick.ts` `tickBody` checks this identity before returning money.
6. Replay gameplay from retained input/config/clock evidence; test cosmetic randomness independently. Signature authenticity cannot prove honest gameplay. A truly zero-RNG path has no RNG proof. For RNG components, use `fair-verify` with player-retained epoch evidence; missing evidence means UNVERIFIABLE.

## Correctness constraints
- **C2:** Debit through an atomic, overdraft-safe, idempotent guarded write under serializable isolation. Update cached balances only in the ledger's ACID transaction; never authorize spending from cache/replica.

## Pitfalls / red flags
- Client collision/time authority lets players select payouts; renderer replay cannot establish server correctness.
- Paying an unfunded opponent or refunding after settlement creates money; a valid signature cannot repair either defect.

## Verification
- Reject forged geometry/time, stale epochs, wrong-round reports, illegal causes, and changed-content retries.
- Test concurrent duplicates, simultaneous deaths, reconnect/catch-up/restart, refund-versus-settle races, zero-return closure, and exact conservation; separately compare actual gameplay and RNG proof paths.
