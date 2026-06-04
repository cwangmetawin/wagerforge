# wagerforge Wave 1c — Settlement Core Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. **No git** (skip commits). Work only in `wagerforge/`. Tests: `node --test 'scripts/**/*.test.mjs'`. Gate: `node scripts/validate.mjs` → 0 errors.

**Goal:** Ship the durable settlement + wallet core — a tested `scripts/ledger.mjs` (append-only double-entry, atomic overdraft-safe idempotent `transfer`, balance-from-journal) and `scripts/settlement.mjs` (crash-replayable `settleBet`, exactly-once), plus `build-wallet-and-money`, `build-durable-settlement`, `qa-settlement-integrity`, a `/wagerforge:settlement-check` command, and a `settlement-engineer` agent.

**Architecture:** A settlement is two journal entries (debit+credit) under one idempotency key, atomic and balanced (sums to 0). `settleBet` composes idempotent transfers keyed off `betId`, so a crash/retry/duplicate-webhook re-run reaches the SAME state — no lost or double payout (C2).

**Tech Stack:** Node, `node:test`, zero deps. The reference ledger is in-memory; the skills map it to an ACID DB.

---

## File Structure
| File | Responsibility |
|---|---|
| `scripts/ledger.mjs` | `createLedger`, `balanceOf`, `transfer` (atomic/overdraft-safe/idempotent), `post` helpers |
| `scripts/settlement.mjs` | `settleBet` (idempotent, crash-replayable), `conserved` invariant helper |
| `scripts/settlement.test.mjs` | ledger primitives + settlement crash-replay tests |
| `skills/build-wallet-and-money/SKILL.md` | decimal money + atomic ledger (C2) |
| `skills/build-durable-settlement/SKILL.md` | idempotent saga, exactly-once payout (C2) |
| `skills/qa-settlement-integrity/SKILL.md` | crash/replay tests: no lost/double pay (C2) |
| `commands/settlement-check.md` | `/wagerforge:settlement-check` → qa-settlement-integrity |
| `agents/settlement-engineer.md` | agent bound to the settlement skills |

---

## Task 1: `scripts/ledger.mjs` + `scripts/settlement.mjs` (TDD)

**Files:** Create `scripts/ledger.mjs`, `scripts/settlement.mjs`, Test `scripts/settlement.test.mjs`

- [ ] **Step 1: Write the failing test** — create `scripts/settlement.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, balanceOf, transfer } from './ledger.mjs'
import { settleBet, conserved } from './settlement.mjs'

function fund(ledger, account, amount) {
  // seed external funds via a one-off transfer from a 'mint' account (allowed to go negative)
  ledger.journal.push({ account: 'mint', amount: -amount, idemKey: `seed:${account}:${amount}:${ledger.journal.length}` })
  ledger.journal.push({ account, amount, idemKey: `seed:${account}:${amount}:${ledger.journal.length}` })
}

test('transfer is atomic, overdraft-safe, and balanced', () => {
  const L = createLedger(); fund(L, 'alice', 100)
  const r = transfer(L, 'alice', 'bob', 30, 'k1')
  assert.equal(r.ok, true)
  assert.equal(balanceOf(L, 'alice'), 70)
  assert.equal(balanceOf(L, 'bob'), 30)
  // overdraft refused, no state change
  const r2 = transfer(L, 'bob', 'alice', 1000, 'k2')
  assert.equal(r2.ok, false)
  assert.equal(r2.reason, 'insufficient')
  assert.equal(balanceOf(L, 'bob'), 30)
})

test('transfer is idempotent on idemKey (no double-apply)', () => {
  const L = createLedger(); fund(L, 'alice', 100)
  transfer(L, 'alice', 'bob', 30, 'dup')
  const again = transfer(L, 'alice', 'bob', 30, 'dup') // same key
  assert.equal(again.applied, false)
  assert.equal(balanceOf(L, 'alice'), 70) // only one effect
  assert.equal(balanceOf(L, 'bob'), 30)
})

test('settleBet moves stake and payout, conserving value', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  const r = settleBet(L, { betId: 'b1', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r.ok, true)
  assert.equal(balanceOf(L, 'player'), 115) // -10 stake +25 payout
  assert.equal(balanceOf(L, 'house'), 985)  // +10 -25
  assert.equal(conserved(L, ['player', 'house', 'mint']), true)
})

test('settleBet is idempotent — replay does not double-pay', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  settleBet(L, { betId: 'b2', player: 'player', house: 'house', stake: 10, payout: 25 })
  settleBet(L, { betId: 'b2', player: 'player', house: 'house', stake: 10, payout: 25 }) // duplicate webhook
  assert.equal(balanceOf(L, 'player'), 115) // still just one settle
  assert.equal(balanceOf(L, 'house'), 985)
})

test('crash between legs then replay completes exactly once', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  // simulate a crash AFTER the stake leg but BEFORE payout: do only the stake transfer
  transfer(L, 'player', 'house', 10, 'b3:stake')
  assert.equal(balanceOf(L, 'player'), 90)
  // recovery: settleBet re-runs; stake leg is a dup (skipped), payout leg completes
  settleBet(L, { betId: 'b3', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(balanceOf(L, 'player'), 115)
  assert.equal(balanceOf(L, 'house'), 985)
})

test('losing bet (payout 0) only takes stake', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  settleBet(L, { betId: 'b4', player: 'player', house: 'house', stake: 10, payout: 0 })
  assert.equal(balanceOf(L, 'player'), 90)
  assert.equal(balanceOf(L, 'house'), 1010)
})

test('settleBet refuses when the player cannot cover the stake', () => {
  const L = createLedger(); fund(L, 'player', 5); fund(L, 'house', 1000)
  const r = settleBet(L, { betId: 'b5', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'insufficient')
  assert.equal(balanceOf(L, 'player'), 5) // untouched
})
```

- [ ] **Step 2: Run, verify fail** — `node --test 'scripts/settlement.test.mjs'` → FAIL (modules not found).

- [ ] **Step 3a: Implement `scripts/ledger.mjs`:**

```js
// Append-only double-entry ledger. Past journal entries are IMMUTABLE; balance is the sum
// of entries (the correctness ideal). A cached balance is acceptable ONLY if updated in the
// SAME atomic transaction as the append, with an overdraft CHECK constraint (see C2).

export function createLedger() {
  return { journal: [], applied: new Set() }
}

export function balanceOf(ledger, account) {
  let b = 0
  for (const e of ledger.journal) if (e.account === account) b += e.amount
  return b
}

// Atomic, overdraft-safe, idempotent value move: two balanced journal entries under ONE key.
export function transfer(ledger, from, to, amount, idemKey) {
  if (!idemKey) throw new Error('idemKey required')
  if (!(amount > 0)) throw new Error('amount must be > 0')
  if (ledger.applied.has(idemKey)) return { ok: true, applied: false, reason: 'duplicate' }
  if (balanceOf(ledger, from) < amount) return { ok: false, applied: false, reason: 'insufficient' }
  // check-and-apply: append debit+credit, then mark the key — never authorize from a cache.
  ledger.journal.push({ account: from, amount: -amount, idemKey })
  ledger.journal.push({ account: to, amount, idemKey })
  ledger.applied.add(idemKey)
  return { ok: true, applied: true }
}
```

- [ ] **Step 3b: Implement `scripts/settlement.mjs`:**

```js
import { transfer, balanceOf } from './ledger.mjs'

// Settle a bet EXACTLY ONCE. Each leg is an idempotent transfer keyed off the betId, so a
// crash, retry, or duplicate webhook re-running settleBet reaches the same state (C2):
// no lost stake, no double payout.
export function settleBet(ledger, { betId, player, house, stake, payout }) {
  const t1 = transfer(ledger, player, house, stake, `${betId}:stake`)
  if (!t1.ok && t1.reason === 'insufficient') return { ok: false, reason: 'insufficient', betId }
  if (payout > 0) transfer(ledger, house, player, payout, `${betId}:payout`)
  return { ok: true, betId }
}

// Value is conserved across the listed accounts (every transfer nets to zero).
export function conserved(ledger, accounts) {
  let total = 0
  for (const a of accounts) total += balanceOf(ledger, a)
  return Math.abs(total) < 1e-9
}
```

- [ ] **Step 4: Run, verify pass** — `node --test 'scripts/settlement.test.mjs'` → all 7 tests PASS. Then `node --test 'scripts/**/*.test.mjs'` → whole suite green.

---

## Task 2: settlement skills

- [ ] **Step 1: `skills/build-wallet-and-money/SKILL.md`**

```markdown
---
name: build-wallet-and-money
description: Use when implementing the wallet, balance, or money math of a real-money game — bet/win/balance arithmetic, the ledger, and overdraft safety. Keywords wallet, ledger, balance, decimal, idempotency, double-entry.
constraints: C2
---

# build-wallet-and-money

## When to use / When NOT
- Use when: building balance/debit/credit, the journal, or money arithmetic.
- NOT for: the bet→settle orchestration (→ `build-durable-settlement`).

## Default stack (+ escape hatch)
`scripts/ledger.mjs` reference + `decimal.js` for money. Native amount is truth, fiat is display-only; precision from auth, never hardcoded; floor-round so players are never over-credited. Other stacks: same invariants in your ACID DB.

## Process
1. Balance = SUM of an append-only journal (or a cache updated in the SAME txn as the append).
2. Every debit is an atomic, overdraft-safe, idempotent guarded write under serializable isolation.
3. All bet/win/balance arithmetic through a decimal wrapper; never authorize spend from a cache/replica.

## Correctness constraints
- **C2:** A cached balance is acceptable ONLY if updated atomically in the same ACID transaction as the append-only ledger insert, with `UPDATE wallet SET balance=balance-:amt WHERE balance>=:amt` co-committed with the ledger row, a `CHECK(balance>=0)`, and an idempotency key. Daily reconciliation is a detection control, NOT prevention. Never authorize spend from a cache or read replica.

## Pitfalls / red flags
Stored balance reconciled only daily (C2); float money; over-crediting via ceil-rounding; non-idempotent debits.

## Verification
`scripts/settlement.test.mjs`: balance-from-journal, overdraft refused, idempotent transfer.
```

- [ ] **Step 2: `skills/build-durable-settlement/SKILL.md`**

```markdown
---
name: build-durable-settlement
description: Use when orchestrating a bet's settlement across steps or services — debiting stake and crediting payout exactly once despite crashes, retries, duplicate webhooks, or async on-chain payouts. Keywords settlement, idempotency key, saga, exactly-once, durable execution.
constraints: C2
---

# build-durable-settlement

## When to use / When NOT
- Use when: composing the bet→result→settle lifecycle, especially with external/on-chain payouts.
- NOT for: the ledger primitive itself (→ `build-wallet-and-money`).

## Default stack (+ escape hatch)
`scripts/settlement.mjs` pattern (idempotent transfers keyed off betId). For multi-service/async: Inngest or BullMQ (Redis); Temporal for complex sagas. NEVER put n8n on the bet hot path (it is for internal ops automation).

## Process
1. Key every side-effecting step with a deterministic idempotency key derived from the betId.
2. Make each external call (incl. on-chain payout) exactly-once via the idempotency key; safe to replay.
3. On crash/retry, re-run the whole settle — completed steps are no-ops, remaining steps finish.

## Correctness constraints
- **C2:** The settlement's debit/credit legs must each be atomic, overdraft-safe, idempotent guarded writes co-committed with the ledger (see `build-wallet-and-money`). A cached balance is never the authority. Provably-fair outcomes are deterministic on (seed,nonce), so re-deriving during a retry is safe.

## Pitfalls / red flags
Non-idempotent external calls; settling from a cached balance; no timeout/backoff; measuring only the outbound call latency, not end-to-end.

## Verification
`scripts/settlement.test.mjs`: replay/duplicate-webhook does not double-pay; crash-between-legs completes exactly once.
```

- [ ] **Step 3: `skills/qa-settlement-integrity/SKILL.md`**

```markdown
---
name: qa-settlement-integrity
description: Use when testing settlement/wallet code for integrity — injecting crashes, retries, and duplicate webhooks to prove no lost or double payouts and idempotent recovery. Keywords settlement test, idempotency test, crash replay, double-pay.
constraints: C2
---

# qa-settlement-integrity

## When to use / When NOT
- Use when: writing the integrity suite for the wallet/settlement layer.
- NOT for: implementing settlement (→ `build-durable-settlement`).

## Default stack (+ escape hatch)
`node:test` against `scripts/ledger.mjs`/`settlement.mjs`. Other stacks: same scenarios against your DB.

## Process
1. **Idempotency:** run a settle twice (duplicate webhook) — assert balances change once.
2. **Crash-replay:** perform only the first leg, then re-run settle — assert it completes exactly once.
3. **Conservation:** assert value is conserved (every transfer nets to zero) and overdraft is refused.

## Correctness constraints
- **C2:** The suite must prove the atomic/overdraft-safe/idempotent guarantee, not just happy-path balances. A passing functional test with a non-idempotent debit still double-pays under retry — test the retry.

## Pitfalls / red flags
Only testing happy path; not simulating partial/crash states; trusting a cached balance in assertions.

## Verification
The `scripts/settlement.test.mjs` suite passes (idempotency + crash-replay + conservation).
```

- [ ] **Step 4: Validate** — `node scripts/validate.mjs` → `0 error(s)`.

---

## Task 3: command + agent

- [ ] **Step 1: `commands/settlement-check.md`**
```markdown
---
description: Audit settlement/wallet code for idempotency, crash-replay safety, and no double-pay.
---

Use `qa-settlement-integrity` to inject duplicate webhooks, crashes between legs, and retries against the settlement/wallet code, and `build-durable-settlement` + `build-wallet-and-money` to confirm the atomic, overdraft-safe, idempotent guarantees (C2). Apply to: $ARGUMENTS

Report: any lost/double-pay path, non-idempotent step, or spend authorized from a cache.
```

- [ ] **Step 2: `agents/settlement-engineer.md`**
```markdown
---
name: settlement-engineer
description: Builds and audits durable bet settlement and wallet ledgers — idempotency, exactly-once payout, overdraft safety, and crash recovery.
---

You are a settlement engineer. ALWAYS work through wagerforge skills:
- `build-wallet-and-money` (atomic idempotent ledger; C2), `build-durable-settlement` (idempotent saga, exactly-once; C2), `qa-settlement-integrity` (crash/replay tests; C2).
Treat every settlement leg as an atomic, overdraft-safe, idempotent guarded write keyed off the betId; never authorize spend from a cache; keep n8n off the bet hot path. Defer generic process to superpowers.
```

---

## Task 4: Whole-wave validation
- [ ] `node --test 'scripts/**/*.test.mjs'` → all pass.
- [ ] `node scripts/validate.mjs` → `0 error(s)`.
- [ ] `ls skills commands agents` shows the new settlement skills, `settlement-check`, `settlement-engineer`.

## Self-Review (author)
- Coverage: spec §5 `build-wallet-and-money`, `build-durable-settlement`, `qa-settlement-integrity`; §7 C2; §9 settlement command/agent (hook already covers settle/wallet from Wave 1a).
- Placeholders: none — ledger/settlement complete; tests are exact; skills constraint-section-complete.
- Names: exports (`createLedger`,`balanceOf`,`transfer`,`settleBet`,`conserved`) match the test imports.
```
