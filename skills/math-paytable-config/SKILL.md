---
name: math-paytable-config
description: Use when defining or parsing slot config-as-math - reel strips as int arrays, RLE-encoded paytables (payout = value/10 x bet), symbol tables - and separating on-screen visibility weight from payline probability. Keywords reel strip, paytable, RLE, symbol weight.
constraints: C1
---

# math-paytable-config

## When to use / When NOT
- Use when: authoring or parsing reel strips, RLE paytables, or symbol tables, and wiring config into the math model.
- NOT for: computing RTP/variance from that config (→ `math-rtp-modeling`); validating an implementation (→ `math-montecarlo-simulation`).

## Default stack (+ escape hatch)
TS config parser emitting `{reels, paytable, symbols}`. Other stacks: same shapes — reels `int[][]` keyed by mode; paytable `int[]` per symbol indexed by win-count; symbol map `id → {flags, dropWeight}`.

## Process
1. **Reel strips:** `reels[mode]` is `int[][]` keyed by mode (base/freegame/bonus), one inner array per reel of symbol ids. This is the source of truth for payline probability. De-stack oversized strips on parse.
2. **Paytable:** per symbol `paytable[id]` is an `int[]` indexed by win-count (matches or cluster size). RLE-decode runs into display ranges (`'8'`, `'13-14'`, `'19+'`). `payout = value / 10 × bet` — store integers (×10), divide on read.
3. **Symbol table:** `id → {name, isWild, isScatter, isHigh/Low, dropWeight}`. Treat `dropWeight` as visual-only. Tolerate intentional id collisions (two symbols sharing one id).
4. Validate at the boundary: ids referenced by reels/paytable exist in the symbol table; reject unknown modes; fail fast with the offending id.

## Correctness constraints
- **C1:** RTP is a MULTILINEAR function of per-reel weights; a single weight does NOT scale RTP proportionally. Recompute the full weighted RTP, weighted by EV/contribution share; the net move can even be opposite-signed. So `dropWeight` (visual cascade weight) is NEVER a probability — real probability lives in the server reel strips, which are the source of truth.

## Pitfalls / red flags
- Reading `dropWeight` as a payline probability (C1).
- Forgetting the ÷10 on payout, or storing floats instead of ×10 integers.
- Treating a static JSON paytable as truth — server `initData` wins; static is display-only fallback.
- Off-by-one on win-count indexing; dropping the `N+` open-ended top run.

## Verification
- Round-trip: encode designer table → `int[]` (×10) → decode to ranges → matches input.
- Every reel/paytable id resolves in the symbol table; cross-check decoded payouts feed `math-rtp-modeling` cleanly.
