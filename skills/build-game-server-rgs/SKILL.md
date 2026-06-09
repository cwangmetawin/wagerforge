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
### Single-player (`IGame` — request-driven)
1. **Game contract:** `{ name, bets, play({bet,action,config,state,params}, random) -> { win, data, state?, next? }, config(variant), stats }`. The RNG is INJECTED (never imported), so runs are reproducible and certifiable.
2. **Deferred settlement:** settle only when `win > 0` or `state` is empty (`{}`); keep hidden state under an `_underscore` key; whitelist the client's next actions via `next[]`.
3. **Round-lock multi-step:** bet only on the first action; a roundId locks subsequent calls; cap wins with `>=`, never `==`. RGS reconnection state is exposed via `replay(...)`, NOT a `recover()` method — the RGS has none. The client/host null/204 "no open round" recovery rule lives in `build-instant-crash-games`/`build-game-flow`.

### Multiplayer (`IMultiplayerGame` — time-driven)
4. **Tick loop:** `{ name, bets, init, join, command, tick({time,config,state,commands}, random) -> {state,wins,cancels,messages,drawFinished,nextTickTime}, replay(state,playerId), config, stats }`. Phases are time-gated (`time >= phaseStartedAt + duration`); each phase limits accepted commands.
5. **Idempotency:** validate in BOTH `command()` (fast gate) AND `tick()` (authoritative — phase can change between them). Every command path must accept (push to `state.bets`) or cancel (`cancels.push(id)`); silent drops strand money. Dedup on `acceptedCommandIds`.
6. **Error recovery:** wrap the `tick()` body in try-catch; on fatal error refund ALL bets via `wins`, cancel pending commands, reset state, set `drawFinished:true`, broadcast an error.
7. **Deferred multiplayer payout:** during gameplay a non-empty `wins` map blocks message delivery (GDK framework bug), so accumulate sell/cash-out income into `state.pendingPayouts` and flush to `wins` only at round end.

## Pitfalls / red flags
Importing the RNG instead of injecting it; client-authored outcomes; equality (not `>=`) win caps; validate-after-RNG instead of before-RNG/before-debit; treating `recover()` as an RGS method (it doesn't exist — use `replay`); silently dropping a multiplayer command instead of accept-or-cancel; emitting `wins` mid-gameplay (defer via `pendingPayouts`).

## Verification
Single-player outcomes reproduce under an injected seeded RNG; round-lock rejects duplicate bets; max-win cap fires on `>=`. Multiplayer: duplicate commandIds land in `cancels[]`; a thrown error inside `tick()` refunds all stakes and resets; `pendingPayouts` is empty after round end.
