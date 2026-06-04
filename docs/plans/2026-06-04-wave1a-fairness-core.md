# wagerforge Wave 1a — Fairness Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **GIT IS USER-GATED.** No git repo in `wagerforge/`. Skip every "Commit" step. Work only inside `wagerforge/`; never touch the parent `Developments/` folder.
> **Run tests with the glob form:** `node --test 'scripts/**/*.test.mjs'` (Node ≥21/24 mis-parses a bare dir arg).
> **Gate:** `node scripts/validate.mjs` must report `0 error(s)` — the validator now ENFORCES that any skill tagged `[Cn]` / with a `constraints:` frontmatter carries a filled "Correctness constraints" section.

**Goal:** Ship the provably-fair cryptographic core — a tested `scripts/fair-rng.mjs` (HMAC→float, counter-block byte stream, bias-free `nextInt`, Fisher-Yates, commit/reveal, independent `verify`) plus the `fair-*` + `qa-fairness-verification` skills, a `/wagerforge:fairness-audit` command, a `fairness-auditor` agent, and an RNG/seed edit hook.

**Architecture:** One shared runnable module `scripts/fair-rng.mjs` is the single source of truth for the math; the skills are thin knowledge that reference it and encode correctness constraints C5/C7/C8/C12. The flagship `fair-verify` proves outcomes by **independent client-side re-derivation** (re-implementing the integer reduction itself), the gap that the real repos leave open.

**Tech Stack:** Node `crypto` (`createHmac`, `createHash`, `randomBytes`), `node:test`, zero deps.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/fair-rng.mjs` | Provable-fair primitives: `hmacHex`, `fairFloat`, `byteStream`, `nextFloat`, `nextInt` (rejection-sampled), `shuffle`, `hashServerSeed`, `generateServerSeed`, `generateClientSeed`, `verify` |
| `scripts/fair-rng.test.mjs` | KAT + property + round-trip tests |
| `skills/fair-rng-core/SKILL.md` | Keyed derivation & seed generation (C7, C12) |
| `skills/fair-outcome-mappers/SKILL.md` | Map randomness → game shapes without bias (C8) |
| `skills/fair-commit-reveal/SKILL.md` | Seed commit/rotation/reveal lifecycle (C7) |
| `skills/fair-verify/SKILL.md` | Independent re-derivation verifier — flagship (C8) |
| `skills/qa-fairness-verification/SKILL.md` | KATs + statistical fairness tests (C5, C8) |
| `commands/fairness-audit.md` | `/wagerforge:fairness-audit` → fair-verify + qa-fairness-verification |
| `agents/fairness-auditor.md` | Subagent bound to the fair-* skills |
| `hooks/hooks.json` | ADD a PostToolUse reminder on rng/seed/fair edits |

---

## Task 1: `scripts/fair-rng.mjs` core (TDD)

**Files:** Create `scripts/fair-rng.mjs`, Test `scripts/fair-rng.test.mjs`

- [ ] **Step 1: Write the failing test** — create `scripts/fair-rng.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hmacHex, fairFloat, byteStream, nextFloat, nextInt, shuffle,
  hashServerSeed, generateServerSeed, generateClientSeed, verify,
} from './fair-rng.mjs'

const SS = 'server-seed-abc'
const CS = 'client-seed-xyz'

test('KAT: canonical fairFloat is frozen and deterministic', () => {
  assert.equal(hmacHex(SS, CS, 0).slice(0, 16), '694e5d8be79c6bbf')
  assert.equal(fairFloat(SS, CS, 0), 0.4113520113529474)
  assert.equal(fairFloat(SS, CS, 0), fairFloat(SS, CS, 0))
})

test('KAT: counter-block byte stream + nextFloat are frozen', () => {
  const s = byteStream(SS, CS, 0)
  assert.equal(nextFloat(s), 0.9176055497343931)
  const s2 = byteStream(SS, CS, 0)
  assert.deepEqual([s2.next().value, s2.next().value, s2.next().value], [234, 232, 50])
})

test('fairFloat is in [0,1) and changes with nonce', () => {
  for (const n of [0, 1, 2, 99]) {
    const u = fairFloat(SS, CS, n)
    assert.ok(u >= 0 && u < 1)
  }
  assert.notEqual(fairFloat(SS, CS, 0), fairFloat(SS, CS, 1))
})

test('nextInt stays in range and is deterministic', () => {
  for (const r of [1, 2, 6, 37, 52, 100, 1000]) {
    const a = byteStream(SS, CS, 1)
    const b = byteStream(SS, CS, 1)
    for (let i = 0; i < 50; i++) {
      const x = nextInt(a, r)
      assert.ok(Number.isInteger(x) && x >= 0 && x < r)
      assert.equal(x, nextInt(b, r)) // deterministic
    }
  }
})

test('nextInt is approximately unbiased for a non-power-of-two range (rejection sampling)', () => {
  const range = 6 // 256 % 6 = 4 → naive modulo would bias values 0..3
  const counts = new Array(range).fill(0)
  const N = 60000
  // vary the stream by nonce so we get many independent draws
  for (let n = 0; n < N; n++) counts[nextInt(byteStream(SS, CS, n), range)]++
  const expected = N / range
  for (const c of counts) {
    assert.ok(Math.abs(c - expected) < expected * 0.06, `bucket ${c} vs ${expected}`)
  }
})

test('shuffle returns a permutation and is deterministic', () => {
  const a = shuffle(byteStream(SS, CS, 7), 52)
  assert.equal(a.length, 52)
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 52 }, (_, i) => i))
  assert.deepEqual(a, shuffle(byteStream(SS, CS, 7), 52))
})

test('commit hash is frozen; CSPRNG seeds are unique and long', () => {
  assert.equal(hashServerSeed(SS), '256997017cabf253184f1599c0c2dd65e66b6dce3453436b0fa122043a5b0487')
  assert.notEqual(generateServerSeed(), generateServerSeed())
  assert.equal(generateServerSeed().length, 64) // 32 bytes hex
  assert.ok(generateClientSeed().length >= 16)
})

test('verify independently re-derives and detects tampering', () => {
  const derive = (stream) => nextInt(stream, 37) // e.g. a roulette pocket
  const ss = generateServerSeed()
  const hash = hashServerSeed(ss)
  const outcome = derive(byteStream(ss, CS, 3))
  const ok = verify(ss, hash, CS, 3, derive, outcome)
  assert.equal(ok.ok, true)
  assert.equal(ok.commitOk, true)
  assert.equal(ok.match, true)
  // tampered committed hash
  assert.equal(verify(ss, 'deadbeef', CS, 3, derive, outcome).commitOk, false)
  // tampered claimed outcome
  assert.equal(verify(ss, hash, CS, 3, derive, (outcome + 1) % 37).match, false)
})
```

- [ ] **Step 2: Run, verify it fails** — `node --test 'scripts/fair-rng.test.mjs'` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `scripts/fair-rng.mjs`:

```js
import { createHmac, createHash, randomBytes } from 'node:crypto'

// --- Keyed derivation (use HMAC-SHA256, never SHA256(seed‖msg) as a MAC — see C7) ---

// Hex digest of HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}` [, `:${cursor}`]).
export function hmacHex(serverSeed, clientSeed, nonce, cursor) {
  const msg = cursor === undefined ? `${clientSeed}:${nonce}` : `${clientSeed}:${nonce}:${cursor}`
  return createHmac('sha256', serverSeed).update(msg).digest('hex')
}

// Single canonical outcome: first 13 hex (52 bits) / 2^52 → u in [0,1).
// 52 bits == JS double mantissa, so the float is exact. (limbo/crash family)
export function fairFloat(serverSeed, clientSeed, nonce, { hexChars = 13 } = {}) {
  return parseInt(hmacHex(serverSeed, clientSeed, nonce).slice(0, hexChars), 16) / 2 ** (4 * hexChars)
}

// Multi-draw byte stream: concatenated HMAC counter blocks (mines/keno/cards/plinko).
export function* byteStream(serverSeed, clientSeed, nonce) {
  let counter = 0
  while (true) {
    const block = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${counter}`).digest()
    for (const b of block) yield b
    counter++
  }
}

// 48-bit float in [0,1) from 6 stream bytes (< 52-bit mantissa, exact).
export function nextFloat(stream) {
  let x = 0
  for (let i = 0; i < 6; i++) x = x * 256 + stream.next().value
  return x / 2 ** 48
}

// Unbiased integer in [0, range) via rejection sampling over whole bytes (see C8).
export function nextInt(stream, range) {
  if (!Number.isInteger(range) || range <= 0) throw new Error('range must be a positive integer')
  let bytes = 1
  let space = 256
  while (space < range) { bytes++; space *= 256 }
  const limit = space - (space % range) // largest multiple of range <= space
  for (;;) {
    let x = 0
    for (let i = 0; i < bytes; i++) x = x * 256 + stream.next().value
    if (x < limit) return x % range
    // else reject and redraw — removes modulo bias
  }
}

// Fisher-Yates over the stream (card decks, mines tiles, keno picks).
export function shuffle(stream, n) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = nextInt(stream, i + 1)
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

// --- Commit / reveal + CSPRNG seeds (see C12) ---

export function hashServerSeed(serverSeed) {
  return createHash('sha256').update(serverSeed).digest('hex')
}
export function generateServerSeed(bytes = 32) {
  return randomBytes(bytes).toString('hex') // CSPRNG, 256-bit
}
export function generateClientSeed(bytes = 16) {
  return randomBytes(bytes).toString('hex') // CSPRNG — never Math.random()
}

// --- Independent verification (the flagship: re-derive, never trust the server) ---

// deriveFn(stream) reproduces the public outcome from the SAME stream the server used.
export function verify(serverSeed, serverSeedHash, clientSeed, nonce, deriveFn, claimedOutcome) {
  const commitOk = hashServerSeed(serverSeed) === serverSeedHash
  const recomputed = deriveFn(byteStream(serverSeed, clientSeed, nonce))
  const match = JSON.stringify(recomputed) === JSON.stringify(claimedOutcome)
  return { commitOk, recomputed, match, ok: commitOk && match }
}
```

- [ ] **Step 4: Run, verify pass** — `node --test 'scripts/fair-rng.test.mjs'` → all 8 tests PASS. If the two KAT vectors mismatch, STOP and report (do not edit the frozen values — they were computed from the canonical scheme).

---

## Task 2: The fair-* + qa skills

> Author each under `superpowers:writing-skills`. After writing all five, run `node scripts/validate.mjs` and confirm `0 error(s)` — the validator enforces the `constraints:` → "Correctness constraints" section rule, so each section must be filled.

- [ ] **Step 1: `skills/fair-rng-core/SKILL.md`**

```markdown
---
name: fair-rng-core
description: Use when implementing or reviewing the cryptographic core of a provably-fair RNG — deriving outcomes from server seed + client seed + nonce, choosing HMAC vs plain hashing, or generating seeds. Keywords HMAC, SHA-256, server seed, client seed, nonce, CSPRNG.
constraints: C7, C12
---

# fair-rng-core

## When to use / When NOT
- Use when: deriving outcomes from `(serverSeed, clientSeed, nonce)`; choosing the keyed primitive; generating seeds.
- NOT for: mapping randomness to a game shape (→ `fair-outcome-mappers`) or the commit/reveal lifecycle (→ `fair-commit-reveal`).

## Default stack (+ escape hatch)
Node `crypto` via `scripts/fair-rng.mjs`. Other stacks: any HMAC-SHA256 + OS CSPRNG; mirror the same message format `clientSeed:nonce[:counter]`.

## Process
1. Derive with **HMAC-SHA256(serverSeed, `clientSeed:nonce[:counter]`)** — keyed, never `SHA256(seed‖msg)` used as a MAC.
2. Single outcome: 13 hex (52 bits) / 2^52 → `u ∈ [0,1)` (`fairFloat`). Multi-draw: counter-block `byteStream` + `nextFloat`/`nextInt`.
3. Generate seeds with a CSPRNG (`randomBytes`, ≥128-bit). Never `Math.random()`.

## Correctness constraints
- **C7:** SHA-256 length-extension only bites when SHA-256 is misused as a secret-prefix MAC over attacker-controlled trailing data; a plain `SHA256(serverSeed)` commitment is NOT threatened. Using **HMAC-SHA256** for keyed derivation makes it moot.
- **C12:** A stateless per-bet design `HMAC(serverSeed, clientSeed‖nonce)` is secure; reseeding between bets is NOT required. The real fault is a non-CSPRNG or recoverable seed. NIST roles: 800-90A DRBG / 800-90B entropy source / 800-90C assembly.

## Pitfalls / red flags
`Math.random()` seeds (~48-bit, predictable); plain-hash used as MAC; reusing one `(seed,nonce)` for two outcomes.

## Verification
Known-Answer Tests in `scripts/fair-rng.test.mjs`; deterministic same-input→same-output; `u ∈ [0,1)`.
```

- [ ] **Step 2: `skills/fair-outcome-mappers/SKILL.md`**

```markdown
---
name: fair-outcome-mappers
description: Use when mapping provably-fair randomness to a concrete game outcome — a card 0-51, a mines tile, keno picks, a crash multiplier, a plinko bucket — and you must avoid modulo bias. Keywords rejection sampling, Fisher-Yates, inverse CDF, modulo bias.
constraints: C8
---

# fair-outcome-mappers

## When to use / When NOT
- Use when: turning a hash/stream into integers, permutations, or distribution samples.
- NOT for: the keyed derivation itself (→ `fair-rng-core`).

## Default stack (+ escape hatch)
`scripts/fair-rng.mjs` `nextInt`/`shuffle`/`fairFloat`. Other stacks: replicate the rejection-sampling bound exactly.

## Process
1. Uniform integer in `[0,range)`: **rejection sampling** (`nextInt`) — draw whole bytes, reject the top `space % range`, return `x % range`.
2. Permutation (cards/tiles): **Fisher-Yates** with `nextInt(i+1)` (`shuffle`).
3. Continuous (crash/limbo): inverse-CDF on `fairFloat` (e.g. `floor((1-h)/u)` styles) — done in the math skills.

## Correctness constraints
- **C8:** Modulo bias occurs ONLY when the source space size isn't a multiple of `range`; it's negligible (~1e-8) when reducing a full 32-bit+ value and exactly zero for power-of-two ranges. Fix = make the source a multiple of `range` OR rejection-sample (what `nextInt` does). The dramatic "11% coin / 0.02% dice" figures correspond to tiny truncated windows, not real HMAC pipelines.

## Pitfalls / red flags
Naive `hashInt % range` on a narrow window; biased shuffles (`i` vs `i+1` off-by-one); trusting a server-side decode instead of re-deriving (→ `fair-verify`).

## Verification
`nextInt` stays in range, deterministic, ~uniform for non-power-of-two ranges (see `fair-rng.test.mjs`).
```

- [ ] **Step 3: `skills/fair-commit-reveal/SKILL.md`**

```markdown
---
name: fair-commit-reveal
description: Use when designing the seed lifecycle of a provably-fair game — publishing the server-seed commitment before play, rotating seeds, revealing the plaintext, and resetting the nonce. Keywords commit reveal, serverSeedHash, seed rotation, nonce.
constraints: C7
---

# fair-commit-reveal

## When to use / When NOT
- Use when: deciding when to publish `SHA256(serverSeed)`, when to reveal it, and how to rotate.
- NOT for: deriving outcomes (→ `fair-rng-core`) or re-deriving to verify (→ `fair-verify`).

## Default stack (+ escape hatch)
`hashServerSeed`/`generateServerSeed`/`generateClientSeed` from `scripts/fair-rng.mjs` + a seed-state store. Other stacks: same ordering rules.

## Process
1. Publish `serverSeedHash = SHA256(serverSeed)` BEFORE the player submits/locks their client seed; optionally double-commit `nextServerSeedHash`.
2. Increment `nonce` per bet; **reset nonce to 0 on rotation**.
3. Reveal the plaintext server seed only AFTER rotation; block rotation while unfinished rounds > 0.

## Correctness constraints
- **C7:** The commitment `SHA256(serverSeed)` is safe — length-extension does not let an attacker invert the hash, recover the seed, or two-open the commitment. Keep keyed derivation on HMAC-SHA256 (see `fair-rng-core`); the commit hash being plain SHA-256 is correct and fine.

## Pitfalls / red flags
Revealing before rotation; not resetting nonce; allowing rotation mid-round; committing after the client seed is known.

## Verification
`hashServerSeed` is frozen in tests; reveal matches its earlier commitment; nonce resets on rotation.
```

- [ ] **Step 4: `skills/fair-verify/SKILL.md`** (flagship)

```markdown
---
name: fair-verify
description: Use when building or auditing the player-facing fairness verifier — independently recomputing a settled outcome from server seed + client seed + nonce, rather than trusting the server's replayed result. Keywords verify fairness, independent re-derivation, recompute outcome.
constraints: C8
---

# fair-verify

## When to use / When NOT
- Use when: implementing the "verify" path or auditing whether verification is genuinely independent.
- NOT for: the derivation primitives (→ `fair-rng-core`/`fair-outcome-mappers`).

## When NOT it's already wrong
If "verify" calls a server endpoint and re-renders whatever the server returns, it is **trust-the-house, not provably fair**. A real verifier recomputes locally.

## Default stack (+ escape hatch)
`verify()` in `scripts/fair-rng.mjs`: checks the commitment, re-runs the SAME `deriveFn` over a fresh `byteStream`, diffs against the claimed outcome. Other stacks: re-implement the integer reduction yourself.

## Process
1. Check `SHA256(serverSeed) === publishedHash`.
2. Re-derive: run the game's exact `deriveFn(stream)` (the reduction, NOT the server's decode) over `byteStream(serverSeed, clientSeed, nonce)`.
3. Deep-equal recomputed vs settled outcome; surface a precise diff on mismatch.

## Correctness constraints
- **C8:** The verifier MUST re-implement the integer reduction (rejection-sampled `nextInt`, Fisher-Yates) itself. Trusting the server's already-decoded `gameEvent` makes verification circular and hides any biased mapping.

## Pitfalls / red flags
Re-rendering a server response; trusting the server's decoded outcome; wrong message format (`clientSeed:nonce` vs counter blocks) silently passing.

## Verification
Round-trip tests: derive → `verify` returns `ok:true`; tampered hash → `commitOk:false`; tampered outcome → `match:false` (see `fair-rng.test.mjs`).
```

- [ ] **Step 5: `skills/qa-fairness-verification/SKILL.md`**

```markdown
---
name: qa-fairness-verification
description: Use when testing a provably-fair implementation — writing Known-Answer Tests for the HMAC derivation, statistical uniformity tests for the integer mapping, and round-trip verification tests. Keywords KAT, fairness test, chi-square, rejection sampling test.
constraints: C5, C8
---

# qa-fairness-verification

## When to use / When NOT
- Use when: building the test suite that proves the fairness core is correct and unbiased.
- NOT for: implementing the core (→ `fair-rng-core`) — this is its QA counterpart.

## Default stack (+ escape hatch)
`node:test` against `scripts/fair-rng.mjs`. Other stacks: same test categories.

## Process
1. **KAT:** freeze a few `(serverSeed, clientSeed, nonce) → outcome` vectors and assert exact equality (catches scheme drift).
2. **Statistical:** draw many `nextInt` over a non-power-of-two range; assert per-bucket counts within tolerance (chi-square / proportion bound) to confirm no modulo bias.
3. **Round-trip:** derive an outcome, then `verify` it; assert tamper detection on both seed-hash and outcome.

## Correctness constraints
- **C5:** Require a CSPRNG; never assert fairness of a non-cryptographic generator (Mersenne-Twister is state-recoverable). Apply Bonferroni when running 15+ statistical tests.
- **C8:** Statistical uniformity is the empirical guard for the rejection-sampling mapping; a single chi-square failure → investigate, don't ignore.

## Pitfalls / red flags
Treating α=0.05 as a hard pass; too few samples for high-variance ranges; KATs that re-derive instead of freezing.

## Verification
The `scripts/fair-rng.test.mjs` suite passes (KAT + uniformity + round-trip).
```

- [ ] **Step 6: Validate all skills** — `node scripts/validate.mjs` → EXPECT `0 error(s)` (warnings tolerated). Fix any skill the gate flags (e.g. a constraint id declared but not referenced in its section).

---

## Task 3: Command + agent + hook

**Files:** Create `commands/fairness-audit.md`, `agents/fairness-auditor.md`; Modify `hooks/hooks.json`.

- [ ] **Step 1: `commands/fairness-audit.md`**

```markdown
---
description: Audit a game's provable-fairness — independent re-derivation + statistical bias checks.
---

Use the `fair-verify` skill to independently recompute the game's settled outcome(s) from `serverSeed`, `clientSeed`, and `nonce` (re-implementing the integer reduction, not trusting the server's decode), then use `qa-fairness-verification` to run KAT and uniformity checks. Apply to: $ARGUMENTS

Report: commitment check, recomputed-vs-settled diff, any modulo-bias or CSPRNG red flags.
```

- [ ] **Step 2: `agents/fairness-auditor.md`**

```markdown
---
name: fairness-auditor
description: Audits provably-fair RNG implementations for independence, modulo bias, commit-reveal correctness, and CSPRNG usage.
---

You are a provable-fairness auditor. ALWAYS work through these wagerforge skills (do not improvise crypto):
- `fair-rng-core` (HMAC derivation, C7/C12), `fair-outcome-mappers` (rejection sampling, C8),
- `fair-commit-reveal` (seed lifecycle, C7), `fair-verify` (independent re-derivation, C8),
- `qa-fairness-verification` (KAT + statistical tests, C5/C8).

For any audit: verify the commitment, re-derive outcomes independently, check the integer mapping for bias, confirm CSPRNG seeds. Flag any "verify" path that re-renders a server response as trust-the-house. Defer generic process to superpowers.
```

- [ ] **Step 3: Add the RNG/seed hook to `hooks/hooks.json`** — read the current file first, then add a `PostToolUse` entry alongside the existing `SessionStart` (match Claude Code's hook schema). The new entry runs a reminder script:

Create `hooks/rng-edit-reminder.mjs`:
```js
#!/usr/bin/env node
// Reminder on edits to RNG/seed/fairness/settlement code.
let input = ''
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  let path = ''
  try { path = (JSON.parse(input).tool_input || {}).file_path || '' } catch {}
  if (!/(rng|seed|fair|hmac|settle|wallet)/i.test(path)) { process.exit(0) }
  const msg = 'Touched RNG/seed/fairness/settlement code: use a CSPRNG (never Math.random), HMAC-SHA256 for keyed derivation, rejection sampling for integer ranges (no modulo bias), and ensure verification re-derives independently. See wagerforge fair-* skills.'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }))
})
```

Then add to `hooks/hooks.json` a `PostToolUse` array with a matcher for `Edit|Write` invoking `node "${CLAUDE_PLUGIN_ROOT}/hooks/rng-edit-reminder.mjs"`. Verify `hooks.json` still parses and `node hooks/rng-edit-reminder.mjs <<< '{"tool_input":{"file_path":"src/rng.ts"}}'` emits JSON.

---

## Task 4: Whole-wave validation

- [ ] **Step 1:** `node --test 'scripts/**/*.test.mjs'` → all tests pass (validator suite + fair-rng suite).
- [ ] **Step 2:** `node scripts/validate.mjs` → `0 error(s)`.
- [ ] **Step 3:** `ls -R skills commands agents` → fair-rng-core, fair-outcome-mappers, fair-commit-reveal, fair-verify, qa-fairness-verification, fairness-audit command, fairness-auditor agent all present.

## Self-Review (author)
- Spec coverage: implements spec §5 `fair-*` pillar MVP + `qa-fairness-verification`, §7 constraints C5/C7/C8/C12, §9 fairness command/agent/hook.
- Placeholders: none — `fair-rng.mjs` is complete; KAT vectors are real frozen values; every SKILL.md is full and constraint-section-complete.
- Name consistency: module exports (`hmacHex`,`fairFloat`,`byteStream`,`nextFloat`,`nextInt`,`shuffle`,`hashServerSeed`,`generateServerSeed`,`generateClientSeed`,`verify`) match the test imports exactly.
```
