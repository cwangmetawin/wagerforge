---
name: build-game-server-rgs
description: Use when implementing IGame or IMultiplayerGame contracts, continuation state, action validation, exposure metadata, tick commands, or game/platform settlement boundaries.
metadata:
  constraints: C11
---

# build-game-server-rgs

> **Core insight:** Game code computes authoritative responses; the platform owns wager identity and atomic payment. Continuation, payout and recovery rules must match the specific action and game.

## When to use / When NOT

- Use for authoritative game-module contracts.
- Money primitives/orchestration: `build-wallet-and-money`/`build-durable-settlement`.

## Default stack + escape hatch

TypeScript + PixiJS/Phaser presentation + Node, injected RNG and exact money boundaries. Other stacks map the same request/state/action, tick and transactional platform contracts.

## Process

1. Separate request-driven single-player from time-driven multiplayer. MetaWin's production server (MSS) `docs/GDK_CONTRACT.md` `IGame` defines synchronous `play(request, random, betLimits?)` returning `{win,data?,state?,next?}`. Inject RNG; platform owns single-player wager/round IDs and wallets; game code validates state/actions, never mints round IDs or moves wallet funds.
2. `next`, never `win>0`, drives GDK completion. MSS `games/zeus/gamePlay.ts` `playMain` pays base win with feature choices; continuation pays increments. Empty-state deferred minis terminate with `state:{}`, `next:[]`, paying once; MSS `games/partyPong/index.ts` `cashout` retains terminal reveal state with `next:[]`. Preserve complete opaque RGS state; mask only client envelopes and verify masking before launch. `/play` does not enforce `next`; validate actions against state.
3. Separate exposure multipliers, platform currency limits and certified game caps. Apply action-specific caps in matching units; detect overshoots with `>=`. MSS `games/fruitMachine/index.ts` `server.bets` declares exposure; `spin` preserves natural wins. MSS `games/deck52/gameLogic.ts` `playDeck52` applies multiplier/currency caps. MSS `games/zeus100k/gamePlay.ts` `playMain` substitutes `Math.max(100000,cap.maxWin*bet)` currency units for qualifying natural max-wins; buys retain their cap.
4. Declare debit mode: free continuation, opening-bet shadow, or new paid stake (Blackjack Double/Split); validate before mutation/RNG (`build-live-table-games`). Multi-step minis need opening config snapshots, validated FSMs, abandoned-round `action()`, and paying one-round `autobet` unless single-step or README-waived. Require interactive/autobet draw/payout parity. Deliver spec, IGame scaffold, README, SIM_RESULTS, FRONTEND and current GAME_RULES; MSS `docs/DEVELOPMENT_WORKFLOW.md` Track A.
5. Multiplayer `tick` accepts time/config/state/commands/drawId/systemCommands; returns state/wins/cancels/messages/broadcast/drawFinished/nextTickTime. Multiplayer owns `replay`/`simulator.stats`: MSS `games/snakes-pro/index.ts` `server`. Validate `command()` and `tick()`; accept/cancel each new queued money command once. Handled commands replay receipts, never cancel again (which reverses debit): MSS `games/snakes-hit/index.ts` `handledSettlementCommandId`. Determinism cannot replace platform durable drawId deduplication. Resolve manual/automatic exits and failure by authoritative event time, never tick order/displayed rung; earliest eligible event wins with explicit tie precedence. MSS `games/skyfall/gameLogic.ts` `resolveBet` makes fade win ties. Test delayed ticks, duplicate presses and exact exit/failure ties.
6. Recovery: house-banked ticks refund unresolved accepted stakes without duplicate cancellations; pools refund remaining liabilities plus earned pending payouts once, never realized gross stakes. Signed failures remain open/unpaid. MSS `games/snakes-pro/index.ts` `server.tick` defers `pendingPayouts` until draw finish for its documented message-delivery issue; verify framework delivery.

## Correctness constraints

- **C11:** Use HMAC for keyed derivation, not secret-prefix SHA-256; plain seed hashes are valid commitments. Modulo bias depends on source/range, is negligible with full 32-bit-plus sources for small ranges, and zero for power-of-two ranges; rejection-sample large ranges.

## Pitfalls / red flags

Stripped continuation state; win-based completion; universal currency clamps; multiplayer methods in IGame; in-memory dedup presented as durable payment protection.

## Verification

Require deterministic full API rounds, incremental slot payments, malformed/out-of-order rejection, cap-unit boundaries, platform replay atomicity and game-specific recovery. Use `qa-settlement-integrity`.
