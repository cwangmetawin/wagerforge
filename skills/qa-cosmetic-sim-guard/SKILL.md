---
name: qa-cosmetic-sim-guard
description: Use when adding a CI guard that a game visual or physics simulation matches the server-decided outcome - e.g. Plinko physics landing equals the server bucket index. Keywords cosmetic sim, physics guard, visual regression, server outcome.
---

# qa-cosmetic-sim-guard

## When to use / When NOT
- Use when: a game runs a real physics/visual simulation (Plinko balls, wheels, dice) for feel, but the SERVER decides the outcome, and you need a guard that the simulated landing equals the server result.
- NOT for: validating the server math itself (→ `qa-monte-carlo-cert`, `qa-math-validation`); generic image-diff visual regression of UI (→ a Playwright/screenshot harness).

## Default stack (+ escape hatch)
Default: TS + Matter.js (or PixiJS physics) + Node test runner. Other stacks: any deterministic 2D physics engine works — map "engine step" → fixed-dt tick, "bodies" → static pegs + one ball.

## Process
1. **Server is authoritative.** The round response carries `multiplierIndex` (the bucket the server picked). The client must OVERWRITE the physics-derived landing with this index before paying or animating — never trust the simulated bucket as the result.
2. **Make the sim deterministic.** Fix the timestep (constant `dt`, no `delta` from `requestAnimationFrame`), use static immovable pegs, a fixed ball spawn, and seed any jitter from `multiplierIndex`. Same index in ⇒ same trajectory out.
3. **Derive the landing bucket** from the settled ball's x-position and assert it equals the server `multiplierIndex`.
4. **Wire two asserts off one helper:**
   - dev-only runtime assert (throws/logs in dev, no-op in prod) so drift is caught while developing.
   - a CI test that, for every bucket index, drops the seeded ball and asserts `simulatedIndex === multiplierIndex`.
5. **Fail the build** on any mismatch. This is the guard that does not exist in the wild, so physics regressions (peg moved, gravity/dt changed, spawn shifted) currently ship silently.

## Pitfalls / red flags
- Treating the physics result as the payout source — it is cosmetic only; the server index always wins.
- Variable-dt stepping or RNG jitter not seeded from the index → non-reproducible landings, flaky CI.
- Dynamic/movable pegs, or spawn position depending on viewport size → trajectory drifts across machines.
- Asserting a screenshot instead of the bucket index — slow, brittle, and misses the actual invariant.
- No prod escape hatch: a hard throw in production turns a cosmetic glitch into a broken round; degrade to the server index instead.

## Verification
- A CI test loops every `multiplierIndex`, simulates, and asserts the settled bucket matches; perturbing a peg, gravity, or `dt` makes it fail.
- The dev assert fires locally when sim and server disagree; production renders the server index regardless of where the ball appears to land.
