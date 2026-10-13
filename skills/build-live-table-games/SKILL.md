---
name: build-live-table-games
description: Use when building house-banked multiplayer blackjack, baccarat, roulette or dice tables with timed betting, private hands, paid Double/Split commands, reconnects, timeout actions or void refunds.
metadata:
  constraints: C2
---

# build-live-table-games

> **Core insight:** A shared table has separate wallet debits, private projections and timed phases; every funded command needs one immutable fate, including losses, late rejections and retries.

## When to use / When NOT

- Use for timed multiplayer tables where the house settles each player's wager.
- Do NOT use for pooled positions (`build-prediction-market-games`) or automated bankroll runs (`build-bankroll-run-games`).

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser + Node + exact integer atoms for money. Other stacks map scheduling, durable wallet transactions and private projections to equivalent components; clients render server decisions.

## Process

1. Specify betting → dealing → optional acting → settled transitions, server deadlines, permitted commands and timeout defaults. Persist deadlines for replay. MetaWin's production server (MSS) `games/blackjack-live/index.ts` `server.tick` auto-stands unfinished hands at the acting deadline.
2. Bind command identity to player, table, game round, wallet round, action, hand and exact amount. Persist content and receipt; identical retries replay that receipt without debit, credit or cancellation; changed content conflicts. New queued commands require explicit acceptance or rejection; cancel rejected debits once. MSS `games/snakes-hit/index.ts` `server.tick` preserves handled commands.
3. Validate identity, phase, deadline, hand ownership, action legality, stake and applicable limits at admission and again in the tick. Debit opening stakes before dealing. Hit/Stand are free; Double/Split require new debits before additional cards exist. Never manufacture tick funding. MSS `games/blackjack-live/commands.ts` `validateCommand` and `games/blackjack-live/index.ts` `server.tick` distinguish these paths.
4. Persist immutable settlement/refund decisions before money legs; guard terminal transitions and resume unfinished legs. Return gross amounts including stake; explicitly close losing wallet rounds with zero return. MSS `games/blackjack-live/index.ts` `server.tick` emits losing `wins` entries. `build-durable-settlement` covers persistence boundaries.
5. Project broadcasts, private messages, reconnect snapshots and replay separately. Hide hole cards and derived totals until reveal; expose authorized hands only. Reconnect restores bets, actions and the original deadline without redrawing. MSS `games/blackjack-live/dealing.ts` `publicDealer` masks dealer cards; `games/blackjack-live/index.ts` `server.connected` restores the owner's view. Use `fair-shoe-draw-ledger` for shoe proofs.
6. If computation fails before a terminal decision, void unresolved accepted debits and refund each once; cancel only new rejected queued debits. Never combine payout and refund or erase unfinished obligations. MSS `games/blackjack-live/index.ts` `voidRound` excludes refunded commands from cancellation.

## Correctness constraints

- **C2:** Debit through an atomic, overdraft-safe, idempotent guarded write under serializable isolation. Update any balance cache atomically in the same ACID transaction as ledger entries; never authorize spending from cache or replica.

## Pitfalls / red flags

- Free Double/Split creates unfunded exposure; recancelling a handled command reverses its debit.
- Omitting zero returns strands losing rounds; payout plus refund pays twice.
- Serializing raw state exposes private or future cards. Client timestamps admit late actions.

## Verification

- Test late queued Double/Split, wrong hand/player, concurrent identical retries, content conflicts, stale rounds and timeout-boundary ordering; assert debit precedes draws.
- Inject settlement failures; assert exact conservation, one fate per debit, zero-loss closure, recovery and clean next-round state.
- Inspect broadcast/private/reconnect/replay payloads before reveal; assert no hole cards, derived totals or other players' private hands escape, and reconnect consumes no draws. Exercise the real wallet adapter; game-only tests cannot prove platform atomicity.
