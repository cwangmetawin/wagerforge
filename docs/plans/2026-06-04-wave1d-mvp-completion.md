# wagerforge Wave 1d — MVP Completion (econ + comp + build knowledge)

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. **No git**. Work only in `wagerforge/`. Tests: `node --test 'scripts/**/*.test.mjs'`. Gate: `node scripts/validate.mjs` → 0 errors.

**Goal:** Complete the ⭐ MVP vertical slice across all 6 pillars by adding the economy and compliance cores plus the two build knowledge skills: `scripts/bonus.mjs` (C3-correct bonus economics), `scripts/responsible-gaming.mjs` (C13 server-clock limits), skills `econ-bonus-design`, `comp-responsible-gaming`, `build-minigame-from-scratch`, `build-game-server-rgs`, a `/wagerforge:new-minigame` command, and an `economy-designer` agent.

**Architecture:** Two small testable closed-form modules encode the two headline corrections (C3 bonus-cost sign, C13 server-clock enforcement). The two build skills are orchestration knowledge that compose the already-built fair/settlement/math skills.

**Tech Stack:** Node, `node:test`, zero deps.

---

## File Structure
| File | Responsibility |
|---|---|
| `scripts/bonus.mjs` | `bonusBreakEvenWR`, `bonusExpectedCost`, `isEvPositive` (C3) |
| `scripts/responsible-gaming.mjs` | `sessionExceeded`, `lossLimitBlocks`, `depositLimitBlocks` (C13) |
| `scripts/econ-comp.test.mjs` | closed-form tests for both modules |
| `skills/econ-bonus-design/SKILL.md` | bonus cost & EV (C3) |
| `skills/comp-responsible-gaming/SKILL.md` | server-side RG limits (C13) |
| `skills/build-minigame-from-scratch/SKILL.md` | scaffold a crypto minigame (composition skill) |
| `skills/build-game-server-rgs/SKILL.md` | IGame contract, deferred settlement, round-lock |
| `commands/new-minigame.md` | `/wagerforge:new-minigame` → build-minigame-from-scratch |
| `agents/economy-designer.md` | agent bound to econ skills |

---

## Task 1: `scripts/bonus.mjs` + `scripts/responsible-gaming.mjs` (TDD)

**Files:** Create `scripts/bonus.mjs`, `scripts/responsible-gaming.mjs`, Test `scripts/econ-comp.test.mjs`

- [ ] **Step 1: Write the failing test** — create `scripts/econ-comp.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bonusBreakEvenWR, bonusExpectedCost, isEvPositive } from './bonus.mjs'
import { sessionExceeded, lossLimitBlocks, depositLimitBlocks } from './responsible-gaming.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

test('bonus: C3-correct expected cost (house edge OFFSETS the give-away)', () => {
  // $100 bonus, 30x wagering, 96% RTP (edge 0.04): edge*wagering=120 of revenue offsets the $100
  const cost = bonusExpectedCost({ bonus: 100, wageringMultiple: 30, houseEdge: 0.04 })
  near(cost, -20)                 // negative = expected PROFIT
  assert.notEqual(cost, 220)      // the refuted naive "bonus + edge*wagering" answer
})

test('bonus: break-even wagering multiple = 1/edge', () => {
  near(bonusBreakEvenWR(0.04), 25)
  near(bonusExpectedCost({ bonus: 100, wageringMultiple: 25, houseEdge: 0.04 }), 0)
})

test('bonus: EV-positive iff wagering >= break-even', () => {
  assert.equal(isEvPositive({ wageringMultiple: 30, houseEdge: 0.04 }), true)
  assert.equal(isEvPositive({ wageringMultiple: 20, houseEdge: 0.04 }), false)
})

test('RG: session limit enforced on the SERVER clock (C13)', () => {
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 59 * 60000, limitMs: 60 * 60000 }), false)
  assert.equal(sessionExceeded({ sessionStartMs: 1000, nowMs: 1000 + 61 * 60000, limitMs: 60 * 60000 }), true)
  // clock manipulation (now < start) is rejected, not silently allowed
  assert.throws(() => sessionExceeded({ sessionStartMs: 5000, nowMs: 1000, limitMs: 1000 }), /monotonic/)
})

test('RG: loss and deposit limits block at the boundary', () => {
  assert.equal(lossLimitBlocks({ lossSoFar: 90, betAmount: 10, lossLimit: 100 }), false) // exactly at limit ok
  assert.equal(lossLimitBlocks({ lossSoFar: 95, betAmount: 10, lossLimit: 100 }), true)
  assert.equal(depositLimitBlocks({ depositedSoFar: 0, amount: 100, depositLimit: 100 }), false)
  assert.equal(depositLimitBlocks({ depositedSoFar: 50, amount: 60, depositLimit: 100 }), true)
})
```

- [ ] **Step 2: Run, verify fail** — `node --test 'scripts/econ-comp.test.mjs'` → FAIL.

- [ ] **Step 3a: Implement `scripts/bonus.mjs`:**

```js
// Bonus economics. The headline correction (C3): house-edge × wagering is operator REVENUE
// that OFFSETS the give-away — NOT an additive playthrough cost. Real net cost is further
// driven by completion rate and sticky-vs-cashable mechanics (modeled by the caller).

export function bonusBreakEvenWR(houseEdge) {
  if (!(houseEdge > 0)) throw new Error('houseEdge must be > 0')
  return 1 / houseEdge
}

// Expected cost per completing player = bonus − houseEdge × totalWagered.
// Negative = expected operator profit (the offer is EV-positive).
export function bonusExpectedCost({ bonus, wageringMultiple, houseEdge }) {
  if (!(bonus >= 0) || !(wageringMultiple >= 0) || !(houseEdge >= 0)) throw new Error('bad args')
  return bonus - houseEdge * (wageringMultiple * bonus)
}

export function isEvPositive({ wageringMultiple, houseEdge }) {
  return wageringMultiple >= bonusBreakEvenWR(houseEdge)
}
```

- [ ] **Step 3b: Implement `scripts/responsible-gaming.mjs`:**

```js
// Responsible-gaming limits. ALL enforced against an authoritative, monotonic SERVER clock
// (nowMs) — never device/client time (C13). The root cause of limit bypasses is trusting
// client-supplied values; server authority neutralizes clock manipulation by construction.

export function sessionExceeded({ sessionStartMs, nowMs, limitMs }) {
  if (nowMs < sessionStartMs) throw new Error('server clock must be monotonic (now < start)')
  return nowMs - sessionStartMs >= limitMs
}

export function lossLimitBlocks({ lossSoFar, betAmount, lossLimit }) {
  return lossSoFar + betAmount > lossLimit
}

export function depositLimitBlocks({ depositedSoFar, amount, depositLimit }) {
  return depositedSoFar + amount > depositLimit
}
```

- [ ] **Step 4: Run, verify pass** — `node --test 'scripts/econ-comp.test.mjs'` → 5 PASS. Then `node --test 'scripts/**/*.test.mjs'` → whole suite green.

---

## Task 2: econ + comp + build skills

- [ ] **Step 1: `skills/econ-bonus-design/SKILL.md`**

```markdown
---
name: econ-bonus-design
description: Use when designing or pricing a bonus, free-spin, or wagering-requirement offer and estimating its true expected cost or break-even. Keywords bonus, free spins, wagering requirement, playthrough, EV, completion rate.
constraints: C3
---

# econ-bonus-design

## When to use / When NOT
- Use when: setting a wagering requirement, estimating a bonus's expected cost / break-even.
- NOT for: aggregate game RTP accounting (→ `econ-rtp-cost`) — out of MVP scope.

## Default stack (+ escape hatch)
`scripts/bonus.mjs`. Other stacks: same formula.

## Process
1. Expected cost per completing player = `bonus − houseEdge × (wageringMultiple × bonus)`.
2. Break-even wagering multiple = `1/houseEdge`; at or above it the offer is EV-positive.
3. Adjust the real net cost by completion rate (~10–40% clear WR), sticky-vs-cashable, game-weighting, and abuse rules.

## Correctness constraints
- **C3:** Bonus cost is NOT `bonus + houseEdge×wagering`. The house-edge × wagering term is operator REVENUE (player expected loss) that OFFSETS the give-away. $100 @ 30× @ 96% RTP has expected cost `100 − 0.04×3000 = −$20` (a profit; break-even WR = 25×). Real net cost is dominated by completion rate and sticky-vs-cashable mechanics, not an additive playthrough term.

## Pitfalls / red flags
The additive-playthrough fallacy (C3); ignoring completion rate; modeling sticky bonuses as cashable; no max-bet/abuse controls.

## Verification
`scripts/econ-comp.test.mjs`: cost = −20 for the canonical case; break-even = 25×.
```

- [ ] **Step 2: `skills/comp-responsible-gaming/SKILL.md`**

```markdown
---
name: comp-responsible-gaming
description: Use when implementing responsible-gaming controls — deposit, loss, and session limits, reality checks, and self-exclusion — that must be enforced server-side. Keywords responsible gaming, deposit limit, loss limit, session limit, reality check, self-exclusion.
constraints: C13
---

# comp-responsible-gaming

## When to use / When NOT
- Use when: enforcing player protection limits.
- NOT for: jurisdiction certification paperwork (→ `comp-rtp-certification`, out of MVP scope).

## Default stack (+ escape hatch)
`scripts/responsible-gaming.mjs` + a server clock. Other stacks: enforce at the transaction/DB layer.

## Process
1. Enforce ALL limits server-side, at the transaction layer, before accepting the bet/deposit.
2. Time-based limits use an authoritative, monotonic server clock — never device time.
3. Reality checks and break intervals are configurable; limit increases require a cool-off.

## Correctness constraints
- **C13:** Enforce limits server-side against an authoritative, time-synced server clock; hard-block at the transaction/DB layer; never trust device time. The single root cause of clock-manipulation / losing-bet-edit / interception bypasses is trusting client values — server authority neutralizes it. For elapsed-time limits use a monotonic server clock (NTP precision matters only for absolute cut-offs).

## Pitfalls / red flags
Client-side limit enforcement (C13); trusting client timestamps; allowing limit increases without cool-off/reauth; limits less prominent than promotions.

## Verification
`scripts/econ-comp.test.mjs`: session/loss/deposit boundaries; clock-manipulation (now<start) rejected.
```

- [ ] **Step 3: `skills/build-minigame-from-scratch/SKILL.md`**

```markdown
---
name: build-minigame-from-scratch
description: Use when scaffolding a new crypto minigame (plinko, mines, limbo, dice, crash) end to end — wiring the server-authoritative outcome, provable fairness, settlement, and a thin renderer. Keywords new minigame, scaffold, plinko, mines, limbo, crash, server-authoritative.
---

# build-minigame-from-scratch

## When to use / When NOT
- Use when: starting a new crypto minigame from zero.
- NOT for: slot-specific reel/symbol work (a slot is a different shape).

## Default stack (+ escape hatch)
TypeScript + a thin Pixi/Phaser renderer + a Node game server. Other stacks: keep the same server-authoritative seam.

## Process (compose existing skills — do not reinvent)
1. **Outcome on the server only:** derive with `fair-rng-core`; map with `fair-outcome-mappers`. The client renders the server-resolved result; it never computes the outcome.
2. **Provable fairness:** commit/reveal via `fair-commit-reveal`; ship an independent verifier via `fair-verify`.
3. **Math:** set house edge / payout table via the math skills (`math-crash-family` etc.); validate with `qa-math-validation`.
4. **Money:** settle via `build-durable-settlement` + `build-wallet-and-money` (idempotent, exactly-once).
5. **Compliance:** gate bets through `comp-responsible-gaming` limits.

## Pitfalls / red flags
Client-computed outcomes; trusting a server "verify" echo (use `fair-verify`); non-idempotent settlement; skipping RG limits.

## Verification
Outcome is reproducible from (seed,nonce); fairness verifier re-derives independently; settlement is idempotent; RTP validates.
```

- [ ] **Step 4: `skills/build-game-server-rgs/SKILL.md`**

```markdown
---
name: build-game-server-rgs
description: Use when building the server side of a game (the RGS) — the game contract, the bet→result→settle lifecycle, deferred settlement, and the multi-step round-lock protocol. Keywords RGS, game server, IGame, deferred settlement, round lock, bet lifecycle.
---

# build-game-server-rgs

## When to use / When NOT
- Use when: implementing the authoritative game server / remote game server.
- NOT for: the wallet/settlement internals (→ `build-wallet-and-money`/`build-durable-settlement`).

## Default stack (+ escape hatch)
Node game server with an injected RNG. Other stacks: keep the same contract and authority boundary.

## Process
1. **Game contract:** `{ id, bets, play(ctx, rng) -> { win, data, state?, next? }, config(variant), stats }`. The RNG is INJECTED (never imported), so runs are reproducible and certifiable.
2. **Deferred settlement:** settle when `win > 0` or state is empty; keep hidden state under a reserved key; whitelist the client's next actions via `next[]`.
3. **Round-lock multi-step:** bet only on the first action; a roundId locks subsequent calls; `recover()` must return null/204 (a truthy empty body spawns a spurious round); cap wins with `>=`, never `==`.

## Pitfalls / red flags
Importing the RNG instead of injecting it (breaks reproducibility); client-authored outcomes; truthy `recover()`; equality (not `>=`) win caps; validate-after-RNG instead of before-RNG/before-debit.

## Verification
Outcomes reproduce under an injected seeded RNG; round-lock rejects duplicate bets; recover() is a no-op when there is no open round.
```

- [ ] **Step 5: Validate** — `node scripts/validate.mjs` → `0 error(s)`.

---

## Task 3: command + agent
- [ ] **Step 1: `commands/new-minigame.md`**
```markdown
---
description: Scaffold a new crypto minigame end-to-end (server-authoritative, provably fair, settled).
---

Use `build-minigame-from-scratch` to scaffold the game, composing `fair-rng-core`/`fair-outcome-mappers`/`fair-commit-reveal`/`fair-verify` for fairness, the math skills + `qa-math-validation` for the model, and `build-durable-settlement`/`build-wallet-and-money` for money. Gate bets through `comp-responsible-gaming`. Build: $ARGUMENTS

First run `superpowers:brainstorming` then `superpowers:writing-plans` before implementing.
```

- [ ] **Step 2: `agents/economy-designer.md`**
```markdown
---
name: economy-designer
description: Designs game economy and bonus offers — wagering requirements, expected cost, break-even, and EV — without the additive-playthrough fallacy.
---

You are an economy designer. ALWAYS work through wagerforge skills:
- `econ-bonus-design` (bonus cost & break-even; C3).
Never price a bonus as `bonus + houseEdge×wagering` — the house-edge term is revenue that offsets the give-away (C3). Account for completion rate and sticky-vs-cashable. Defer generic process to superpowers.
```

---

## Task 4: Whole-wave validation
- [ ] `node --test 'scripts/**/*.test.mjs'` → all pass.
- [ ] `node scripts/validate.mjs` → `0 error(s)`.
- [ ] Confirm all 6 pillars now have ≥1 skill: `math-*`, `fair-*`, `build-*`, `econ-*`, `qa-*`, `comp-*`.

## Self-Review (author)
- Coverage: completes spec §5 ⭐ MVP (`econ-bonus-design`, `comp-responsible-gaming`, `build-minigame-from-scratch`, `build-game-server-rgs`); §7 C3, C13; §9 new-minigame command + economy agent.
- Placeholders: none — both modules complete, tests exact, skills constraint-section-complete where tagged.
- Names: exports (`bonusBreakEvenWR`,`bonusExpectedCost`,`isEvPositive`,`sessionExceeded`,`lossLimitBlocks`,`depositLimitBlocks`) match the test imports.
```
