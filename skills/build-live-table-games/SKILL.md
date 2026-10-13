---
name: build-live-table-games
description: Use when building house-banked multiplayer blackjack, baccarat, roulette or dice tables with timed betting, private hands, paid Double/Split commands, reconnects, timeout actions or void refunds.
metadata:
  constraints: C2
---

# build-live-table-games

> **Core insight:** A shared table has separate wallet debits, private projections and timed phases; every funded command needs one immutable fate, including losses, late rejections and retries.

## When to use / When NOT

- Use for timed house-banked multiplayer tables.
- Do NOT use for pooled positions (`build-prediction-market-games`) or bankroll runs (`build-bankroll-run-games`).

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser + Node + exact integer money atoms. Else map scheduling, durable wallet transactions and private projections; clients render server decisions.

## Process

1. Model betting → dealing → optional acting → settled, server deadlines, commands and timeout defaults; persist deadlines for replay. Model player concurrency separately from each player's hand sequence; do not infer table serialization from per-player hand order. Shared acting validates each caller's active hand. Close shared acting when all hands resolve or the deadline auto-stands. MetaWin's production server (MSS) `games/blackjack-live/index.ts` `server.tick`, `games/blackjack-live/state.ts` `resolveActiveHand`.
2. Separate betting cutoff, lock expiry, sampling and publication. Delayed sampling draws once after lock, retains the pocket privately through spinning, and completes fairness at result. Verify zero lock draws, one round draw, no leak/redraw. MSS `games/roulette-live/index.ts` `server.tick`.
3. Bind immutable command identity/content to player, table, game/wallet rounds, action, hand and exact amount. Persist receipts; identical retries replay without debit/credit/cancellation; changed content conflicts. Explicitly accept/reject new queued commands; cancel rejected debits once. MSS `games/snakes-hit/index.ts` `server.tick` preserves handled commands.
4. Revalidate identity, phase, deadline, hand ownership, legality, stake and limits at admission and tick. Debit opening stakes before dealing; Double/Split before additional cards. Hit/Stand are free; never manufacture tick funding. MSS `games/blackjack-live/commands.ts` `validateCommand` and `games/blackjack-live/index.ts` `server.tick` distinguish paths.
5. Persist immutable settlement/refund decisions before money legs; guard terminal transitions and resume unfinished legs. Return gross including stake; close losses with zero. MSS `games/blackjack-live/index.ts` `server.tick` emits losing `wins`. `build-durable-settlement` covers persistence boundaries.
6. Project broadcasts, private messages, reconnect and replay separately. Mask hole cards/derived totals until reveal; authorize hands. Reconnect restores bets/actions/original deadline without draws. MSS `games/blackjack-live/dealing.ts` `publicDealer` masks cards; `games/blackjack-live/index.ts` `server.connected` restores owner views. `fair-shoe-draw-ledger` covers shoe proofs.
7. Before a terminal decision, computation failure voids unresolved accepted debits: refund each once; cancel only new rejected queued debits. Never combine payout/refund or erase unfinished obligations. MSS `games/blackjack-live/index.ts` `voidRound` excludes refunded commands from cancellation.

## Correctness constraints

- **C2:** Debit through an atomic, overdraft-safe, idempotent guarded write under serializable isolation. Update any balance cache atomically in the same ACID transaction as ledger entries; never authorize spending from cache or replica.

## Pitfalls / red flags

- Free Double/Split creates unfunded exposure; recancelling handled commands reverses debits.
- Omitting zero returns strands losing rounds; payout plus refund pays twice.
- Raw state exposes private/future cards; client timestamps admit late actions.

## Verification

- Test interleaved players, split-hand advancement, late queued Double/Split, wrong hand/player, concurrent identical retries, content conflicts, stale rounds and timeout-boundary ordering; debit precedes draws.
- Inject settlement failures; assert conservation, one fate/debit, zero-loss closure, recovery and clean next-round state.
- Inspect broadcast/private/reconnect/replay before reveal: no hole cards, derived totals or unauthorized hands; reconnect draws nothing. Exercise the wallet adapter; game-only tests cannot prove platform atomicity.
