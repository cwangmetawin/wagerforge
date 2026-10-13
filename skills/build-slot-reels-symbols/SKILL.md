---
name: build-slot-reels-symbols
description: Use when rendering server-resolved slot reels, stop indices, ordered grids or bonus snapshots, configuring spin timing, or managing symbol animation pools. Keywords reel spin, snapshot slot, strip slot, symbols, Spine, bezier, slot frontend.
metadata:
  constraints: C9
---

# build-slot-reels-symbols

> **Core insight:** Reels render an authoritative public outcome, supplied as strip stops or ordered snapshots; animation timing and symbol effects never select or change it.

## When to use / When NOT

- Use when animating reels, symbols or recorded bonus boards.
- NOT for choosing outcomes (`build-game-server-rgs`, `math-rtp-modeling`) or count-ups (`build-win-presentation`).

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser renderer, Node server and exact integer/decimal money. Use sprites and presentation-configured timing; optional pooled Spine and perspective effects follow the title's needs. Other stacks map the public board to their display tree, curves to easing, and pools to their resource lifecycle. These renderer choices are recommendations, not MSS frontend implementations.

## Process

1. Identify the actual public outcome contract before building its adapter. Strip slots use supplied stop indices with the documented strips/indexing; snapshot slots use ordered grids and events. MSS `games/tothetop/game-logic.ts` `playMain` supplies `stopIndex`; MSS `games/coinUp/gamePlay.ts` `BaseGameView` and `buildResponse` supply grids and bonus data without stop indices.
2. Preserve recorded boards as immutable input. Render into separate view objects; never mutate snapshots through shared cells or pool resets. MSS `games/coinUp/gameLogic.ts` `playBonus` records cloned respin grids and a final grid.
3. Replay events in their documented order, including collectors, upgrades and reveals. For CoinUp use MSS `games/coinUp/FRONTEND.md` `Respin` and its presentation-order contract; do not recompute collector values or payouts in the client.
4. Select normal/turbo durations and curves from presentation config unless the actual server contract supplies them. Missing server motion fields are not an invalid result. Map each animation's endpoint to the authoritative board; filler motion may never alter it.
5. Acquire/reset symbol views with explicit ownership. If using Spine, release instances when their animation completes; reset listeners, transforms and effects before reuse. Oversized visuals may share a renderer owner, but must not alias mutable server data.
6. Keep resizing and visual skipping cosmetic. Recompute size-dependent transforms on layout changes; update animated effects when needed. Use `build-game-flow` for continuation and skip boundaries.

## Correctness constraints

- **C9:** Server-determine, finalize and audit-log the outcome before result animation; visuals cannot influence it. Do not equate audit logging with cryptographic commit-reveal: commit-reveal is a separate provably-fair transparency protocol, not a universal certification prerequisite. Title-specific certification requirements remain **(unverified)** in MSS.

## Pitfalls / red flags

Requiring stop indices for snapshot games; inventing server timing fields; client payout reconstruction; mutated historical boards; stale pooled state; correcting a mismatch by requesting another outcome.

## Verification

Compare every rendered stop/grid and event sequence with fixtures from the actual response contract. MSS `games/coinUp/test-coinUp.test.ts` response-hygiene tests pin its public keys. Test normal/turbo endpoint equality, unchanged input snapshots and pool/listener cleanup. Record browser/device evidence separately; server fixtures do not prove rendering or GPU performance.
