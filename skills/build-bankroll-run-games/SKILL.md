---
name: build-bankroll-run-games
description: Use when building automated bankroll runs, strategy-driven batches of hands or spins, free chunk continuations, STOP recovery, legacy run migration, or bankroll-versus-turnover accounting.
metadata:
  constraints: C2, C12
---

# build-bankroll-run-games

> **Core insight:** A bankroll run is one funded wallet round with internal wagers; chunks preserve funding, accepted rules, random-stream position, and recovery of surviving funds.

## When to use / When NOT

- Use for one buy-in funding automated hands/spins under a declared strategy.
- For interactive shared tables use `build-live-table-games`; for ordinary one-round decision batching use `build-minigame-from-scratch`.

## Default stack + escape hatch

TypeScript + PixiJS/Phaser + Node + exact integer atoms. Other stacks map run state/wallet writes to durable storage/atomic transactions.

## Process

1. Validate bankroll, currency grid, strategy, count, hand funding and termination policy; snapshot accepted economics. Atomically debit once and persist OPEN before outcomes. Bind identity to player/currency/configuration/content; conflicting reuse rejects. Insufficient placement is terminal REJECTED.
2. Fix each internal wager's funding before accessing its outcome; never debit count × stake externally. Persist bankroll, cumulative wagered/returned atoms and progress: `bankroll = committed - wagered + returned`. Include pushes and additional stakes. MetaWin's production server (MSS) `games/baccarat-1000/run.ts` `settleChunk` records net movement and gross stake/return totals.
3. Version seed-word count/order, uint32 arithmetic, warmup and reduction; warm only on creation. Persist sealed stream, shoe/sequence and cursor across chunks/restarts/reshuffles; never reseed, skip or replay draws. MSS `games/baccarat-1000/sequence.ts` `openStream` defines expansion; `createStream` resumes state. Reproducibility does not prove CSPRNG security. Hide future results. `fair-shoe-draw-ledger`/`fair-verify`: verify player-retained commitment before the first bet, player-generated client seed and contiguous nonces; missing evidence is UNVERIFIABLE.
4. Make continue/STOP free actions; an opening-bet transport echo is not a new stake. Continue revalidates executable strategy before draws. STOP validates persisted money but never executes or requires a valid strategy; it returns surviving bankroll. MSS `games/blackjack-1000/state.ts` `normalizeRoundState` skips only strategy validation for STOP.
5. Non-terminal chunks credit zero externally. Persist termination before crediting surviving bankroll once, including zero-value closure. Identical receipts replay; changed content conflicts. Guard STOP/continue and settlement/refund races: one fate, rejected, settled or refunded. Use `build-durable-settlement` for wallet recovery.
6. Version rehydration/migration explicitly. Preserve old accepted rules and cursor; reject mixed or unknown shapes without defaulting money. MSS `games/roulette-1000/state.ts` `normalizeRoundState` accepts current/legacy shapes. Never reopen or redebit migrated runs.
7. Report per-stake return `Σ gross hand returns / Σ hand stakes` separately from bankroll return `Σ terminal credits / Σ buy-ins`; zero turnover is undefined. Unspent bankroll is not game return. MSS `games/baccarat-1000/SIM_RESULTS.md` `Per-stake return` distinguishes denominators. Separate platform payout caps/exposure admission from in-run rules; never clip the ledger silently.

## Correctness constraints

- **C2:** Debit is atomic, overdraft-safe and idempotent under serializable isolation; any balance cache updates with the ledger in the same ACID transaction. Never authorize from a cache/replica.
- **C12:** Require a CSPRNG with unrecoverable state; reseeding between bets/chunks is not mandatory. Unique-input keyed derivation is valid; resumed stream state stays private. NIST SP 800-90A/B/C cover DRBGs, entropy sources and constructions; none mandates per-bet reseeding.

## Pitfalls / red flags

Charging chunks again; replaying stale cursors; stranding STOP behind strategy validation; counting refunds as game return; replacing legacy rules mid-run.

## Verification

Test duplicate/concurrent placement, STOP/continue races and crash-before-credit recovery. Assert exact ledger identities, one debit/credit, zero-hand recovery, invalid-strategy STOP, off-grid/overflow rejection, legacy fixtures and uninterrupted/resumed parity through chunks/reshuffles. Measure both returns over complete independent runs and wallet grids via `qa-math-validation`; game tests cannot prove wallet persistence.
