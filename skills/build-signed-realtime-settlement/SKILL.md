---
name: build-signed-realtime-settlement
description: Use when an external realtime authority reports signed results for a money server to verify and settle, including life settlement, canonical encoding, key rotation, or wrong-round replay.
metadata:
  constraints: C2
---

# build-signed-realtime-settlement

> **Core insight:** A valid signature authenticates a report; only binding it to the persisted funded round authorizes payment, and every failed check must preserve the open unpaid round.

## When to use / When NOT
- Use for external match authorities and money-server settlement adapters.
- Use `build-skill-wager-games` for gameplay authority; `build-durable-settlement` for durable payment legs. A signature alone proves neither gameplay fairness nor ledger correctness.

## Default stack (+ escape hatch)
Default: TypeScript + PixiJS/Phaser + Node + exact integer money atoms. Map elsewhere: authority report → versioned signed schema; round → durable record; atoms → arbitrary-precision integers; payment → transactional ledger.

## Process
1. Persist authenticated player, tenant, wallet, game, environment, round/life, stake atoms, currency class/precision, fee policy and protocol version. Debit once before the outcome exists; settlement is free. Funding rejection is terminal `REJECTED`, without an outcome; retries replay that rejection. Bind trusted wallet metadata rather than accepting a currency label. MetaWin's production server (MSS) `common/settlementModule/game.ts` `playMain`, `walletOf` and `OpenLifeState` show the adapter boundary; `games/hitShooterLife/index.ts` and `games/hitSpaceshipLife/index.ts` `SPEC` register separate games. Checked-in adapters do not establish deployment.
2. Define exact fields, types, order, integer spelling, list ordering, encoding and size bounds; reject unknown fields, duplicate events and alternate spellings. Domain-separate version and signature purpose; never interchange ticket and result signatures. MSS `common/realtimeSettlement/standard.ts` `canonicalResult`, `checkResultRules` and `verifyResult` separate canonicalization, authenticity and legality.
3. Pin an allowed verification-key set per tenant, game, environment and purpose. Rotate with bounded overlap; retire old keys after dependent reports drain. Development and production must share neither key IDs nor key bytes. Refuse new stakes when verification is unavailable. MSS `common/realtimeSettlement/standard.ts` `keyRing` enforces purpose and unique IDs; deployment isolation remains a separate gate.
4. Verify signature, legal outcome/cause combination and game-specific causes; compare every round binding before calculating payout. Persist currency-class binding even when the report omits currency. MSS `common/settlementModule/game.ts` `playSettle` checks life/room/stake/fee/game/environment; `common/realtimeSettlement/standard.ts` `GAME_CAUSES` restricts causes.
5. Compute the declared payout in atoms with explicit fee rounding. Require lossless boundary conversion; reject off-grid values. MSS `common/realtimeSettlement/standard.ts` `resultWinAtoms` and `common/settlementModule/money.ts` `majorToAtoms` provide specimens. Failures retain `OPEN`, pay nothing and disclose only refusal codes/field names, never keys, signatures or input values; MSS `common/settlementModule/errors.ts` `SettlementGameError` defines coded refusal.
6. Persist one immutable settlement/refund decision before credit. Identical duplicates replay the receipt; different content conflicts. Zero-return losses still settle. MSS rejects second settlement after clearing state; durable receipt replay needs the surrounding ledger.

## Correctness constraints
- C2: Balance caches change atomically with ledger entries; debit is an overdraft-safe, idempotent guarded write under serializable isolation. Never authorize spending from a cache or replica.

## Pitfalls / red flags
- Closing with zero on verification failure destroys recovery; accepting signed foreign reports pays the wrong round.

## Verification
- Test correctly signed wrong round/environment/stake/fee/cause, foreign tenant/player, malformed canonical encoding, wrong-purpose/retired keys and off-grid payout: unchanged open state, zero credit, sanitized refusal.
- Race duplicates and settlement/refund; crash between decision and credit; assert content conflict, one receipt and exact conservation.
