---
name: build-minigame-from-scratch
description: Use when scaffolding a new crypto minigame (plinko, mines, limbo, dice, crash) end to end — wiring the server-authoritative outcome, provable fairness, settlement, and a thin renderer. Keywords new minigame, scaffold, plinko, mines, limbo, crash, server-authoritative.
---

# build-minigame-from-scratch

## When to use / When NOT
- Use when: starting a new crypto minigame from zero.
- NOT for: slot-specific reel/symbol work (a slot is a different shape).

## Default stack (+ escape hatch)
A new MetaWin crypto minigame is a **thin React 19 + Vite app over the versioned `@mini-games/studio` GDK** (Zustand 5, TanStack Query 5, decimal.js) in the turbo/pnpm monorepo — scaffold by copying `apps/_mini-game-template`. The app is the skin; reusable logic (balance/session, fairness UI, autobet, money math) lives in the shared GDK. Pixi/Phaser is the *slot* renderer, not the minigame default — reach for it via the escape hatch only when a round needs a canvas/sprite scene. Other stacks: keep the same server-authoritative seam regardless of renderer.

## Process (compose existing skills — do not reinvent)
1. **Outcome on the server only:** derive with `fair-rng-core`; map with `fair-outcome-mappers`. The client renders the server-resolved result; it never computes the outcome.
2. **Provable fairness:** commit/reveal via `fair-commit-reveal`; ship an independent verifier via `fair-verify`.
3. **Round-lifecycle FSM + host session bracketing:** drive the play hook as `onMutate → startGameSession()` + reset UI; `onSuccess → setBalanceFromApi(response.balance)` then animate; `onError → endGameSession()` to release host balance ownership. (Bridge contract itself → `build-host-bridge`.)
4. **Math:** set house edge / payout table via the math skills; validate with `qa-math-validation`.
5. **Money:** settle via `build-durable-settlement` + `build-wallet-and-money` (idempotent, exactly-once).
6. **Compliance:** gate bets through `comp-responsible-gaming` limits.

## Pitfalls / red flags
Client-computed outcomes; trusting a server "verify" echo (use `fair-verify`); non-idempotent settlement; skipping RG limits; forgetting `endGameSession()` on error (host keeps balance locked); reusing the GDK's `MathOperations.roundUp()/roundDown()` as-is — their rounding modes are inverted (`roundDown` uses `ROUND_CEIL`), so fix on port.

## Verification
Outcome is reproducible from (seed,nonce); fairness verifier re-derives independently; settlement is idempotent; RTP validates.
