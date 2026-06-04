---
name: build-minigame-from-scratch
description: Use when scaffolding a new crypto minigame (plinko, mines, limbo, dice, crash) end to end — wiring the server-authoritative outcome, provable fairness, settlement, and a thin renderer. Keywords new minigame, scaffold, plinko, mines, limbo, crash, server-authoritative.
---

# build-minigame-from-scratch

## When to use / When NOT
- Use when: starting a new crypto minigame from zero.
- NOT for: slot-specific reel/symbol work (a slot is a different shape).

## Default stack (+ escape hatch)
TypeScript + a thin Pixi/Phaser renderer + a Node game server. Other stacks: keep the same server-authoritative seam.

## Process (compose existing skills — do not reinvent)
1. **Outcome on the server only:** derive with `fair-rng-core`; map with `fair-outcome-mappers`. The client renders the server-resolved result; it never computes the outcome.
2. **Provable fairness:** commit/reveal via `fair-commit-reveal`; ship an independent verifier via `fair-verify`.
3. **Math:** set house edge / payout table via the math skills; validate with `qa-math-validation`.
4. **Money:** settle via `build-durable-settlement` + `build-wallet-and-money` (idempotent, exactly-once).
5. **Compliance:** gate bets through `comp-responsible-gaming` limits.

## Pitfalls / red flags
Client-computed outcomes; trusting a server "verify" echo (use `fair-verify`); non-idempotent settlement; skipping RG limits.

## Verification
Outcome is reproducible from (seed,nonce); fairness verifier re-derives independently; settlement is idempotent; RTP validates.
