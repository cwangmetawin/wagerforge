# wagerforge Wave 1b — Math Core Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. **No git** (skip commits). Work only in `wagerforge/`. Tests: `node --test 'scripts/**/*.test.mjs'`. Gate: `node scripts/validate.mjs` → 0 errors (enforces `[Cn]` constraint sections).

**Goal:** Ship the slot/probability math core — a tested `scripts/rtp.mjs` (closed-form RTP/house-edge/variance/hit-frequency, Monte-Carlo with convergence CIs, required-N, RTP validation, crash/limbo closed forms) plus `math-rtp-modeling`, `math-montecarlo-simulation`, `qa-math-validation`, a `/wagerforge:rtp-check` command, a `slot-math-designer` agent, and a math-edit hook branch.

**Architecture:** `scripts/rtp.mjs` is the runnable math tool; skills are thin knowledge referencing it and encoding C1 (multilinear RTP) and C4 (convergence-to-tolerance, not raw spin count). Monte-Carlo can draw from the Wave-1a `fair-rng.mjs` for reproducible sims.

**Tech Stack:** Node, `node:test`, zero deps (imports `fair-rng.mjs` for the integration test).

---

## File Structure
| File | Responsibility |
|---|---|
| `scripts/rtp.mjs` | `rtpFromOutcomes`, `monteCarlo`, `requiredN`, `validateRtp`, `crashSurvival`, `crashEV` |
| `scripts/rtp.test.mjs` | closed-form + convergence + integration tests |
| `skills/math-rtp-modeling/SKILL.md` | RTP from reels/paytable; multilinear weight impact (C1) |
| `skills/math-montecarlo-simulation/SKILL.md` | empirical RTP/variance; convergence (C4) |
| `skills/qa-math-validation/SKILL.md` | implemented game matches target RTP (C4) |
| `commands/rtp-check.md` | `/wagerforge:rtp-check` → qa-math-validation + montecarlo |
| `agents/slot-math-designer.md` | agent bound to math-* |
| `hooks/rng-edit-reminder.mjs` | EXTEND: also fire an RTP reminder on math/rtp/paytable/reel paths |

---

## Task 1: `scripts/rtp.mjs` (TDD)

**Files:** Create `scripts/rtp.mjs`, Test `scripts/rtp.test.mjs`

- [ ] **Step 1: Write the failing test** — create `scripts/rtp.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rtpFromOutcomes, monteCarlo, requiredN, validateRtp, crashSurvival, crashEV } from './rtp.mjs'
import { fairFloat } from './fair-rng.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('rtpFromOutcomes: fair double-or-nothing', () => {
  const r = rtpFromOutcomes([{ p: 0.5, payout: 0 }, { p: 0.5, payout: 2 }])
  near(r.rtp, 1); near(r.houseEdge, 0); near(r.hitFreq, 0.5); near(r.variance, 1); near(r.sd, 1)
})

test('rtpFromOutcomes: a 96% RTP game', () => {
  const r = rtpFromOutcomes([{ p: 0.9, payout: 0 }, { p: 0.1, payout: 9.6 }])
  near(r.rtp, 0.96); near(r.houseEdge, 0.04); near(r.hitFreq, 0.1)
})

test('monteCarlo: deterministic sample array gives exact stats', () => {
  const mc = monteCarlo((i) => (i % 2 === 0 ? 0 : 2), 10000)
  near(mc.rtp, 1); near(mc.hitFreq, 0.5); near(mc.variance, 1); near(mc.sd, 1)
  near(mc.ciHalfWidth, 1.96 * 1 / Math.sqrt(10000)) // 0.0196
})

test('monteCarlo: seeded fair-rng sample is reproducible and near true RTP', () => {
  const sample = (i) => (fairFloat('srv', 'cli', i) < 0.5 ? 0 : 2)
  const a = monteCarlo(sample, 20000)
  const b = monteCarlo(sample, 20000)
  assert.equal(a.rtp, b.rtp) // deterministic
  assert.ok(a.rtp > 0.9 && a.rtp < 1.1, `rtp ${a.rtp}`)
})

test('requiredN: CI-half-width formula', () => {
  assert.equal(requiredN(3, 0.01), 345744)   // ceil((1.96*3/0.01)^2)
  assert.equal(requiredN(1, 0.01), 38416)
  assert.throws(() => requiredN(3, 0))
})

test('validateRtp: passes only when within CI AND converged (C4)', () => {
  const sample = (i) => (fairFloat('srv', 'cli', i) < 0.5 ? 0 : 2)
  const ok = validateRtp(sample, 1.0, { n: 50000, tolerance: 0.05 })
  assert.equal(ok.pass, true)
  assert.equal(ok.withinCi, true)
  assert.equal(ok.converged, true)
  // too few spins → not converged even if close
  const tooFew = validateRtp(sample, 1.0, { n: 100, tolerance: 0.001 })
  assert.equal(tooFew.converged, false)
  assert.equal(tooFew.pass, false)
})

test('crash closed forms: constant edge', () => {
  near(crashSurvival(2, 0.01), 0.495) // (1-0.01)/2
  near(crashSurvival(0.5, 0.01), 1)   // below 1.0 → certain
  near(crashEV(0.04), 0.96)           // EV per unit at any target
})
```

- [ ] **Step 2: Run, verify fail** — `node --test 'scripts/rtp.test.mjs'` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `scripts/rtp.mjs`:

```js
// Closed-form and Monte-Carlo RTP / volatility tooling.
// RTP is a SUM over outcomes of probability × payout — and a MULTILINEAR function of
// per-reel weights (see C1): never assume a single weight scales RTP proportionally.

export function rtpFromOutcomes(outcomes) {
  let rtp = 0
  let hitFreq = 0
  for (const { p, payout } of outcomes) {
    rtp += p * payout
    if (payout > 0) hitFreq += p
  }
  let variance = 0
  for (const { p, payout } of outcomes) variance += p * (payout - rtp) ** 2
  return { rtp, houseEdge: 1 - rtp, hitFreq, variance, sd: Math.sqrt(variance) }
}

// sampleFn(i) -> payout multiple for trial i. n trials.
export function monteCarlo(sampleFn, n, { z = 1.96 } = {}) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer')
  let sum = 0
  let sumSq = 0
  let hits = 0
  for (let i = 0; i < n; i++) {
    const x = sampleFn(i)
    sum += x
    sumSq += x * x
    if (x > 0) hits++
  }
  const mean = sum / n
  const variance = Math.max(0, sumSq / n - mean * mean)
  const sd = Math.sqrt(variance)
  const ciHalfWidth = (z * sd) / Math.sqrt(n)
  return { rtp: mean, n, variance, sd, hitFreq: hits / n, ciHalfWidth, ci: [mean - ciHalfWidth, mean + ciHalfWidth] }
}

// Spins needed so the CI half-width < tolerance at confidence z (C4: sufficiency is a CI
// property driven by volatility, NOT a fixed "1M spins").
export function requiredN(sdPerSpin, tolerance, z = 1.96) {
  if (tolerance <= 0 || sdPerSpin < 0) throw new Error('tolerance>0 and sdPerSpin>=0 required')
  return Math.ceil(((z * sdPerSpin) / tolerance) ** 2)
}

// An implemented game matches a target RTP only if the simulated mean is within the CI
// AND the CI half-width is below tolerance (converged).
export function validateRtp(sampleFn, targetRtp, { n, tolerance, z = 1.96 } = {}) {
  const mc = monteCarlo(sampleFn, n, { z })
  const withinCi = Math.abs(mc.rtp - targetRtp) <= mc.ciHalfWidth
  const converged = mc.ciHalfWidth <= tolerance
  return { ...mc, targetRtp, withinCi, converged, pass: withinCi && converged }
}

// Constant-house-edge crash/limbo: P(crash >= x) = (1-h)/x for x>=1, EV = (1-h) at any target.
export function crashSurvival(x, houseEdge) {
  return x < 1 ? 1 : (1 - houseEdge) / x
}
export function crashEV(houseEdge) {
  return 1 - houseEdge
}
```

- [ ] **Step 4: Run, verify pass** — `node --test 'scripts/rtp.test.mjs'` → all 7 tests PASS.

---

## Task 2: math + qa skills

- [ ] **Step 1: `skills/math-rtp-modeling/SKILL.md`**

```markdown
---
name: math-rtp-modeling
description: Use when modeling, computing, or tuning a slot or game's RTP and house edge from reel strips, paytables, and symbol weights — or estimating how a weight change moves RTP. Keywords RTP, house edge, reel weights, paytable, hit frequency.
constraints: C1
---

# math-rtp-modeling

## When to use / When NOT
- Use when: deriving RTP/house-edge/hit-frequency from a model, or estimating a weight change's RTP impact.
- NOT for: empirically validating an implementation (→ `math-montecarlo-simulation` / `qa-math-validation`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `rtpFromOutcomes`. Other stacks: same `RTP = Σ P(outcome)·payout`; build outcomes from reel-weight products.

## Process
1. Enumerate outcomes (or their probabilities from reel-weight products) with payouts; `RTP = Σ p·payout`; `houseEdge = 1 − RTP`.
2. Variance includes ALL outcomes (losses too) — never drop zero payouts.
3. Weight change: recompute the full weighted RTP; do NOT scale proportionally.

## Correctness constraints
- **C1:** RTP is a MULTILINEAR function of per-reel probabilities. Changing one symbol's weight changes only the combinations using it (linearly per combination), and reel normalization simultaneously lowers every other symbol's contribution — so the net total-RTP move is small and can even be opposite-signed. Estimate via full weighted recomputation, weighted by EV/contribution share, NOT by fraction of wins.

## Pitfalls / red flags
Proportional-scaling intuition (C1); excluding losses from variance; conflating on-screen visibility weight with payline probability.

## Verification
`rtpFromOutcomes` closed-form tests; cross-check against `math-montecarlo-simulation`.
```

- [ ] **Step 2: `skills/math-montecarlo-simulation/SKILL.md`**

```markdown
---
name: math-montecarlo-simulation
description: Use when empirically estimating a game's RTP, volatility, or hit frequency by simulation, and deciding how many spins are enough. Keywords Monte Carlo, simulation, convergence, confidence interval, variance.
constraints: C4
---

# math-montecarlo-simulation

## When to use / When NOT
- Use when: running large-N simulations and reporting RTP with confidence bands.
- NOT for: the closed-form model (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `monteCarlo`/`requiredN`, sampling from `fair-rng.mjs` for reproducibility. Other stacks: same CI math.

## Process
1. Drive trials from a seeded RNG so runs are reproducible.
2. Report mean (RTP), variance, hit frequency, and the 95% CI (`ciHalfWidth = 1.96·sd/√n`).
3. Choose N with `requiredN(sdPerSpin, tolerance)` — size to a target CI, not a round number.

## Correctness constraints
- **C4:** "1M spins is sufficient" is FALSE. Sufficiency is a CI-width property: half-width `= 1.96·SD_perSpin/√N`. High-volatility games need 5M–10^9 spins to reach a tight tolerance. Accept only when the declared RTP lies within the simulated CI at the required confidence.

## Pitfalls / red flags
Fixed "1M = done" (C4); unseeded/non-reproducible sims; ignoring volatility when sizing N; peeking and stopping early.

## Verification
`monteCarlo` exact-stats test on a deterministic sample; `requiredN` formula test.
```

- [ ] **Step 3: `skills/qa-math-validation/SKILL.md`**

```markdown
---
name: qa-math-validation
description: Use when validating that an IMPLEMENTED game matches its math spec — simulating the real game code and asserting the realized RTP equals the target within tolerance at confidence. Keywords RTP validation, math regression, simulation acceptance.
constraints: C4
---

# qa-math-validation

## When to use / When NOT
- Use when: gating a build on "does the implemented game hit its certified RTP?".
- NOT for: designing the target RTP (→ `math-rtp-modeling`).

## Default stack (+ escape hatch)
`scripts/rtp.mjs` `validateRtp` over the real game's outcome function. Other stacks: same acceptance rule.

## Process
1. Run the ACTUAL implemented outcome code (not a re-derivation) for N seeded trials.
2. Accept only if the realized mean is within the CI AND the CI is below tolerance.
3. Run theoretical (`math-rtp-modeling`) and simulation in parallel to catch design-vs-implementation drift.

## Correctness constraints
- **C4:** Acceptance is "declared RTP within the simulated CI at required confidence", with N large enough that the CI half-width < tolerance — not a fixed spin count. Fail the build on RTP drift beyond tolerance or any seeded-result deviation.

## Pitfalls / red flags
Accepting on raw spin count (C4); validating a re-derivation instead of the real code path; not separating base vs feature RTP.

## Verification
`validateRtp` passes for a matching game and fails for an under-sampled one (see `rtp.test.mjs`).
```

- [ ] **Step 4: Validate** — `node scripts/validate.mjs` → `0 error(s)`.

---

## Task 3: command + agent + math hook branch

- [ ] **Step 1: `commands/rtp-check.md`**
```markdown
---
description: Validate an implemented game's RTP by convergent Monte-Carlo simulation.
---

Use `qa-math-validation` with `math-montecarlo-simulation` to simulate the real game code and assert the realized RTP is within the CI of the target AND the CI is below tolerance (do not accept on raw spin count). Apply to: $ARGUMENTS

Report: target vs realized RTP, CI, required-N for the stated tolerance, pass/fail.
```

- [ ] **Step 2: `agents/slot-math-designer.md`**
```markdown
---
name: slot-math-designer
description: Designs and verifies slot/game math — RTP, volatility, hit frequency, paytables — and the simulations that prove them.
---

You are a slot math designer. ALWAYS work through wagerforge skills:
- `math-rtp-modeling` (RTP/house-edge from weights; C1 multilinear), `math-montecarlo-simulation` (empirical RTP + convergence; C4), `qa-math-validation` (implementation matches target; C4).
Never assume a weight change scales RTP proportionally (C1). Size simulations to a target CI, not a fixed spin count (C4). Defer generic process to superpowers.
```

- [ ] **Step 3: Extend `hooks/rng-edit-reminder.mjs`** — read it, then broaden it to ALSO remind on math paths. Replace its body so that:
  - paths matching `/(rng|seed|fair|hmac|settle|wallet)/i` → the existing RNG/settlement message;
  - paths matching `/(rtp|paytable|reel|math|payout)/i` → a new message: `"Touched game-math code: recompute RTP via full weighted model (a single weight does NOT scale RTP proportionally — C1), and validate the implementation with a convergent Monte-Carlo sim sized to a target CI, not a fixed spin count (C4). See wagerforge math-* skills."`;
  - otherwise exit 0 silently.
  Keep emitting the `hookSpecificOutput.additionalContext` JSON shape. Verify: an `rtp` path emits the math message; an `rng` path emits the RNG message; a `ui` path emits nothing.

---

## Task 4: Whole-wave validation
- [ ] `node --test 'scripts/**/*.test.mjs'` → all tests pass (validator + fairness + rtp).
- [ ] `node scripts/validate.mjs` → `0 error(s)`.
- [ ] `ls skills commands agents` shows the new math skills, `rtp-check`, `slot-math-designer`.

## Self-Review (author)
- Coverage: spec §5 math MVP (`math-rtp-modeling`, `math-montecarlo-simulation`) + `qa-math-validation`; §7 C1, C4; §9 rtp command/agent/hook.
- Placeholders: none — `rtp.mjs` complete; all test values are closed-form exact; skills constraint-section-complete.
- Names: exports (`rtpFromOutcomes`,`monteCarlo`,`requiredN`,`validateRtp`,`crashSurvival`,`crashEV`) match the test imports.
```
