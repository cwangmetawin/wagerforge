---
name: build-instant-crash-games
description: Use when implementing instant or crash minigame state machines, deferred payout, continuation actions, hidden state, abandoned rounds, or autobet parity.
metadata:
  constraints: C2
---

# build-instant-crash-games

> **Core insight:** Opaque state must survive persistence; only the client-visible envelope hides it. Round completion follows the game's state/action contract, never win>0 or object truthiness.

## When to use / When NOT

- Use for server-side instant/crash FSMs and continuation payouts.
- Reel/cascade flow: `build-game-flow`; wallet mechanics: `build-wallet-and-money`; RTP: `math-rtp-modeling`.

## Default stack + escape hatch

TypeScript IGame + injected RNG + Node, exact money boundaries and PixiJS/Phaser presentation. Other stacks map play/state/next to authoritative round handlers, persisted state and action enums.

## Process

1. Declare every action's money semantics: a paying opening, a free continuation, a binding shadow of the opening bet, or a new paid stake (Blackjack Double/Split). Never infer the mode from equal amounts; validate the declared debit mode and active hand before mutation or RNG. MetaWin's production server (MSS) `games/blackjack-multi-hands/index.ts` `server.bets` declares `double`/`split` as paying actions; MSS `games/mealOrNoMeal/index.ts` `server.bets` gives free continuations `available:[]`, `validate:false`. Platform owns wager/round IDs and atomic money movement; game code never mints IDs. Reject opening over a live round; MSS `games/fruitMachine/index.ts` `server.play` guards repeated spin.
2. Validate params, finite/ranged bets/targets, integer picks, difficulty enums and state shape before RNG/mutation. Re-derive legal actions from state on every call; `next[]` is not an authorization boundary. Throw coded errors for bad input, never return a fake zero-win loss. MSS `games/mealOrNoMeal/index.ts` `requireRound`/`openCase` guard state and offer cadence. Shape checks do not authenticate forged state; require trusted platform persistence.
3. Snapshot opening math/config and stake for continuations. MSS `games/mealOrNoMeal/index.ts` `pickKept` stores `_config`/`_bet`; continuations must not silently switch economics when a variant changes. Precompute randomness when the mechanics require it; later reveals must follow the same stored outcome.
4. Preserve all required opaque state in the RGS response, including underscore fields. Redact only client-visible envelope/data; never strip the persisted continuation state. MSS `games/mealOrNoMeal/index.ts` `noDeal` returns complete state. An underscore prefix alone provides no GDK `/play` masking: prove the platform's client projection hides unrevealed outcomes before launch.
5. For deferred minis using the empty-state convention, non-terminal payout is zero; emit final payout once with `state:{}`, `next:[]`. MSS `games/partyPong/index.ts` `cashout` retains terminal reveal state with `next:[]`; `win>0` is never a generic completion rule. Reconnect/no-open-round envelopes need an explicit platform contract: MSS `docs/GDK_CONTRACT.md` `IGame` has no `recover()` member.
6. Separate exposure multiplier, platform currency ceiling and certified action-level caps; enforce only applicable caps in matching units, including overshoots. MSS `games/deck52/gameLogic.ts` `playDeck52` has both caps; MSS `games/fruitMachine/index.ts` `spin` has no game currency ceiling. Preserve route-specific 100k substitutions (MSS `games/zeus100k/gamePlay.ts` `playMain`) instead of blanket `min(win,maxWin)`.
7. Implement abandoned-round `action()` and a paying one-round `autobet`; exemptions are single-step or a product waiver recorded in README. Require identical-draw payout parity and matching RNG consumption. Deliver spec, scaffold, README, SIM_RESULTS, FRONTEND and current GAME_RULES, following MSS `docs/DEVELOPMENT_WORKFLOW.md` Track A.

## Correctness constraints

- **C2:** Platform money legs must be atomic, overdraft-safe, idempotent guarded writes under serializable isolation, co-committed with the ledger; cache updates share the same ACID transaction. Never authorize spend from a cache/replica.

## Pitfalls / red flags

Deleted hidden state; trusted client state; illegal actions accepted from next alone; blanket caps; client-authored outcomes.

## Verification

Prove full persisted continuation and masking, invalid-input rejection without RNG/mutation, terminal payout once, abandoned-round/autobet parity, and clean second-round lifecycle through actual platform integration.
