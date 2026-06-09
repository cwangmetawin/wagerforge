---
name: qa-cosmetic-sim-guard
description: Use when adding a CI guard that a game visual or physics simulation matches the server-decided outcome - e.g. Plinko physics landing equals the server bucket index. Keywords cosmetic sim, physics guard, visual regression, server outcome.
---

# qa-cosmetic-sim-guard

## When to use / When NOT
- Use when: a game runs a physics/visual sim (Plinko balls, wheels, dice) but the SERVER decides the outcome, and you need a guard that the simulated landing equals the server bucket.
- NOT for: validating server math (→ `qa-monte-carlo-cert`, `qa-math-validation`); generic image-diff UI regression (→ Playwright/screenshot).

## Default stack (+ escape hatch)
Default: TS + Matter.js (or PixiJS physics) + Node test runner. Other stacks: any deterministic 2D physics engine — map "engine step" → fixed-dt tick, "bodies" → static pegs + 1 ball.

## Process
1. **Server is authoritative.** The round response carries the bucket `multiplierIndex`; the client must OVERWRITE the physics-derived landing with it before paying or animating. (Real: `mini-game-plinko-100k/.../Canvas.tsx` derives index from `ball.position.x`, then `index = ball.multiplierIndex`.)
2. **Determinism model.** Production Plinko does NOT replay one trajectory per index; it rotates a POOL of pre-baked launch-X points keyed `[rows-8][multiplierIndex]` (`PlinkoProvider.tsx` does `pool.shift()`/`pool.push()` per drop), so the SAME index starts from a DIFFERENT x each drop. Reproducibility is per-drop: fixed launch-x + static immovable pegs + fixed timestep (`Runner.create({ isFixed: true, delta: 1000/60 })`) ⇒ same path. Your guard FIXES launch-x, never rotates.
3. **Snapshot the PHYSICS landing bucket** from the settled ball's x BEFORE the step-1 overwrite; assert it equals `multiplierIndex`.
4. **Two asserts, one helper:**
   - dev-only runtime assert (throws/logs in dev, no-op in prod) to catch drift early.
   - CI test that, per index, drops a fixed-launch-x seeded ball asserting `physicsDerivedIndex === multiplierIndex`.
5. **Fail the build** on mismatch. A degenerate check often exists but is BROKEN: `Canvas.tsx` compares the bucket label to `multipliers[index]` AFTER `index` was reassigned to the server index, so it can NEVER catch drift; `plinko-chao` ships the SAME broken check (`Canvas.tsx:278-295`). Both compare the server index to itself, so regressions (moved peg, changed gravity/dt, stale launch-x table) ship silently.

## Pitfalls / red flags
- Treating the physics result as the payout source — it is cosmetic; the server index wins.
- Asserting AFTER the overwrite (index vs itself) — snapshot the physics bucket BEFORE `index = ball.multiplierIndex`.
- Pre-baked launch-X tables (`physicsPattern.ts`, ~456 KB of `{x, y:-4}` points; header may mislabel them a "trajectory dataset") baked against frozen peg/gravity/restitution constants with NO CI guard: change a constant and launch-x lands in the wrong bucket.
- Variable-dt stepping or rotating the seed pool in the test → non-reproducible, flaky CI.
- Dynamic/movable pegs, or spawn tied to viewport size → trajectory drifts per machine.
- Asserting a screenshot, not the bucket index — slow, brittle, misses the invariant.
- No prod escape hatch: a hard throw in prod turns a cosmetic glitch into a broken round — degrade to the server index.

## Verification
- The CI test loops every `multiplierIndex`, simulates, asserts the settled bucket matches; perturbing peg, gravity, or `dt` fails it.
- The dev assert fires when sim and server disagree; production renders the server index regardless.
