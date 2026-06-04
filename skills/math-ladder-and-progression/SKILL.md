---
name: math-ladder-and-progression
description: Use when designing ladder games (Dragon Tower, Mines) or a deterministic scatter-machine progression meter. Keywords ladder, Dragon Tower, Mines, cash-out, scatter machine, progression.
---

# math-ladder-and-progression

## When to use / When NOT
- Use when: deriving per-row multipliers/survival for a climb-or-cash-out game (Dragon Tower, Mines, Towers), or designing a deterministic level meter that replaces probabilistic free-spin triggers.
- NOT for: base RTP/paytable/weight modeling (→ `math-rtp-modeling`); empirical validation (→ `math-montecarlo-simulation`); provable-fairness derivation of the draws (→ `fair-*`).

## Default stack (+ escape hatch)
TS + Node + decimal.js; server-authoritative (client renders server-resolved rows/levels, never computes them). Other stacks: same closed forms — a ladder is `multiplier(row)`, a meter is a per-level weighted transition table.

## Process
1. **Ladder multiplier:** `multiplier(row) = RTP · (total/safe)^row`, where `safe = total − traps` per step (columns minus mines, eggs minus bombs). `total/safe` is the inverse per-step survival probability.
2. **Why EV is flat:** survival to row `r` is `(safe/total)^r`. At cash-out EV = `survival · multiplier · bet = RTP · bet` — the `(safe/total)^r` and `(total/safe)^r` cancel. EV is `RTP·bet` at EVERY cash-out row, so the player's cash-out choice never changes EV.
3. **Difficulty is a volatility dial, not an EV dial.** Raising traps (lower `safe/total`) steepens multipliers and lowers survival in lockstep; EV stays `RTP·bet`. Tune difficulty for variance/payout-spread, never to "set RTP" — RTP lives only in the leading factor.
4. **Progression meter:** model a deterministic level (e.g. 0..N). Each level holds a weighted transition table keyed by trigger count (one-scatter table, two-scatter table). On a trigger, sample the next level from that level's table; **3+ scatters skip straight to max**. Reward is by reached count via a capped lookup array (e.g. `[0,10,10,12,15,20,30]`, cap 100), not a per-spin random multiplier.
5. Keep transition tables and reward arrays server-side config; the client only displays the resolved level/reward.

## Pitfalls / red flags
- Believing a later cash-out is "+EV" or difficulty changes RTP — both wrong; EV is flat and RTP is the single leading factor.
- Using `total` instead of `safe` in the survival denominator, or recomputing `safe` without subtracting traps per remaining step in Mines-style picks.
- Treating the progression meter as probabilistic free-spin triggers — it is a deterministic meter advanced by weighted tables; forgetting the 3+ skip-to-max branch or the reward cap.

## Verification
- Assert `survival(row) · multiplier(row) == RTP` (within decimal tolerance) for every row — proves flat EV.
- Vary trap count: confirm multipliers/survival move but per-row EV stays `RTP·bet`.
- Replay a fixed trigger sequence through the transition tables: same level path and capped reward every time (determinism); confirm 3+ scatters reaches max.
