---
name: build-instant-crash-games
description: Use when implementing instant or crash minigame state machines, how to charge and validate paid continuation actions such as Blackjack Double and Split, multi-hand turn order, deferred payout, continuation actions, hidden state, abandoned rounds, or autobet parity.
metadata:
  constraints: C2
---

# build-instant-crash-games

> **Core insight:** Opaque state must survive persistence; only the client-visible envelope hides it. Round completion follows the game's state/action contract, never win>0 or object truthiness.

## When to use / When NOT

- Use for authoritative instant/crash FSMs and continuation payouts.
- Reel/cascade flow: `build-game-flow`; wallet mechanics: `build-wallet-and-money`; RTP: `math-rtp-modeling`.

## Default stack + escape hatch

TypeScript IGame + injected RNG + Node, exact money and PixiJS/Phaser presentation. Other stacks map play/state/next to round handlers, persisted state and action enums.

## Process

1. Declare paying opening, free continuation, opening-bet shadow or new stake; equal amounts never determine debit mode. Validate mode/active hand before RNG/mutation. MetaWin's production server (MSS) `games/blackjack-multi-hands/index.ts` `server.bets` declares paid Double/Split. MSS `games/blackjack-multi-hands/index.ts` `resolvePaidContinuationAtoms` accepts explicitly declared top-level stake or immutable opening-bet echo plus side stake. Bind increment to active-subhand atoms; reject mixed encodings; verify one charge per route and aggregate only new stakes. MSS `games/mealOrNoMeal/index.ts` `server.bets` declares free `available:[]`, `validate:false`. Platform owns wager/round IDs and atomic payments; games never mint IDs. Reject live-round openings: MSS `games/fruitMachine/index.ts` `server.play`.
2. Validate params, finite/ranged bets/targets, integer picks, difficulty enums and state shape before RNG/mutation. Derive legality every call; `next[]` never authorizes. Throw coded errors, never fake zero-win losses. MSS `games/mealOrNoMeal/index.ts` `requireRound`/`openCase` guard state/offer cadence; shape checks never authenticate forged state: require trusted persistence. Ordered stable IDs plus seat/subhand metadata identify multi-hand turns: insert split siblings immediately after active hand, skip completed/inactive hands, settle when none playable. Reject wrong IDs; verify split/natural/bust transitions. MSS `games/blackjack-multi-hands/index.ts` `advanceOrSettle`.
3. Snapshot opening economics/stake; continuations never switch economics when variants change. MSS `games/mealOrNoMeal/index.ts` `pickKept` stores `_config`/`_bet`. Precompute randomness when required; reveals follow stored outcomes.
4. Preserve complete opaque RGS state, including underscore fields; redact only client envelope/data. MSS `games/mealOrNoMeal/index.ts` `noDeal` returns complete state. Underscores provide no GDK `/play` masking: prove client projection hides unrevealed outcomes before launch.
5. Empty-state deferred minis pay zero non-terminally, final payout once with `state:{}`, `next:[]`. MSS `games/partyPong/index.ts` `cashout` retains terminal reveal state with `next:[]`; `win>0` never determines completion. Reconnect/no-open-round envelopes need platform contracts: MSS `docs/GDK_CONTRACT.md` `IGame` lacks `recover()`.
6. Distinguish exposure multiplier, platform currency ceiling and certified action caps; enforce applicable units/caps including overshoots. MSS `games/deck52/gameLogic.ts` `playDeck52` has both caps; MSS `games/fruitMachine/index.ts` `spin` lacks game currency ceiling. Preserve route-specific 100k substitutions (MSS `games/zeus100k/gamePlay.ts` `playMain`), never blanket `min(win,maxWin)`.
7. Implement abandoned-round `action()` and paying one-round `autobet`; document single-step/product-waiver exemptions in README. Require identical-draw payout/RNG parity. Deliver spec, scaffold, README, SIM_RESULTS, FRONTEND and current GAME_RULES, following MSS `docs/DEVELOPMENT_WORKFLOW.md` Track A.

## Correctness constraints

- **C2:** Platform money legs must be atomic, overdraft-safe, idempotent guarded writes under serializable isolation, co-committed with the ledger; cache updates share the same ACID transaction. Never authorize spend from a cache/replica.

## Pitfalls / red flags

Deleted hidden state; trusted client state; illegal actions accepted from next alone; blanket caps; client-authored outcomes.

## Verification

Prove persisted continuation/masking, rejection without RNG/mutation, terminal payment once, abandonment/autobet parity and second-round lifecycle through platform integration.
