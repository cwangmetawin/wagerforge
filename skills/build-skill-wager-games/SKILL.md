---
name: build-skill-wager-games
description: Use when building skill wagers with authoritative aiming, geometry, clocks, lives, shot funding, or externally reported combat results.
metadata:
  constraints: C2
---

# build-skill-wager-games

> **Core insight:** A skill wager funds an authoritative interaction, not a fixed RNG return table; authenticate external results, conserve every stake, and verify gameplay separately from signatures and cosmetic randomness.

## When to use / When NOT
- Use for inputs affecting money through server simulation, timed targeting, or life-based combat.
- Do NOT use for cosmetic flight over predetermined RNG payouts (`qa-cosmetic-sim-guard`) or pooled spectator wagers (`build-prediction-market-games`).

## Default stack (+ escape hatch)
Default: TypeScript + PixiJS/Phaser + Node + BigInt atoms. Else map renderer → presentation, Node → authority, BigInt → exact integers, room state → durable storage.

## Process
1. Trace active skill/RNG/hybrid paths. MetaWin's production server (MSS) `games/hitShooter/index.ts` `server.tick` runs room simulation; signed reports are deprecated. Money rooms consume no RNG: bots (`sim/bots.ts`), sole room `random` consumers, play only in no-money practice. Verify each build, not stale comments. Report fees/strategy-dependent returns, never fixed RNG RTP for skill.
2. Version inputs/geometry/clock/rules; accept controls/aim, derive origins/collisions/targets/order/deadlines server-side. Persist progress for restart/catch-up. MSS `games/giftBox/index.ts` `parseParams`, `canonicalTargetCenterAt`, `server.tick` show geometry then payout RNG; authority does not remove randomness.
   For asynchronous terminals (MSS `games/giftBox/index.ts` `settleRicochetsThrough`, schema v4 Ricochet), order by `(terminalAt,acceptedSequence,commandId)`; process terminals ≤ a new shot's authoritative time first, never by arrival order. First win closes that target generation; refund invalidated shots without RNG. Verify earlier/equal/later shots, parallel targets and pending-liability replay.
3. Fund lives/shots before deriving/revealing outcomes. Persist player, round/life, currency, atoms, fee policy and rules version. Accept/cancel every new debit; handled commands replay receipts without recancellation; changed content conflicts. Persist one terminal decision—settled, including zero, or refunded—before money; rejected wagers never revive.
4. Define game-specific outcome/cause pairs: kill/death/extract/mutual/refund are concepts, not universal vocabulary. Specify simultaneous kills, unfunded opponents, disconnects and refund eligibility. MSS `common/realtimeSettlement/standard.ts` `OUTCOME_CAUSES`, `GAME_CAUSES`, `winAtoms` distinguish causes/returns. External reports use `build-signed-realtime-settlement`; invalid verification leaves rounds OPEN/unpaid.
5. Reconcile exact atoms/event: funded stakes = credited returns + retained house amounts + open liabilities. Allocate rewards/fees without creating stakes; specify rounding/cap disposition. MSS `games/hitShooter/tick.ts` `tickBody` checks conservation before money.
   For multi-target shots (MSS `games/giftBox/index.ts` `splitPiercingStake`, schema v3 Piercing), apply the cost factor once, never per leg; split total debit into payout-safe wallet quanta across locked legs, remainders in leg order. Require at least one quantum per possible leg even when fewer lock. Each leg's return uses its allocation; verify sum=debit, divisibility rejection before RNG, mixed outcomes aggregate once.
6. Replay gameplay from retained input/config/clock evidence; test cosmetics separately. Signatures cannot prove honest gameplay; zero-RNG paths have no RNG proof. RNG components use `fair-verify` with player-retained epoch evidence; missing evidence means UNVERIFIABLE.

## Correctness constraints
- **C2:** Debit through an atomic, overdraft-safe, idempotent guarded write under serializable isolation. Update cached balances only in the ledger's ACID transaction; never authorize spending from cache/replica.

## Pitfalls / red flags
- Client collision/time authority selects payouts; renderer replay cannot prove server correctness.
- Unfunded-opponent payouts or refunds after settlement create money; signatures repair neither.

## Verification
- Reject forged geometry/time, stale epochs, wrong-round reports, illegal causes, and changed-content retries.
- Test concurrent duplicates, simultaneous deaths, reconnect/catch-up/restart, refund-versus-settle races, zero-return closure, and exact conservation; separately compare actual gameplay and RNG proof paths.
