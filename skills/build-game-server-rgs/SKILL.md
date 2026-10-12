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

1. Separate request-driven single-player from time-driven multiplayer. MetaWin's production server (MSS) `docs/GDK_CONTRACT.md` `IGame` defines synchronous `play(request, random, betLimits?)` returning `{win,data?,state?,next?}`. RNG is injected; platform owns single-player wager/round IDs. Game code validates state/action legality; it does not mint round IDs or move wallet funds.
2. Never infer completion from `win>0`: `next` drives GDK continuation. MSS `games/zeus/gamePlay.ts` `playMain` pays base win while returning feature choices; continuation pays only the increment. Deferred minis using the empty-state convention end with `state:{}`, `next:[]`, payout once; MSS `games/partyPong/index.ts` `cashout` instead retains terminal reveal state with `next:[]`. Preserve complete opaque RGS state; hide fields only in the client-visible envelope, with masking verified before launch. `/play` does not enforce `next`; validate actions against state.
3. Distinguish exposure multipliers, platform currency limits and certified game-level caps. Apply only the cap required by the action, in matching units; detect overshoots with `>=`. MSS `games/fruitMachine/index.ts` `server.bets` declares exposure while `spin` preserves natural wins. MSS `games/deck52/gameLogic.ts` `playDeck52` applies multiplier/currency caps. MSS `games/zeus100k/gamePlay.ts` `playMain` substitutes `Math.max(100000,cap.maxWin*bet)` currency units on qualifying natural max-win events; buys retain their own cap.
4. Declare each action's debit mode (free continuation, shadow of the opening bet, or new paid stake such as Blackjack Double/Split) and validate it before mutation or RNG; see `build-live-table-games`. Multi-step minis need an opening config snapshot, validated FSM, abandoned-round `action()`, and paying one-round `autobet` unless single-step or explicitly waived in README. Require interactive/autobet draw and payout parity. New-game deliverables: spec, IGame scaffold, README, SIM_RESULTS, FRONTEND and current GAME_RULES; MSS `docs/DEVELOPMENT_WORKFLOW.md` Track A.
5. Multiplayer `tick` accepts time/config/state/commands/drawId/systemCommands and returns state, wins, cancels, messages, broadcast, drawFinished and nextTickTime. `replay` and `simulator.stats` belong to multiplayer; MSS `games/snakes-pro/index.ts` `server`. Validate both `command()` and `tick()`; every new queued money command must accept or cancel, once. An already-handled command replays its receipt and is never cancelled again, because a second cancel reverses its debit: MSS `games/snakes-hit/index.ts` `handledSettlementCommandId`. Deterministic game output does not replace platform durable drawId deduplication.
6. Recover by game: house-banked ticks refund unresolved accepted stakes without duplicate cancellations; pools refund remaining liabilities plus earned pending payouts once, never realized gross stakes. Signed failures keep the round open/unpaid. MSS `games/snakes-pro/index.ts` `server.tick` defers earned income in `pendingPayouts`, flushing at draw finish to avoid its documented message-delivery issue; verify delivery on the actual framework.

## Correctness constraints

- **C11:** Use HMAC for keyed derivation, not secret-prefix SHA-256; plain seed hashes are valid commitments. Modulo bias depends on source/range, is negligible with full 32-bit-plus sources for small ranges, and zero for power-of-two ranges; rejection-sample large ranges.

## Pitfalls / red flags

Stripped continuation state; win-based completion; universal currency clamps; multiplayer methods in IGame; in-memory dedup presented as durable payment protection.

## Verification

Require deterministic full API rounds, incremental slot payments, malformed/out-of-order rejection, cap-unit boundaries, platform replay atomicity and game-specific recovery. Use `qa-settlement-integrity`.
