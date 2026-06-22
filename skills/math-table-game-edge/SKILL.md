---
name: math-table-game-edge
description: Use when deriving house edge for discrete fixed-payout / fixed-odds TABLE games — dice over/under, roulette, baccarat, sicbo, darts, bars, flip, wheel — where probabilities are known and edge comes from paying below true odds. Keywords table game, house edge, fixed odds, dice, roulette, baccarat, sicbo, payout multiplier, payout table, per-bet-type RTP.
constraints: C4, C14
---

# math-table-game-edge

> **Core insight:** Table-game edge is the gap between paid odds and TRUE odds, baked into the payout multiplier/table itself — and it is per-bet-type, not per-game. There is no post-roll RTP gate; the GAME RTP is the bet-weighted blend of every bet type's RTP.

## When to use / When NOT
- Use when: deriving/tuning edge for a discrete fixed-payout game on KNOWN probabilities (dice over/under, roulette, baccarat, sicbo, darts, bars, flip, wheel).
- NOT for: continuous cash-out / EV-invariant targets (→ `math-crash-family`); reel-weight RTP, C1 (→ `math-rtp-modeling`); survival climb-or-cash-out ladders (→ `math-ladder-and-progression`); slot paytable encoding (→ `math-paytable-config`); the MC harness itself (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
Server-side TS; `fixValue` money; pre-certified `rtpNN` variants. Two constructions — same edge, different storage. Other stacks: same two formulas below.

## Process
Pick the construction; the RGS resolves the outcome and the client only renders it.
1. **Parametric** — `payoutMultiplier = targetRTP · (1/winChance)`. RTP = `targetRTP` exactly; edge = `1 − targetRTP`. (Real: primedice `Multiplier = (RTP×100)/Chance`; flip `targetRTP · 2^streak`.) `winChance` is the true probability of the chosen bet.
2. **Tuned payout table** — config `{outcome: probability, payout}`; per-bet-type `RTP = Σ pᵢ·payoutᵢ`. Choose payouts BELOW true odds to hit target. (Real: sicbo `{sum→payout}`, even-money ~97.22%, number ~98%, triples lower; darts & bars `{probability, payout}` tuned to rtp97/98/100.)
3. **maxWin cap.** If the multiplier is `min(maxWin, …)` (real: primedice), the cap truncates the realized payout on low-chance bets — realized RTP drops below `targetRTP`. Account for the cap-hit rate, don't assume the clean formula.
4. **Tie / commission atoms.** Encode them as their own bet types (baccarat 5% banker commission; tie carries a high edge) — never fold them into another bet's odds.

## Correctness constraints
- **C14:** RTP is a pre-certified, switchable variant (`rtp97/98/100`), server-sourced; the active % is displayed. Never hardcode RTP.
- **C4:** Validate per-bet-type RTP AND the bet-weighted blended GAME RTP by convergent large-N Monte-Carlo against the closed form.

## Pitfalls / red flags
- Adding a post-roll RTP gate (`prob ≤ targetRTP`, crash-family style) ON TOP of an already-edged multiplier/table — double-counts the edge.
- Reporting one game RTP when per-bet-type RTP varies (pattern B); the headline is the bet-weighted blend.
- Ignoring the `maxWin` cap-hit rate, overstating low-chance RTP.
- Folding commission/tie into another bet's odds; hardcoding RTP instead of a certified variant.

## Verification
- Closed form: assert per-bet RTP `= targetRTP` (parametric) or `= Σ pᵢ·payoutᵢ` (table); blend = `Σ wₜ·RTPₜ`.
- Monte-Carlo each bet type AND the blend to its closed form within CI; cap-hit cases match truncated EV.
