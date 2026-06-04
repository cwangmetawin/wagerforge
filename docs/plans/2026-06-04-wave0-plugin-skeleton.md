# wagerforge Wave 0 — Plugin Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **GIT IS USER-GATED.** `wagerforge/` is not yet a git repo and the user's rules forbid any git command without explicit approval. Before executing, ask the user to approve `git init` inside `wagerforge/`. If declined, **skip every "Commit" step** — all other steps still apply and the work remains valid. Never run git outside `wagerforge/`; never touch the parent `Developments/` folder.

**Goal:** Stand up an installable, self-validating wagerforge plugin skeleton (manifest + router skill + authoring template + SessionStart hook + a real `validate.mjs` quality gate + plugin laws), so every later wave is authored under a quality gate.

**Architecture:** Single Claude Code plugin (Approach A). Skills are the single source of truth; this wave ships the scaffolding + the one router skill + the validator that guards all future skills. Companion to `superpowers` (delegates generic process). Zero runtime deps — tooling is zero-build `.mjs` using Node's built-in `node:test`.

**Tech Stack:** Node ≥18 (ESM `.mjs`, `node:test`, `node:assert`), Claude Code plugin manifest/hooks, Markdown SKILL.md with YAML frontmatter.

---

## File Structure

| File | Responsibility |
|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest (name, version, description, keywords) |
| `.claude-plugin/marketplace.json` | Makes it installable; documents the `superpowers` companion |
| `scripts/validate.mjs` | Quality gate: validates every `skills/*/SKILL.md` (frontmatter, name match, description trigger-shape, word budget, broken `[[links]]`). Exports pure `validate()` + CLI. |
| `scripts/validate.test.mjs` | `node:test` suite for the validator (fixtures in tmp dir) |
| `skills/using-wagerforge/SKILL.md` | Domain router; defers generic work to `using-superpowers` |
| `templates/SKILL.template.md` | The authoring standard, copy-to-start for every new skill |
| `hooks/hooks.json` | Registers the SessionStart hook |
| `hooks/session-start.mjs` | Emits "load using-wagerforge" + soft-checks `superpowers` presence |
| `CLAUDE.md` | Plugin laws: SoT, escape-hatch, C1–C14 pointer, credential exclusion |
| `README.md` | Install (+ `Requires: superpowers >= 5.x`) + pillar tour |

---

## Task 1: Plugin manifest

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Write `plugin.json`**

```json
{
  "name": "wagerforge",
  "description": "iGaming superpowers: skills for slot math, provable fairness, RGS & durable settlement, economy, QA and compliance. Companion to the superpowers plugin.",
  "version": "0.1.0",
  "author": { "name": "Chao Wang" },
  "license": "MIT",
  "keywords": ["igaming", "slots", "crypto-minigames", "provably-fair", "rtp", "rgs", "skills"]
}
```

- [ ] **Step 2: Write `marketplace.json`**

```json
{
  "name": "wagerforge-dev",
  "description": "Development marketplace for the wagerforge iGaming skills library",
  "owner": { "name": "Chao Wang" },
  "plugins": [
    {
      "name": "wagerforge",
      "description": "iGaming superpowers (companion to superpowers). Requires the superpowers plugin >= 5.x for generic engineering process.",
      "version": "0.1.0",
      "source": "./"
    }
  ]
}
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json')); JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit** *(git-gated — see header)*

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "feat: wagerforge plugin manifest + marketplace"
```

---

## Task 2: The `validate.mjs` quality gate (real TDD)

**Files:**
- Create: `scripts/validate.mjs`
- Test: `scripts/validate.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/validate.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validate, parseFrontmatter, wordCount } from './validate.mjs'

function makeSkills(spec) {
  const root = mkdtempSync(join(tmpdir(), 'wf-'))
  for (const [name, content] of Object.entries(spec)) {
    mkdirSync(join(root, name), { recursive: true })
    if (content !== null) writeFileSync(join(root, name, 'SKILL.md'), content)
  }
  return root
}

test('valid skill passes with no errors', () => {
  const root = makeSkills({
    'math-rtp-modeling': `---\nname: math-rtp-modeling\ndescription: Use when modeling or verifying a target RTP.\n---\n\nBody.`,
  })
  const { errors } = validate(root)
  assert.equal(errors.length, 0)
  rmSync(root, { recursive: true, force: true })
})

test('name not matching folder is an error', () => {
  const root = makeSkills({
    'math-rtp-modeling': `---\nname: wrong-name\ndescription: Use when X.\n---\nBody.`,
  })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('!= folder')))
  rmSync(root, { recursive: true, force: true })
})

test('missing SKILL.md is an error', () => {
  const root = makeSkills({ 'fair-verify': null })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('missing SKILL.md')))
  rmSync(root, { recursive: true, force: true })
})

test('broken [[link]] is a warning', () => {
  const root = makeSkills({
    'fair-verify': `---\nname: fair-verify\ndescription: Use when verifying provable fairness.\n---\nSee [[does-not-exist]].`,
  })
  const { warnings } = validate(root)
  assert.ok(warnings.some((w) => w.includes('broken [[link]]')))
  rmSync(root, { recursive: true, force: true })
})

test('parseFrontmatter + wordCount helpers', () => {
  const p = parseFrontmatter(`---\nname: x\ndescription: Use when y.\n---\nbody here`)
  assert.equal(p.fm.name, 'x')
  assert.equal(p.fm.description, 'Use when y.')
  assert.equal(wordCount('one two three'), 3)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'scripts/**/*.test.mjs'`
Expected: FAIL — `Cannot find module './validate.mjs'` (or import error).

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/validate.mjs`:

```js
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SKILL_NAME_RE = /^[a-z0-9-]+$/
const WHEN_TRIGGER_RE = /\buse (when|during|before|after|this)\b/i
const WORD_BUDGET = 500
const WORD_HARD_CAP = 800

export function parseFrontmatter(md) {
  if (!md.startsWith('---')) return null
  const end = md.indexOf('\n---', 3)
  if (end === -1) return null
  const fmText = md.slice(3, end).trim()
  const body = md.slice(end + 4)
  const fm = {}
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (m) fm[m[1]] = m[2].trim()
  }
  return { fm, body }
}

export function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length
}

export function validate(skillsDir) {
  const errors = []
  const warnings = []
  if (!existsSync(skillsDir)) {
    errors.push(`skills dir not found: ${skillsDir}`)
    return { errors, warnings }
  }
  const dirs = readdirSync(skillsDir).filter((d) => {
    const p = join(skillsDir, d)
    return statSync(p).isDirectory() && !d.startsWith('_') && !d.startsWith('.')
  })
  const known = new Set(dirs)
  for (const dir of dirs) {
    const skillPath = join(skillsDir, dir, 'SKILL.md')
    const tag = `[${dir}]`
    if (!existsSync(skillPath)) { errors.push(`${tag} missing SKILL.md`); continue }
    const parsed = parseFrontmatter(readFileSync(skillPath, 'utf8'))
    if (!parsed) { errors.push(`${tag} missing/invalid frontmatter`); continue }
    const { fm, body } = parsed
    if (!fm.name) {
      errors.push(`${tag} frontmatter missing name`)
    } else {
      if (!SKILL_NAME_RE.test(fm.name)) errors.push(`${tag} name not hyphen-case: ${fm.name}`)
      if (fm.name !== dir) errors.push(`${tag} name "${fm.name}" != folder "${dir}"`)
    }
    if (!fm.description) {
      errors.push(`${tag} frontmatter missing description`)
    } else {
      if (fm.description.length > 1024) errors.push(`${tag} description > 1024 chars`)
      if (!WHEN_TRIGGER_RE.test(fm.description)) warnings.push(`${tag} description not trigger-shaped (no "Use when…")`)
    }
    const wc = wordCount(body)
    if (wc > WORD_HARD_CAP) errors.push(`${tag} body ${wc} words > hard cap ${WORD_HARD_CAP}`)
    else if (wc > WORD_BUDGET) warnings.push(`${tag} body ${wc} words > budget ${WORD_BUDGET}`)
    for (const m of body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
      if (!known.has(m[1])) warnings.push(`${tag} broken [[link]]: ${m[1]}`)
    }
  }
  return { errors, warnings }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const skillsDir = process.argv[2] || new URL('../skills', import.meta.url).pathname
  const { errors, warnings } = validate(skillsDir)
  for (const w of warnings) console.warn('WARN ' + w)
  for (const e of errors) console.error('ERR  ' + e)
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(errors.length ? 1 : 0)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'scripts/**/*.test.mjs'`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit** *(git-gated)*

```bash
git add scripts/validate.mjs scripts/validate.test.mjs
git commit -m "feat: validate.mjs skill quality gate with tests"
```

---

## Task 3: SKILL.md authoring template

**Files:**
- Create: `templates/SKILL.template.md`

- [ ] **Step 1: Write the template**

```markdown
---
name: <prefix>-<topic>
description: Use when <concrete trigger / symptom / keyword> — third person, WHEN to use only, ≤1024 chars, never a process summary.
---

# <Human Title>

## When to use / When NOT
- Use when: …
- Do NOT use for: … (point elsewhere, e.g. a sibling skill or `superpowers:<skill>`)

## Default stack (+ escape hatch)
Default: <TS + PixiJS/Phaser + Node + decimal.js …>. If your project uses X instead, map: <concept → concept>.

## Process
1. …
2. …
<!-- graphviz flowchart ONLY for a non-obvious A-vs-B decision, never for linear steps -->

## Correctness constraints
<!-- If this skill is tagged [Cn] in the spec, state the CORRECTED rule here, never the folk version. -->

## Pitfalls / red flags
- …

## Verification
- How to know it worked (evidence, not vibes).

<!-- Deep material → references/*.md (loaded on demand). Runnable tools → scripts/. Body target <500 words. -->
```

- [ ] **Step 2: Verify it does not pollute skill validation**

Run: `node scripts/validate.mjs`
Expected: `templates/` is ignored (only `skills/*` is scanned); no error mentioning `SKILL.template`.

- [ ] **Step 3: Commit** *(git-gated)*

```bash
git add templates/SKILL.template.md
git commit -m "docs: SKILL.md authoring template"
```

---

## Task 4: The `using-wagerforge` router skill

**Files:**
- Create: `skills/using-wagerforge/SKILL.md`

> REQUIRED SUB-SKILL: this is a skill — author it under `superpowers:writing-skills` (Iron Law). The "test" is behavioral (Step 3), not a unit test.

- [ ] **Step 1: Write the router skill**

```markdown
---
name: using-wagerforge
description: Use when starting any iGaming, slot, or crypto-minigame task (RTP/house-edge math, provable fairness/RNG, RGS or wallet settlement, game economy, math/RNG QA, or gambling compliance) — routes to the right wagerforge skill and defers generic engineering process to superpowers.
---

# Using wagerforge

wagerforge is the domain layer for building real-money slot & crypto-minigame software. It is a **companion to superpowers**: superpowers owns generic process; wagerforge owns iGaming WHAT.

## Routing

**Generic engineering process → delegate to superpowers** (do NOT reimplement):
- ideation/design → `superpowers:brainstorming`
- plan a spec → `superpowers:writing-plans`
- execute → `superpowers:subagent-driven-development` / `superpowers:executing-plans`
- TDD → `superpowers:test-driven-development`
- debugging → `superpowers:systematic-debugging`
- review → `superpowers:requesting-code-review` / `superpowers:receiving-code-review`
- authoring a wagerforge skill → `superpowers:writing-skills`

**Domain task → wagerforge skill by prefix:**
- probability/RTP/paytable → `math-*`
- provable fairness, RNG, seeds → `fair-*`
- engine, RGS, wallet, settlement, deploy → `build-*`
- bonus, jackpot, A/B, LTV, liveops → `econ-*`
- simulation/cert/regression/load testing → `qa-*`
- responsible gaming, certification, audit → `comp-*`

## Order
Process-before-implementation holds: brainstorm → plan → execute, with wagerforge domain skills invoked **inside** implementation. User instructions (CLAUDE.md) outrank skills.

## If superpowers is missing
Tell the user to install the superpowers companion plugin; do not silently reimplement its process skills.
```

- [ ] **Step 2: Run the validator over the router**

Run: `node scripts/validate.mjs`
Expected: `0 error(s)` (warnings tolerated). The `using-wagerforge` description is trigger-shaped and name matches folder.

- [ ] **Step 3: Behavioral check (Iron Law GREEN)**

In a scratch Claude session with the plugin loaded, give a domain prompt: "design the math for a new plinko game." Expected: Claude routes to `superpowers:brainstorming` first, then `math-*`, rather than free-styling. Record the observation in the PR/commit message. (RED baseline = same prompt without the router tends to skip straight to implementation.)

- [ ] **Step 4: Commit** *(git-gated)*

```bash
git add skills/using-wagerforge/SKILL.md
git commit -m "feat: using-wagerforge router skill"
```

---

## Task 5: SessionStart hook

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/session-start.mjs`
- Reference: `/Users/chaowang/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/hooks/hooks.json` (confirm exact schema/keys against this working example before finalizing)

- [ ] **Step 1: Read the superpowers hooks.json as the schema reference**

Run: `cat "/Users/chaowang/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/hooks/hooks.json"`
Expected: see the exact `SessionStart` shape and how the command path is expressed (e.g. `${CLAUDE_PLUGIN_ROOT}`). Match it in Step 2.

- [ ] **Step 2: Write `session-start.mjs`**

```js
#!/usr/bin/env node
// Emits a SessionStart additionalContext nudging Claude to load using-wagerforge,
// and soft-checks for the superpowers companion. Output JSON on stdout.
const msg = [
  'wagerforge plugin active. For any iGaming / slot / crypto-minigame task, first invoke the `using-wagerforge` skill to route correctly.',
  'wagerforge delegates generic engineering process (brainstorm/plan/TDD/debug/review) to the `superpowers` companion plugin. If superpowers skills do not resolve, tell the user to install it.',
].join(' ')
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg },
}))
```

- [ ] **Step 3: Write `hooks/hooks.json`** (adjust keys to match the Step-1 reference)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs\"" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Verify the hook script runs and emits valid JSON**

Run: `node hooks/session-start.mjs | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{JSON.parse(s);console.log('OK')})"`
Expected: `OK`

- [ ] **Step 5: Commit** *(git-gated)*

```bash
git add hooks/hooks.json hooks/session-start.mjs
git commit -m "feat: SessionStart hook loads using-wagerforge + soft-checks superpowers"
```

---

## Task 6: Plugin laws (`CLAUDE.md`)

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# wagerforge — Plugin Laws

These bind every wagerforge skill, command, agent, and hook.

1. **Skill is the single source of truth.** Knowledge is written once in a skill. Commands/agents/hooks stay thin and reference skills by name; they never restate domain knowledge.
2. **Delegate process to superpowers.** Never reimplement brainstorming/planning/TDD/debugging/review/skill-authoring. Reference `superpowers:*` by name; never `@`-force-load or Read its files.
3. **Opinionated default stack + escape hatch.** Every `build-*` skill states the default (TS + PixiJS/Phaser + Node + decimal.js) and a concept-mapping for other stacks.
4. **Server-authoritative always.** Client renders server-resolved results; it never computes payouts, RTP, or outcomes.
5. **Correctness constraints C1–C14 are law.** Any skill touching those areas encodes the corrected statement from the spec (`docs/specs/2026-06-04-wagerforge-design.md` §7), never the refuted folk version.
6. **Credential exclusion.** Never reference the keys listed in `docs/SECURITY-NOTE.md`. Credential handling uses secret managers / WIF, never on-disk keys.
7. **Validate before done.** `node scripts/validate.mjs` must pass (0 errors) before any skill is considered complete.
```

- [ ] **Step 2: Commit** *(git-gated)*

```bash
git add CLAUDE.md
git commit -m "docs: wagerforge plugin laws"
```

---

## Task 7: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# wagerforge

iGaming superpowers for Claude Code — skills for slot math, provable fairness, RGS & durable settlement, game economy, math/RNG QA, and gambling compliance.

> **Requires the `superpowers` plugin (>= 5.x).** wagerforge owns iGaming domain knowledge; it delegates all generic engineering process (brainstorm, plan, TDD, debug, review) to superpowers.

## Install
Add this folder as a marketplace and install the plugin:
- `/plugin marketplace add <path-or-repo-to-wagerforge>`
- `/plugin install wagerforge`
- Ensure `superpowers` is also installed.

## Pillars (skill prefixes)
- `math-` — probability, RTP, paytables, crash/ladder/cluster/lottery math
- `fair-` — provable fairness (HMAC commit-reveal), RNG integrity, independent verification
- `build-` — engine/rendering, RGS, wallet, **durable settlement**, deploy
- `econ-` — bonus/jackpot design, A/B, LTV, liveops
- `qa-` — Monte-Carlo certification, golden regression, RNG statistics, load
- `comp-` — responsible gaming, RNG/RTP certification, audit & privacy

Start any iGaming task by invoking the `using-wagerforge` skill.

## Develop
- `node scripts/validate.mjs` — validate all skills
- `node --test scripts/` — run tooling tests

See `docs/specs/` for the design and `docs/research/` for the grounding dossier.
```

- [ ] **Step 2: Commit** *(git-gated)*

```bash
git add README.md
git commit -m "docs: wagerforge README"
```

---

## Task 8: Whole-plugin validation (integration)

**Files:** none (verification only)

- [ ] **Step 1: Run the validator over the real skills dir**

Run: `node scripts/validate.mjs`
Expected: `0 error(s), N warning(s)` — only `using-wagerforge` exists so far and passes.

- [ ] **Step 2: Run the tooling test suite**

Run: `node --test 'scripts/**/*.test.mjs'`
Expected: all tests PASS.

- [ ] **Step 3: Confirm the plugin tree is complete**

Run: `ls -R .claude-plugin skills hooks scripts templates`
Expected: every file from the File Structure table is present.

- [ ] **Step 4: Commit** *(git-gated)*

```bash
git add -A
git commit -m "chore: Wave 0 plugin skeleton complete"
```

---

## Self-Review (completed by author)

- **Spec coverage:** Wave 0 maps to spec §3 (layout), §4 (router/companion), §6 (authoring standard → template + validator), §10 (Wave 0 list), §11 (validate.mjs, companion check). Domain skills (math/fair/build/econ/qa/comp) are intentionally **out of scope** — they land in Wave 1a/1b/2/3 plans.
- **Placeholders:** none — every code/content step contains full content; `validate.mjs` and its tests are complete and runnable.
- **Type/name consistency:** validator exports `validate` / `parseFrontmatter` / `wordCount` — used by those exact names in the test. Skill folder `using-wagerforge` matches its frontmatter `name`. Hook path uses `${CLAUDE_PLUGIN_ROOT}` (verify against superpowers reference in Task 5 Step 1).

## Next plans (not this wave)
- **Wave 1a — Fairness core:** `fair-rng-core` (+ Known-Answer Tests), `fair-verify`, `fair-commit-reveal`, `qa-fairness-verification`, `/wagerforge:fairness-audit`, `fairness-auditor` agent, RNG/seed hook.
- **Wave 1b — Math core:** `math-rtp-modeling`, `math-montecarlo-simulation`, `qa-math-validation` + scripts, `/wagerforge:rtp-check`, `slot-math-designer` agent, math hook.
- **Wave 1c — Build/settlement core:** `build-minigame-from-scratch`, `build-game-server-rgs`, `build-wallet-and-money`, `build-durable-settlement`, `qa-settlement-integrity`, `econ-bonus-design`, `comp-responsible-gaming`.
- **Waves 2–3:** remaining engine-room and breadth skills.
```
