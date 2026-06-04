---
name: build-game-server-rgs
description: Use when building the server side of a game (the RGS) — the game contract, the bet to result to settle lifecycle, deferred settlement, and the multi-step round-lock protocol. Keywords RGS, game server, IGame, deferred settlement, round lock, bet lifecycle.
---

# build-game-server-rgs

## When to use / When NOT
- Use when: implementing the authoritative game server / remote game server.
- NOT for: the wallet/settlement internals (→ `build-wallet-and-money`/`build-durable-settlement`).

## Default stack (+ escape hatch)
Node game server with an injected RNG. Other stacks: keep the same contract and authority boundary.

## Process
1. **Game contract:** `{ id, bets, play(ctx, rng) -> { win, data, state?, next? }, config(variant), stats }`. The RNG is INJECTED (never imported), so runs are reproducible and certifiable.
2. **Deferred settlement:** settle when `win > 0` or state is empty; keep hidden state under a reserved key; whitelist the client's next actions via `next[]`.
3. **Round-lock multi-step:** bet only on the first action; a roundId locks subsequent calls; `recover()` must return null/204 (a truthy empty body spawns a spurious round); cap wins with `>=`, never `==`.

## Pitfalls / red flags
Importing the RNG instead of injecting it (breaks reproducibility); client-authored outcomes; truthy `recover()`; equality (not `>=`) win caps; validate-after-RNG instead of before-RNG/before-debit.

## Verification
Outcomes reproduce under an injected seeded RNG; round-lock rejects duplicate bets; recover() is a no-op when there is no open round.
