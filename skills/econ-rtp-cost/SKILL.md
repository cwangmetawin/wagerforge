---
name: econ-rtp-cost
description: Use when accounting for a game aggregate RTP cost across base, bonus, free spins, multipliers, and jackpots, or judging whether a change needs re-certification. Keywords RTP cost, aggregate RTP, bonus cost accounting, margin.
constraints: C14
---

# econ-rtp-cost

## When to use / When NOT
- Use when: rolling base + bonus + free spins + multipliers + jackpot into one published aggregate RTP, attributing bonus cost to margin, or deciding if a change triggers re-cert.
- NOT for: deriving RTP from reel weights/paytables (→ `math-rtp-modeling`); empirical drift vs band at CI (→ `comp-rtp-certification`); pool funding (→ `econ-progressive-jackpot`).

## Default stack (+ escape hatch)
Server config RTP is truth; client fallbacks are illustrative (medusa ships client `rtp:"XX.XX"` placeholders). Host contract: `GET /game/info` → `config.targetRTP` (number, e.g. `0.97`), plus `config.maxMultiplier` for crash-family — the client only DISPLAYS these. Per-mode `rtpValues` is documentary/NOT-enforced; real RTP emerges from the math config, confirmed only by simulation. Other stacks: read the active variant's certified percent from the build/RTP config (`rtp.config.json`), never from UI strings.

## Process
1. Aggregate, don't average ad hoc: `RTP_total = Σ_component EV_component / wager`, summing base, bonus, free spins, multipliers, and jackpot contribution. Publish one number.
2. Validate the aggregate pre-launch by 1M+ Monte-Carlo through real game code (`slotify-gdk stats … -i 10000000 --variant=rtpXX`); the point estimate must land inside the certified band. Server `rtpValues` are NOT enforced — re-sim after any config change to confirm they still match.
3. Keep volatility and hit frequency separate — both orthogonal to RTP. An EV-preserving volatility/hit-freq retune does not move published RTP.
4. Bonus cost is a margin/LTV line, NOT an RTP line: operator-funded promotions outside the game RNG cut net margin but leave certified RTP unchanged. Model real cost = bonus − houseEdge×wagering, adjusted for completion rate and sticky-vs-cashable.
5. Before deploying any RTP change, run the re-cert decision (see C14).

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert — display the active percent. Operator-funded promotions outside the game RNG do NOT change certified RTP. Re-cert is required ONLY when the math model changes: symbol weights, paytable, or feature logic. Locking a variant at cert is normal; "RTP can never change post-deploy" is the folk error.

## Pitfalls / red flags
- Treating bonus spend as an RTP increase (it's a margin reduction — step 4, C14).
- Publishing a per-mode RTP instead of the aggregate, or summing modes by frequency they aren't actually played at.
- Trusting an inconsistent client RTP string over server config (illustrative ≠ truth).
- Assuming a volatility tweak, or a switch to a pre-certified variant, needs re-cert.
- Variant switch that never takes effect: gameplay must thread the variant (`config = configs[config.variant]`); a hardcoded `config = myRtpXXMathConfig` makes `config(variant)` move only the stats sim, not real play — a silent C14 trap.
- Dropping the jackpot contribution from the aggregate.

## Verification
- Monte-Carlo aggregate estimate sits inside the certified band at stated CI.
- Sum of component EV contributions equals the single published RTP.
- Re-cert decision cites whether weights/paytable/feature logic changed (math model) vs. a variant switch or off-RNG promo (no re-cert).
