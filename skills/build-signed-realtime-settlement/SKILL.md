---
name: build-signed-realtime-settlement
description: Use when an external realtime authority reports signed results for a money server to verify and settle, including life settlement, canonical encoding, key rotation, or wrong-round replay.
metadata:
  constraints: C2
---

# build-signed-realtime-settlement

> **Core insight:** A valid signature authenticates a report; only binding it to the persisted funded round authorizes payment, and every failed check must preserve the open unpaid round.

## When to use / When NOT
- Use for external match authorities and settlement adapters.
- See `build-skill-wager-games` for gameplay authority; `build-durable-settlement` for durable payments. Signatures prove neither gameplay fairness nor ledger correctness.

## Default stack (+ escape hatch)
Default: TypeScript + PixiJS/Phaser + Node + exact integer money atoms. Map elsewhere: authority report → versioned signed schema; round → durable record; atoms → arbitrary-precision integers; payment → transactional ledger.

## Process
1. Persist authenticated player, tenant, wallet, game, environment, round/life, stake atoms, currency class/precision, fee policy and protocol version. Debit once before outcome; settlement is free. Funding rejection is terminal `REJECTED`, outcome-free and replayed on retry. Bind trusted wallet metadata, not currency labels. MetaWin's production server (MSS) `games/hitShooterLife/index.ts` `SPEC` and `games/hitSpaceshipLife/index.ts` `SPEC` register separate adapters; `common/settlementModule/game.ts` `playMain`, `walletOf`, `OpenLifeState` show their boundary, not deployment.
2. Define fields, types, order, integer spelling, list ordering, encoding and size bounds; reject unknown fields, duplicates and alternate spellings. Domain-separate version/purpose; never interchange ticket/result signatures. MSS `common/realtimeSettlement/standard.ts` `canonicalResult`, `checkResultRules`, `verifyResult` separate encoding, authenticity and legality.
3. Pin allowed keys per tenant/game/environment/purpose. Rotate with bounded overlap; retire keys after dependent reports drain. Development/production share neither IDs nor bytes. Refuse stakes without verification. MSS `common/realtimeSettlement/standard.ts` `keyRing` enforces purpose/unique IDs; verify deployment isolation separately.
4. Verify signature, outcome/cause legality and game-specific causes; compare all round bindings before payout, persisting currency class even if omitted. MSS `common/settlementModule/game.ts` `playSettle` checks life/room/stake/fee/game/environment; `common/realtimeSettlement/standard.ts` `GAME_CAUSES` restricts causes. Sort authenticated `(epoch,tick)` lexicographically; reject rewinds, deduplicate identities while allowing distinct same-tick events, and advance watermarks only after settlement succeeds: MSS `games/hitShooter/battle.ts` `reportOrder`, `checkReport`; `games/hitShooter/commands.ts` `drainReport`.
5. Calculate atoms with explicit rounding; require lossless conversion, rejecting off-grid values. For stake s, kills k, cap L: f=floor(s*bps/10000); death=0, eligible refund=s, extraction=s+min(k,L)*(s-f). Round per kill, never floor aggregate fees; cap rewards, not legal kill records. MSS `common/realtimeSettlement/standard.ts` `resultWinAtoms`, `winAtoms`; `common/settlementModule/money.ts` `majorToAtoms`. Failures retain `OPEN`, pay nothing and disclose only refusal codes/field names, never keys/signatures/input values: MSS `common/settlementModule/errors.ts` `SettlementGameError`.
6. Persist one immutable settlement/refund decision before credit. Identical duplicates replay receipts; changed content conflicts. Zero-return losses settle. MSS rejects second settlement after clearing state; durable replay needs the ledger.

## Correctness constraints
- C2: Balance caches change atomically with ledger entries; debit is an overdraft-safe, idempotent guarded write under serializable isolation. Never authorize spending from a cache or replica.

## Pitfalls / red flags
- Closing with zero on verification failure destroys recovery; accepting signed foreign reports pays the wrong round.
- Independent HMACs authenticate; rolling digests deduplicate, without a historical hash chain or gameplay proof. Require retained ordered events for history; verify retention across tick/epoch advances. MSS `games/hitShooter/fairness.ts` `fairnessEvaluation` exposes current-tick digests.

## Verification
- Test correctly signed wrong round/environment/stake/fee/cause, foreign tenant/player, malformed encoding, wrong-purpose/retired keys and off-grid payout: unchanged open state, zero credit, sanitized refusal. Cover restarts, reordered batches, duplicates, rejected reports, fee thresholds, caps and every outcome.
- Race duplicates and settlement/refund; crash between decision and credit; assert content conflict, one receipt and exact conservation.
