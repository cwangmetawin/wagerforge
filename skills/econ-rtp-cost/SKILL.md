---
name: econ-rtp-cost
description: Use when accounting for a game aggregate RTP cost across base, bonus, free spins, multipliers, and jackpots, or judging whether a change needs re-certification. Keywords RTP cost, aggregate RTP, bonus cost accounting, margin.
constraints: C14
---

# econ-rtp-cost

## When to use / When NOT
- Use when: rolling base + bonus + free spins + multipliers + jackpot into one published aggregate RTP, attributing bonus cost to margin, or deciding if a change triggers re-cert.
- NOT for: deriving RTP from reel weights/paytables (→ `math-rtp-modeling`); empirical drift vs certified band at CI (→ `comp-rtp-certification`); pool funding mechanics (→ `econ-progressive-jackpot`).

## Default stack (+ escape hatch)
Server config RTP (`/game/info config.rtp`, `config.rtpValues`) is truth; client fallbacks are illustrative only. Other stacks: read the active variant's certified percent from the build/RTP config (`rtp.config.json`), never from UI strings.

## Process
1. Aggregate, don't average ad hoc: `RTP_total = Σ_component EV_component / wager`, summing base, bonus, free spins, multipliers, and jackpot contribution. One number is published.
2. Validate the aggregate by 1M+ Monte-Carlo through the real game code pre-launch; the simulated point estimate must land inside the certified band.
3. Keep volatility and hit frequency separate — they are orthogonal to RTP. A volatility/hit-freq retune that preserves EV does not move published RTP.
4. Bonus cost is a margin/LTV line, NOT an RTP line: operator-funded promotions outside the game RNG reduce net margin but leave certified RTP unchanged. Model real cost = bonus − houseEdge×wagering, adjusted for completion rate and sticky-vs-cashable.
5. Before deploying any RTP change, run the re-cert decision (see C14).

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert — display the active percent. Operator-funded promotions outside the game RNG do NOT change the certified RTP. Re-certification is required ONLY when the math model changes: symbol weights, paytable, or feature logic. Locking a variant at cert is normal; "RTP can never change post-deploy" is the folk error.

## Pitfalls / red flags
- Treating bonus spend as an RTP increase (it is a margin reduction — step 4, C14).
- Publishing a per-mode RTP instead of the aggregate, or summing modes by frequency they aren't actually played at.
- Trusting an inconsistent client RTP string over server config (illustrative ≠ truth).
- Assuming a volatility tweak needs re-cert, or that switching to a pre-certified variant does.
- Dropping the jackpot contribution from the aggregate.

## Verification
- Monte-Carlo aggregate estimate sits inside the certified band at stated CI.
- Sum of component EV contributions equals the single published RTP.
- Re-cert decision cites whether weights/paytable/feature logic changed (math model) vs. a variant switch or off-RNG promo (no re-cert).
