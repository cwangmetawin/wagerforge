---
name: build-minigame-from-scratch
description: Use when scaffolding a new real-money crypto minigame, defining an IGame state machine, adding one-round autobet, or preparing server, fairness, math, and frontend deliverables. Keywords new minigame, scaffold, plinko, mines, limbo, dice, crash, autobet.
---

# build-minigame-from-scratch

> **Core insight:** A new minigame is a validated server round contract: outcomes, continuation, abandonment and autobet must share documented economics and verifiable payment paths.

## When to use / When NOT

- Use when starting a single-player crypto minigame from a spec.
- NOT for reel-slot presentation or multiplayer settlement; use `build-slot-reels-symbols` or `build-game-server-rgs`.

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser presentation + Node server, with exact integer atoms or decimal money. Other stacks map `IGame` to their server adapter, opaque state to persisted round state, and the renderer to a read-only view. Frontend packages and host hooks require their own verified contract; MSS does not establish them.

## Process

1. Write the spec before scaffolding: economy, variants/default, actions, charged costs, strategy-dependent RTP, caps and disconnect policy. Follow MSS `docs/DEVELOPMENT_WORKFLOW.md` Track A.
2. Export a lean `IGame`: `name`, per-action `bets`, synchronous `play`, `config(variant)`, `action`, `simulate`, `proveFairness`, `stats`. The platform owns wager/round IDs. Use injected server RNG, `fair-rng-core`, `fair-outcome-mappers`, `fair-commit-reveal` and `fair-verify`; the client renders public results only.
3. Validate bet, params, state shape and action legality on every call; reject repeated/out-of-order commands with coded errors. Snapshot the resolved opening config and preserve complete opaque server state for continuation. Shape checks do not authenticate state; verify platform persistence and client masking. MSS `games/mealOrNoMeal/index.ts` `pickKept` and `requireRound` illustrate these boundaries.
4. Implement abandoned-round `action()` for multi-step games using the documented policy. MSS `games/fruitMachine/index.ts` `server.action` banks a pending win rather than gambling it.
5. Ship a paying `autobet`: one stake, one complete round, the player's interactive decision policy, terminal `next: []`; never batch several wagers or mark it `validate: false`. Record single-step or explicit product exemptions in README. Reuse interactive draws/order where possible; document genuine divergence and branch proofs. Test payout and RNG parity; MSS `games/partyPong/index.ts` `autobet` and `games/partyPong/test-partyPong.test.ts` cover both.
6. Verify full outcomes, including recursive features, and complete API-round payments. Route money to `build-wallet-and-money` / `build-durable-settlement`, limits to `comp-responsible-gaming`, and strategy/action/stake math evidence to `qa-math-validation`.
7. Deliver README, SIM_RESULTS, FRONTEND and current GAME_RULES. Update player rules with payout/mechanic changes; this new-game requirement does not require retrofitting released legacy games.

## Pitfalls / red flags

Deleting continuation fields; trusting `next` instead of server legality checks; treating a snapshot as authenticated input; missing abandonment/autobet; presenting pending winnings as credited money; copying unverified frontend helpers.

## Verification

Record commands/results for lint, tests, build and per-variant/action/strategy sims. Exercise malformed state, duplicate/out-of-order actions, variant changes during open rounds, abandonment, full proof replay, autobet parity and payment reconciliation. Verify the actual client envelope hides future outcomes; local tests alone do not establish this.
