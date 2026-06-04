---
name: build-instant-crash-games
description: Use when building the server state machine for instant/crash minigames - deferred settlement, a next action whitelist, and hidden state. Keywords instant game, crash server, deferred settlement, round lock, hidden state.
constraints: C2
---

# build-instant-crash-games

## When to use / When NOT
- Use when: writing the server-side multi-step state machine for an instant/crash minigame (mines, crash, tower) — deferred settlement, round locking, hidden server state.
- NOT for: reel/cascade slot flow (→ `build-game-flow`/`build-game-flow`); wallet debit/credit mechanics (→ `build-wallet-and-money`); RTP tuning (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
Default: TS `IGame.play(ctx, rng) → { win, data, state?, next? }`, RNG injected (never imported). Other stacks: map `play` → your round handler; `state` → any opaque per-round blob; `next` → your allowed-action enum.

## Process
1. **Settle** when `win > 0 || state empty`. A non-empty `state` means the round continues; an empty one (cashout/bust) settles it.
2. **Hidden state** lives under a reserved underscore key (`_seed`, `_grid`) that is NEVER serialized to the client — strip all `_`-prefixed keys before returning.
3. **Whitelist next actions** via a `next[]` array; the client may only call actions it contains. `next` drives the buttons.
4. **Bet only on the first action** (no `roundId` yet); issue a `roundId` and lock every subsequent call to it. Reject calls whose `roundId` mismatches the live round.
5. **`recover()` MUST return null / 204** when there is no live round. A truthy empty `{}` is read as a round and spawns a spurious one.
6. **Cap wins with `>=`, never `==`** — `finalWin = min(win, maxWin)` via a `>=` compare; equality misses every overshoot.

## Correctness constraints
- **C2:** Each money leg is an atomic, overdraft-safe, idempotent guarded write co-committed with the append-only ledger; never authorize spend from a cache or replica.

## Pitfalls / red flags
- Serializing `_`-prefixed hidden state (leaks the outcome).
- `recover()` returning `{}` instead of null/204 (spurious rounds).
- Win cap via `==`/`!==` instead of `>=` (uncapped overshoot).
- Accepting a bet on a non-first action, or skipping the `roundId` lock (replay/double-spend).
- Authorizing the debit from a replica instead of an atomic guarded ledger write (C2).

## Verification
- Hidden keys absent from every serialized response; `recover()` with no live round returns null/204.
- A second call without the live `roundId` is rejected; bet debits only once (idempotent), overshooting wins clamp to `maxWin`.
