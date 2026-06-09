---
name: math-ladder-and-progression
description: Use when designing ladder games (Dragon Tower, Mines, Pump, Pepe, per-difficulty crash cash-out ladders) or a deterministic scatter-machine progression meter. Keywords ladder, Dragon Tower, Mines, Pump, Pepe, cash-out, survival table, scatter machine, progression.
---

# math-ladder-and-progression

## When to use / When NOT
- Use when: per-row multipliers/survival for a climb-or-cash-out game (Dragon Tower, Mines, Towers), or a deterministic level meter replacing probabilistic free-spin triggers.
- NOT for: base RTP/paytable/weight modeling (→ `math-rtp-modeling`); empirical validation (→ `math-montecarlo-simulation`); provable-fairness draw derivation (→ `fair-*`); deck-conditional escalators where step odds depend on cards already drawn, so no fixed `safe/total` (Hilo → conditional-probability model).

## Default stack (+ escape hatch)
TS + Node + decimal.js; server-authoritative (client renders server-resolved rows/levels, never computes them). Other stacks, same models: a ladder is `multiplier(row)` or a per-step table; a meter is a per-level weighted transition table.

## Process
1. **Pick the ladder encoding** (all obey the step-2 survival-cancel EV; differ only in how per-step multipliers are stored):
   - **Closed form** — `multiplier(row) = RTP · (total/safe)^row`, `safe = total − traps` per step (Dragon Tower `RTP·(columns/eggs)^row`; Mines `(remaining/remaining−mines)` per pick). `total/safe` = inverse per-step survival.
   - **Explicit table** — server array of per-step multipliers + survival probs for irregular steps (Pepe River Run per-pad table; crash `rtp96.ts` easy/medium/hard/daredevil cash-out arrays). Validate it reproduces `RTP·bet` EV; don't assume a closed form.
   - **Player-paced step** — same survival/multiplier, player confirms each step (Pump, Flip, RPS). Math identical; only cadence differs (a ladder, not crash).
2. **Why EV is flat:** EV = `survival · multiplier · bet = RTP · bet` — survival `(safe/total)^r` and multiplier `(total/safe)^r` cancel at EVERY cash-out row, so the cash-out choice never changes EV (table form: `Σ` cancels likewise).
3. **Difficulty is a volatility dial, not an EV dial.** More traps (lower `safe/total`) steepen multipliers and lower survival together; EV stays `RTP·bet`. Tune for variance/payout-spread, never to "set RTP" — RTP is the leading factor.
4. **Progression meter:** a deterministic level (e.g. 0..N). Each holds a weighted transition table keyed by trigger count (one-scatter, two-scatter); on a trigger, sample the next level from it; **3+ scatters skip straight to max**. Reward is by reached count via a capped lookup array (e.g. `[0,10,10,12,15,20,30]`, cap 100), never a random multiplier.
5. Keep all multiplier/survival, transition and reward arrays server-side; the client renders only the resolved row/level/reward (real Dragon Tower/Mines `gameData.ts` hold only the server's `result.multiplier`).

## Pitfalls / red flags
- Believing a later cash-out is "+EV" or difficulty changes RTP — both wrong; EV is flat, RTP is the single leading factor. Assuming a closed form for an explicit-table ladder.
- Using `total` not `safe` in the survival denominator, or not subtracting traps per remaining step in Mines-style picks.
- Treating the progression meter as probabilistic free-spin triggers (it's deterministic, table-advanced); forgetting the 3+ skip-to-max branch or the reward cap.

## Verification
- Assert `survival(row) · multiplier(row) == RTP` (decimal tolerance) every row — proves flat EV.
- Vary trap count: multipliers/survival move but per-row EV stays `RTP·bet`.
- Replay a fixed trigger sequence through the tables: same level path and capped reward every time (determinism); confirm 3+ reaches max.
