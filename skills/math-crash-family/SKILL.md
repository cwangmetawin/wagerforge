---
name: math-crash-family
description: Use when building constant-house-edge continuous-target games - crash, limbo, dice, aviator - with inverse-CDF outcome, an instabust atom, and EV-invariance across targets. Keywords crash, limbo, dice, aviator, house edge, inverse CDF.
---

# math-crash-family

## When to use / When NOT
- Use when: deriving the math for a continuous cash-out / target game where one house edge `h` must hold for EVERY chosen target (crash, limbo, dice over/under, aviator).
- NOT for: discrete-outcome RTP from reel weights/paytables (→ `math-rtp-modeling`); ladder/Mines survival-cancel games; empirical convergence (→ `math-montecarlo-simulation`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `crashSurvival` / `crashEV`; sampler `rollCrashPoint(u, h)`. Other stacks: same closed form — survival `S(x)=(1−h)/x` and inverse-CDF sampling from a uniform `u∈[0,1)`.

## Process
1. **Win chance from target.** A player cashing at multiplier `m` wins iff the crash point ≥ `m`. `winChance = (1−h)/m` (×100 for percent). At `m=1`, winChance = `1−h`.
2. **Survival law.** `P(crash > x) = (1−h)/x` for `x ≥ 1`, and `1` for `x < 1`. This is `crashSurvival(x, h)`.
3. **Instabust atom.** Probability mass `1 − S(1) = h` sits exactly at `x = 1.0` (the "instabust"). Without this atom the distribution does not integrate to 1 and EV leaks.
4. **EV invariance.** Payout at target `m` is `m·bet`; EV `= winChance·m·bet = (1−h)/m·m·bet = (1−h)·bet` for ALL `m`. The target is a variance dial, never an EV dial. `crashEV(h) = 1−h`.
5. **Inverse-CDF sampler.** Given uniform `u`: if `u < h` → bust at `1.0` (consume the atom); else `crashPoint = (1−h)/(1−u)` — the survival-side uniform: continuous at `u=h` (→ exactly `1.0`) and never below `1.0`. That is `rollCrashPoint(u, h)`; `h` is per-game and **server-sourced** (live from `/game/info`; never hardcode `0.98`). Floor/round to display precision only after the raw value. (A second valid construction the RGS uses: a separate RTP-gating roll `prob ≤ targetRTP` with multiplier `1/(1−u)`.)
6. **N parallel rungs.** Running `N` independent geometric streaks each staking `bet/N` preserves total EV `(1−h)·bet`; it reshapes variance, not edge.

## Pitfalls / red flags
- Dropping the instabust atom at `x=1` (mass `h`): probabilities no longer sum to 1; EV silently exceeds `1−h`.
- Letting EV drift with the target — if `winChance·payout` is not constant across `m`, the survival law is wrong.
- Pairing the `u<h` bust atom with `crashPoint=(1−h)/u` instead of `(1−h)/(1−u)` — yields sub-`1.0` values as `u→1` and a discontinuity at `u=h` (the shipped Chase/RGS code uses `(1−u)`). Omitting the `u<h` branch entirely also blows up / never busts.
- Applying display rounding before the inverse-CDF, biasing the realized edge.
- Splitting `N` rungs but rescaling stake by anything other than `bet/N`.

## Verification
- Closed form: assert `crashEV(h) === 1−h` and that `winChance·m` is constant across several `m`.
- Atom: `crashSurvival(1, h) === 1−h`, so `P(bust at 1) === h`.
- Sampler: Monte-Carlo `rollCrashPoint` over many `u`; mean cash-out EV at fixed target converges to `(1−h)·bet` within CI (cross-check via `math-montecarlo-simulation`).
