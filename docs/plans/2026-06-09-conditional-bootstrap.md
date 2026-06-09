# Conditional SessionStart bootstrap (dual-install safe) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **GIT-APPROVAL (user law):** Do NOT run any `git` command (branch/add/commit/merge/push) without explicit user approval. Commit steps are checkpoints — confirm first. File edits are fine.

> **ATTRIBUTION:** the user's git rule disables attribution — do NOT add Co-Authored-By trailers.

**Goal:** Make wagerforge's SessionStart bootstrap conditional so users WITH superpowers already enabled don't get a double injection, while standalone users are unaffected — with no silent failure mode that re-creates the double injection.

**Architecture:** A pure module `scripts/bootstrap-mode.mjs` owns all decisions (tri-state `detectSuperpowers`, `resolveBootstrapMode`, `renderContext` + shared constants). `hooks/session-start.mjs` becomes a thin fail-open shell that dynamic-imports the module, resolves a mode, and emits context. Detection is tri-state (`matched|absent|unreadable`) with per-file isolation so a malformed settings file can't silently erase a real superpowers signal.

**Tech Stack:** Node ≥18 ESM (`.mjs`), `node:test`, `node:child_process` for the hook spawn test. No new deps.

**Spec:** `docs/specs/2026-06-09-conditional-bootstrap-design.md` (v2, post-panel; approved 2026-06-09).

**Current state (verified):** `hooks/session-start.mjs` unconditionally emits the full `<EXTREMELY_IMPORTANT>` bootstrap. `hooks/hooks.json` SessionStart matcher = `startup|clear|compact`. `plugin.json`/`marketplace.json` both `0.2.0`. Tests run via `node --test 'scripts/**/*.test.mjs'` (82 passing). No `CHANGELOG.md`.

---

## File Structure

**Create:**
- `scripts/bootstrap-mode.mjs` — pure decision logic + constants.
- `scripts/bootstrap-mode.test.mjs` — unit tests (detect/resolve/render).
- `scripts/version-parity.test.mjs` — version-parity gate.
- `hooks/session-start.test.mjs` — spawns the hook, asserts force/off output shapes.
- `CHANGELOG.md` — 0.2.1 entry.

**Modify:**
- `hooks/session-start.mjs` — thin fail-open shell using the module.
- `hooks/hooks.json` — add `resume` to the SessionStart matcher.
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — `0.2.0 → 0.2.1`.
- `README.md` — widen the documented test glob to `{scripts,hooks}/**/*.test.mjs`; add dual-install note + `WAGERFORGE_BOOTSTRAP` doc.

**Unchanged:** the 14 vendored skills, `using-wagerforge` substance, `scripts/validate.mjs`, the 7 Plugin Laws.

---

## Task 1: `detectSuperpowers` (tri-state) + path/scope helpers

**Files:** Create `scripts/bootstrap-mode.mjs`; Test `scripts/bootstrap-mode.test.mjs`.

- [ ] **Step 1: Write the failing tests** — create `scripts/bootstrap-mode.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectSuperpowers, SUPERPOWERS_RE } from './bootstrap-mode.mjs'

// Build an injectable fs from a {path: content|Error} map. size derived from content length.
function fakeFs(files, sizes = {}) {
  const readFileSync = (p) => {
    const v = files[p]
    if (v === undefined) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
    if (v instanceof Error) throw v
    return v
  }
  const statSync = (p) => {
    const v = files[p]
    if (v === undefined) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
    return { isFile: () => true, size: sizes[p] ?? (typeof v === 'string' ? v.length : 0) }
  }
  return { readFileSync, statSync }
}
const U = '/home/.claude/settings.json'
const P = '/proj/.claude/settings.json'
const L = '/proj/.claude/settings.local.json'
const en = (obj) => JSON.stringify({ enabledPlugins: obj })

test('user scope superpowers@official:true -> matched', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers@claude-plugins-official': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'matched')
})
test('marketplace-agnostic: @inline and @localname -> matched', () => {
  for (const key of ['superpowers@inline', 'superpowers@my-local']) {
    const fs = fakeFs({ [U]: en({ [key]: true }) })
    assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'matched', key)
  }
})
test('non-matches superpowers-ng@mp and wagerforge@superpowers -> absent', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers-ng@mp': true, 'wagerforge@superpowers': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'absent')
})
test('higher scope disables lower -> absent; local re-enables -> matched', () => {
  const off = fakeFs({ [U]: en({ 'superpowers@x': true }), [P]: en({ 'superpowers@x': false }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...off }), 'absent')
  const on = fakeFs({ [U]: en({ 'superpowers@x': true }), [P]: en({ 'superpowers@x': false }), [L]: en({ 'superpowers@x': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...on }), 'matched')
})
test('no superpowers key anywhere -> absent', () => {
  const fs = fakeFs({ [U]: en({ 'other@mp': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'absent')
})
test('ANTI-REGRESSION: one malformed scope + clean superpowers signal elsewhere -> matched', () => {
  const fs = fakeFs({ [U]: '{ "enabledPlugins": { // jsonc\n "superpowers@x": true } }', [P]: en({ 'superpowers@x': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'matched')
})
test('malformed everywhere, no clean signal -> unreadable (NOT absent)', () => {
  const fs = fakeFs({ [U]: '{ bad json,, }' })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'unreadable')
})
test('missing files -> absent, no throw', () => {
  const fs = fakeFs({})
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'absent')
})
test('oversized file is skipped (treated unreadable), not parsed', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers@x': true }) }, { [U]: 5 * 1024 * 1024 })
  assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'unreadable')
})
test('non-boolean superpowers value is not a match', () => {
  for (const v of ['true', 1, {}]) {
    const fs = fakeFs({ [U]: en({ 'superpowers@x': v }) })
    assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'absent', String(v))
  }
})
test('SUPERPOWERS_RE matches @-prefixed only', () => {
  assert.ok(SUPERPOWERS_RE.test('superpowers@claude-plugins-official'))
  assert.ok(!SUPERPOWERS_RE.test('superpowers-ng@mp'))
})
```

- [ ] **Step 2: Run, verify fail**

Run: `node --test scripts/bootstrap-mode.test.mjs`
Expected: FAIL — `Cannot find module './bootstrap-mode.mjs'`.

- [ ] **Step 3: Implement the detector** — create `scripts/bootstrap-mode.mjs`:

```js
// Pure decision logic for the SessionStart bootstrap. No I/O except via injected fs fns.
import { readFileSync as fsRead, statSync as fsStat } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const SUPERPOWERS_RE = /^superpowers@/
const SIZE_CAP = 1024 * 1024 // 1 MiB — skip implausibly large settings files

export function defaultSettingsPaths({
  homeDir = homedir(),
  projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd(),
} = {}) {
  return [
    join(homeDir, '.claude', 'settings.json'),       // user (lowest precedence)
    join(projectDir, '.claude', 'settings.json'),     // project
    join(projectDir, '.claude', 'settings.local.json'), // local (highest precedence)
  ]
}

// Read one scope. Returns { state: 'clean', map } | { state: 'missing' } | { state: 'unreadable' }.
function readScope(path, readFileSync, statSync) {
  let st
  try { st = statSync(path) } catch (e) {
    if (e && e.code === 'ENOENT') return { state: 'missing' }
    return { state: 'unreadable' }
  }
  if (!st.isFile || !st.isFile() || st.size > SIZE_CAP) return { state: 'unreadable' }
  let text
  try { text = readFileSync(path, 'utf8') } catch { return { state: 'unreadable' } }
  try {
    const j = JSON.parse(text)
    const ep = j && typeof j === 'object' ? j.enabledPlugins : null
    return { state: 'clean', map: ep && typeof ep === 'object' ? ep : {} }
  } catch { return { state: 'unreadable' } }
}

// Tri-state: 'matched' (superpowers enabled), 'absent' (cleanly not enabled), 'unreadable'
// (some present scope could not be read/parsed AND no clean match found — distinct, never silently 'absent').
export function detectSuperpowers({
  settingsPaths = defaultSettingsPaths(),
  readFileSync = fsRead,
  statSync = fsStat,
} = {}) {
  const merged = {}
  let anyUnreadable = false
  for (const p of settingsPaths) {
    const r = readScope(p, readFileSync, statSync)
    if (r.state === 'clean') Object.assign(merged, r.map) // low->high: later overrides earlier
    else if (r.state === 'unreadable') anyUnreadable = true
    // 'missing' contributes nothing
  }
  const matched = Object.keys(merged).some((k) => SUPERPOWERS_RE.test(k) && merged[k] === true)
  if (matched) return 'matched'
  return anyUnreadable ? 'unreadable' : 'absent'
}
```

- [ ] **Step 4: Run, verify pass**

Run: `node --test scripts/bootstrap-mode.test.mjs`
Expected: PASS (all Task-1 tests).

- [ ] **Step 5: Commit** *(git-approval: confirm first)*

```bash
git add scripts/bootstrap-mode.mjs scripts/bootstrap-mode.test.mjs
git commit -m "feat(bootstrap): tri-state detectSuperpowers (per-file isolation, prefix, strict bool)"
```

---

## Task 2: `resolveBootstrapMode` (env override beats detection)

**Files:** Modify `scripts/bootstrap-mode.mjs`; Modify `scripts/bootstrap-mode.test.mjs`.

- [ ] **Step 1: Append failing tests** to `scripts/bootstrap-mode.test.mjs`:

```js
import { resolveBootstrapMode } from './bootstrap-mode.mjs'

test('env force -> full and detect is NOT called', () => {
  let called = false
  const mode = resolveBootstrapMode('force', () => { called = true; return 'matched' })
  assert.equal(mode, 'full'); assert.equal(called, false)
})
test('env off -> defer and detect is NOT called', () => {
  let called = false
  const mode = resolveBootstrapMode('off', () => { called = true; return 'absent' })
  assert.equal(mode, 'defer'); assert.equal(called, false)
})
test('no env: matched -> defer, absent -> full, unreadable -> full', () => {
  assert.equal(resolveBootstrapMode(undefined, () => 'matched'), 'defer')
  assert.equal(resolveBootstrapMode(undefined, () => 'absent'), 'full')
  assert.equal(resolveBootstrapMode(undefined, () => 'unreadable'), 'full')
})
test('unrecognized env value falls through to detection', () => {
  assert.equal(resolveBootstrapMode('maybe', () => 'matched'), 'defer')
})
```

- [ ] **Step 2: Run, verify fail** — `node --test scripts/bootstrap-mode.test.mjs` → FAIL (`resolveBootstrapMode` not exported).

- [ ] **Step 3: Implement** — append to `scripts/bootstrap-mode.mjs`:

```js
// Mode resolution: env override wins; otherwise only a confirmed 'matched' defers.
export function resolveBootstrapMode(env, detect) {
  if (env === 'force') return 'full'
  if (env === 'off') return 'defer'
  return detect() === 'matched' ? 'defer' : 'full'
}
```

- [ ] **Step 4: Run, verify pass** — `node --test scripts/bootstrap-mode.test.mjs` → PASS.

- [ ] **Step 5: Commit** *(confirm first)*

```bash
git add scripts/bootstrap-mode.mjs scripts/bootstrap-mode.test.mjs
git commit -m "feat(bootstrap): resolveBootstrapMode with env override precedence"
```

---

## Task 3: `renderContext` + shared constants (anti-double-injection guard)

**Files:** Modify `scripts/bootstrap-mode.mjs`; Modify `scripts/bootstrap-mode.test.mjs`.

- [ ] **Step 1: Append failing tests**:

```js
import { renderContext, ROUTER_NUDGE, DISCIPLINE_POINTER } from './bootstrap-mode.mjs'

test('defer output: discipline pointer + nudge, NO double-injection content', () => {
  const ctx = renderContext('defer', { usingSuperpowersBody: 'IGNORED BODY' })
  assert.ok(ctx.includes(DISCIPLINE_POINTER))
  assert.ok(ctx.includes(ROUTER_NUDGE))
  assert.ok(!ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(!ctx.includes('using-superpowers'))
  assert.ok(!ctx.includes('IGNORED BODY'))
})
test('full output: wrapper + body + nudge', () => {
  const ctx = renderContext('full', { usingSuperpowersBody: 'BODYMARKER' })
  assert.ok(ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('</EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('BODYMARKER'))
  assert.ok(ctx.includes(ROUTER_NUDGE))
})
test('full output literally contains the exact defer-mode ROUTER_NUDGE (shared constant)', () => {
  const full = renderContext('full', { usingSuperpowersBody: 'B' })
  assert.ok(full.includes(ROUTER_NUDGE))
})
test('full-mode wrapper is golden-stable for a fixed body', () => {
  const ctx = renderContext('full', { usingSuperpowersBody: 'B' })
  const expected = [
    '<EXTREMELY_IMPORTANT>',
    'You have superpowers (bundled into wagerforge).',
    '',
    "**Below is the full content of your 'wagerforge:using-superpowers' skill — your introduction to using skills. For all other skills, use the 'Skill' tool:**",
    '',
    'B',
    '',
    ROUTER_NUDGE,
    '</EXTREMELY_IMPORTANT>',
  ].join('\n')
  assert.equal(ctx, expected)
})
test('ROUTER_NUDGE does not contain the substring "using-superpowers"', () => {
  assert.ok(!ROUTER_NUDGE.includes('using-superpowers'))
})
```

- [ ] **Step 2: Run, verify fail** — FAIL (`renderContext`/constants not exported).

- [ ] **Step 3: Implement** — append to `scripts/bootstrap-mode.mjs`:

```js
// Single source of the SessionStart context for both modes (Plugin Law #1).
export const ROUTER_NUDGE =
  'wagerforge is active. For any iGaming / slot / crypto-minigame task, route via the `wagerforge:using-wagerforge` skill first; for that work, `wagerforge:*` skills take routing precedence (the bundled process skills are the domain-tuned copies to prefer).'
export const DISCIPLINE_POINTER =
  'Before acting, check whether a relevant skill applies and invoke it via the Skill tool — even a 1% chance means check.'

export function renderContext(mode, { usingSuperpowersBody = '' } = {}) {
  if (mode === 'defer') return `${DISCIPLINE_POINTER}\n\n${ROUTER_NUDGE}`
  return [
    '<EXTREMELY_IMPORTANT>',
    'You have superpowers (bundled into wagerforge).',
    '',
    "**Below is the full content of your 'wagerforge:using-superpowers' skill — your introduction to using skills. For all other skills, use the 'Skill' tool:**",
    '',
    usingSuperpowersBody,
    '',
    ROUTER_NUDGE,
    '</EXTREMELY_IMPORTANT>',
  ].join('\n')
}
```

- [ ] **Step 4: Run, verify pass** — PASS.

- [ ] **Step 5: Commit** *(confirm first)*

```bash
git add scripts/bootstrap-mode.mjs scripts/bootstrap-mode.test.mjs
git commit -m "feat(bootstrap): renderContext + shared ROUTER_NUDGE/DISCIPLINE_POINTER; anti-double-injection guard"
```

---

## Task 4: Rewire the hook (fail-open shell) + spawn test + widen gate

**Files:** Modify `hooks/session-start.mjs`; Create `hooks/session-start.test.mjs`; Modify `README.md`.

- [ ] **Step 1: Write the failing spawn test** — create `hooks/session-start.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HOOK = fileURLToPath(new URL('./session-start.mjs', import.meta.url))
function run(extraEnv) {
  const out = execFileSync('node', [HOOK], { env: { ...process.env, ...extraEnv }, encoding: 'utf8' })
  const j = JSON.parse(out) // must always be valid JSON
  return j.hookSpecificOutput.additionalContext
}

test('WAGERFORGE_BOOTSTRAP=force emits the full bootstrap', () => {
  const ctx = run({ WAGERFORGE_BOOTSTRAP: 'force' })
  assert.ok(ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('wagerforge:using-wagerforge'))
})
test('WAGERFORGE_BOOTSTRAP=off emits defer with NO double-injection content', () => {
  const ctx = run({ WAGERFORGE_BOOTSTRAP: 'off' })
  assert.ok(!ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(!ctx.includes('using-superpowers'))
  assert.ok(ctx.includes('wagerforge:using-wagerforge'))
})
test('always emits parseable JSON with non-empty context', () => {
  assert.ok(run({ WAGERFORGE_BOOTSTRAP: 'force' }).length > 0)
  assert.ok(run({ WAGERFORGE_BOOTSTRAP: 'off' }).length > 0)
})
```

- [ ] **Step 2: Run, verify fail** — Run: `node --test hooks/session-start.test.mjs`. Expected: FAIL (current hook always emits full → the `off` test's `!includes('<EXTREMELY_IMPORTANT>')` fails).

- [ ] **Step 3: Rewrite `hooks/session-start.mjs`** (dynamic import so a module-load failure is caught by the fail-open):

```js
#!/usr/bin/env node
// SessionStart: emit the wagerforge bootstrap context. Mode (full|defer) is decided by
// scripts/bootstrap-mode.mjs. Dual-install safe: defers to an enabled superpowers instead of
// double-injecting. Fail-open: any error -> full bootstrap. Output JSON on stdout.
import { readFileSync } from 'node:fs'

function emit(ctx) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ctx },
  }))
}
function readBody() {
  try { return readFileSync(new URL('../skills/using-superpowers/SKILL.md', import.meta.url), 'utf8') } catch { return '' }
}

try {
  const m = await import('../scripts/bootstrap-mode.mjs')
  const mode = m.resolveBootstrapMode(
    process.env.WAGERFORGE_BOOTSTRAP,
    () => m.detectSuperpowers({ settingsPaths: m.defaultSettingsPaths() }),
  )
  emit(m.renderContext(mode, { usingSuperpowersBody: mode === 'full' ? readBody() : '' }))
} catch {
  // Hook-level fail-open. Must NOT depend on the module (the import itself may have failed).
  emit('<EXTREMELY_IMPORTANT>\nYou have superpowers (bundled into wagerforge).\n\n' + readBody() + '\n</EXTREMELY_IMPORTANT>')
}
```

- [ ] **Step 4: Widen the documented test gate** in `README.md` — replace:

```
- `node --test 'scripts/**/*.test.mjs'` — run tooling tests (glob form; newer Node treats a bare `scripts/` arg as a module, not a dir)
```
with:
```
- `node --test '{scripts,hooks}/**/*.test.mjs'` — run tooling + hook tests (brace glob covers both dirs; newer Node treats a bare dir arg as a module)
```

- [ ] **Step 5: Run, verify pass** — Run: `node --test hooks/session-start.test.mjs`. Expected: PASS (3 tests). Then `node --test '{scripts,hooks}/**/*.test.mjs'` → all pass.

- [ ] **Step 6: Commit** *(confirm first)*

```bash
git add hooks/session-start.mjs hooks/session-start.test.mjs README.md
git commit -m "feat(hooks): conditional bootstrap via bootstrap-mode (defer when superpowers enabled); fail-open shell"
```

---

## Task 5: Add `resume` to the SessionStart matcher

**Files:** Modify `hooks/hooks.json`.

- [ ] **Step 1: Edit `hooks/hooks.json`** — change the SessionStart matcher:

Replace `"matcher": "startup|clear|compact",` with `"matcher": "startup|clear|compact|resume",` (the line inside the `SessionStart` hook block only — the `PostToolUse` block is unchanged).

- [ ] **Step 2: Verify JSON validity + the change**

Run: `node -e 'const h=require("./hooks/hooks.json");const m=h.hooks.SessionStart[0].matcher;if(!m.includes("resume"))throw new Error("resume missing");console.log("OK:",m)'`
Expected: `OK: startup|clear|compact|resume`.

- [ ] **Step 3: Commit** *(confirm first)*

```bash
git add hooks/hooks.json
git commit -m "feat(hooks): also run SessionStart bootstrap on resume"
```

---

## Task 6: Version bump 0.2.1 + version-parity gate + CHANGELOG

**Files:** Modify `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`; Create `scripts/version-parity.test.mjs`, `CHANGELOG.md`.

- [ ] **Step 1: Write the failing parity test** — create `scripts/version-parity.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('plugin.json and marketplace.json versions match and are 0.2.1', () => {
  const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'))
  const market = JSON.parse(readFileSync(new URL('../.claude-plugin/marketplace.json', import.meta.url), 'utf8'))
  assert.equal(plugin.version, market.plugins[0].version)
  assert.equal(plugin.version, '0.2.1')
})
```

- [ ] **Step 2: Run, verify fail** — `node --test scripts/version-parity.test.mjs` → FAIL (both are still `0.2.0`).

- [ ] **Step 3: Bump both manifests.**
- `.claude-plugin/plugin.json`: `"version": "0.2.0"` → `"version": "0.2.1"`.
- `.claude-plugin/marketplace.json`: the plugin entry `"version": "0.2.0"` → `"version": "0.2.1"`.

- [ ] **Step 4: Run, verify pass** — `node --test scripts/version-parity.test.mjs` → PASS.

- [ ] **Step 5: Create `CHANGELOG.md`:**

```markdown
# Changelog

## 0.2.1 — 2026-06-09

### Changed
- **Dual-install safe SessionStart bootstrap.** When the `superpowers` plugin is already enabled,
  wagerforge now DEFERS — it emits only a short routing + discipline pointer instead of re-injecting
  the full `<EXTREMELY_IMPORTANT>` bootstrap, eliminating the double injection. Standalone users
  (no superpowers) are unaffected and still get the full bootstrap. This flips the SessionStart
  payload for dual-install users — intentional de-dup, not a regression.
- SessionStart now also runs on `resume`.

### Added
- `WAGERFORGE_BOOTSTRAP` env override (since 0.2.1): `force` = always full bootstrap, `off` = always defer.
- Tri-state detection with a fail-open guarantee: any unreadable/unparseable settings → full bootstrap
  (never a silent skip), so a hand-edited (JSONC) settings file can't cause a missed double-injection fix.

### Rollback
- Downgrade to 0.2.0 restores the unconditional full bootstrap, or set `WAGERFORGE_BOOTSTRAP=force`.
```

- [ ] **Step 6: Commit** *(confirm first)*

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json scripts/version-parity.test.mjs CHANGELOG.md
git commit -m "chore: bump to 0.2.1 + version-parity gate + CHANGELOG"
```

---

## Task 7: README dual-install note

**Files:** Modify `README.md`.

- [ ] **Step 1: Add a subsection** under the top "Self-contained" callout (after the install section, before `## Pillars`):

```markdown
### Already using superpowers?

wagerforge is dual-install safe. If you already have the `superpowers` plugin enabled, wagerforge
auto-detects it and **defers** — it will not re-inject the session bootstrap (no duplication), and its
bundled process skills remain available namespaced as `wagerforge:*` (they never override `superpowers:*`).
Override the auto-detection with `WAGERFORGE_BOOTSTRAP=force` (always inject wagerforge's bootstrap) or
`WAGERFORGE_BOOTSTRAP=off` (always defer). If settings can't be read, wagerforge fails safe to the full bootstrap.
```

- [ ] **Step 2: Verify** — Run: `grep -q "Already using superpowers" README.md && grep -q "WAGERFORGE_BOOTSTRAP" README.md && echo OK`. Expected: `OK`.

- [ ] **Step 3: Commit** *(confirm first)*

```bash
git add README.md
git commit -m "docs: README note on dual-install behavior + WAGERFORGE_BOOTSTRAP"
```

---

## Task 8: Full gate + spec/plan docs

**Files:** none new (validation only) + stage the spec/plan/panel docs.

- [ ] **Step 1: Validate skills** — `node scripts/validate.mjs` → expect `0 error(s), 0 warning(s)`.
- [ ] **Step 2: Full test suite (widened glob)** — `node --test '{scripts,hooks}/**/*.test.mjs'` → all pass (includes bootstrap-mode, version-parity, session-start).
- [ ] **Step 3: Manual sanity** — `WAGERFORGE_BOOTSTRAP=off node hooks/session-start.mjs` shows defer (no `<EXTREMELY_IMPORTANT>`); `WAGERFORGE_BOOTSTRAP=force node hooks/session-start.mjs` shows full. With env unset on this machine (superpowers enabled) → defer.
- [ ] **Step 4: Commit docs** *(confirm first)*

```bash
git add docs/specs/2026-06-09-conditional-bootstrap-design.md docs/plans/2026-06-09-conditional-bootstrap.md docs/research/2026-06-09-conditional-bootstrap-panel.md
git commit -m "docs: conditional-bootstrap spec v2, plan, and 10-expert panel record"
```

---

## Self-Review (against spec v2)

- **§2 tri-state resolution + hook fail-open:** Task 1 (tri-state), Task 2 (resolve), Task 4 (hook-level try/catch with dynamic import). ✓
- **§3 detection (per-file isolation, strict `=== true`, `/^superpowers@/`, os.homedir, injected settingsPaths, size/non-regular skip):** Task 1 code + tests. ✓
- **§4 renderContext + shared ROUTER_NUDGE + self-sufficient defer (DISCIPLINE_POINTER):** Task 3. ✓
- **§5 matrix incl. JSONC-anti-regression + unreadable→full:** Task 1 anti-regression + unreadable tests; Task 4 force/off spawn. ✓
- **§6 widened gate `{scripts,hooks}`, negative anti-double-injection assertion, golden wrapper, marketplace/homedir/oversized/non-bool cases, version-parity:** Tasks 1/3/4/6. ✓
- **§7 non-goals:** no lead mode, no managed scope, no heavy lstat — none added. ✓
- **§8 version 0.2.1 + CHANGELOG + rollback:** Task 6. ✓ **§ resume matcher:** Task 5. ✓
- **§9 success criteria 1-9:** covered by Tasks 1-8 (negative guard = Task 3/4; fail-open = Task 4; unreadable distinct = Task 1; marketplace-agnostic = Task 1; resume = Task 5; parity = Task 6; validate+tests = Task 8). ✓
- **Placeholder scan:** none — all code/commands concrete.
- **Type consistency:** `detectSuperpowers`/`resolveBootstrapMode`/`renderContext`/`ROUTER_NUDGE`/`DISCIPLINE_POINTER`/`defaultSettingsPaths`/`SUPERPOWERS_RE` used identically across tasks and the hook; tri-state strings `matched|absent|unreadable` consistent; mode strings `full|defer` consistent.
