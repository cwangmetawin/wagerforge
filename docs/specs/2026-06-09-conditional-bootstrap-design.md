# wagerforge — Conditional SessionStart bootstrap (dual-install safe) — Design v2

- **Date:** 2026-06-09
- **Status:** Reworked after 10-expert panel (`docs/research/2026-06-09-conditional-bootstrap-panel.md`, verdict: rework-spec-first). Pending re-confirmation → implementation plan.
- **Author:** Chao Wang
- **Builds on:** the vendoring work (`docs/specs/2026-06-05-vendor-superpowers-design.md`, merged at 9ccc26b).

---

## 1. Context & motivation

After vendoring, wagerforge is self-contained: `hooks/session-start.mjs` injects the `using-superpowers`
discipline bootstrap wrapped in `<EXTREMELY_IMPORTANT>` every session. Correct for users **without**
superpowers; but wagerforge must serve **two customer types**:

1. **Without superpowers** — inject the full bootstrap + bundled skills (today's behavior).
2. **With superpowers already enabled** — do NOT step on their config.

**What actually breaks for type 2 (verified via claude-code-guide + live machine):**
- **Skills do NOT collide.** Claude Code namespaces plugin skills (`superpowers:brainstorming` vs `wagerforge:brainstorming`); both addressable, neither overrides. So vendored skills do not override a user's superpowers — at worst cosmetic list duplication (not runtime-hideable per user).
- **The real problem is double bootstrap injection.** Both plugins' SessionStart hooks emit `additionalContext`; Claude Code has no documented dedup → the `<EXTREMELY_IMPORTANT>` bootstrap injects **twice**.

**Goal:** make the bootstrap injection conditional so both customer types are correct with zero config, with an explicit override hatch — **without** a silent failure mode that re-creates double injection on the protected cohort.

## 2. Decision

**Auto-detect superpowers + env override + self-sufficient defer (Approach 1), with TRI-STATE detection and hook-level fail-open.** The hook resolves a *mode* (`full` | `defer`):
- **`full`** — inject `<EXTREMELY_IMPORTANT>` using-superpowers bootstrap + router nudge (today's behavior).
- **`defer`** — inject ONLY: a one-line standalone discipline pointer + the (shared, directive) router nudge. No `<EXTREMELY_IMPORTANT>`, no using-superpowers body. Self-sufficient (see §4) so it is safe even if superpowers' own hook never runs.

Mode resolution (first match wins):
1. `WAGERFORGE_BOOTSTRAP=force` → `full`
2. `WAGERFORGE_BOOTSTRAP=off` → `defer`
3. detection result `matched` → `defer`
4. detection result `absent` or `unreadable` → `full`

**Fail-open lives in the HOOK, not only in the detector (panel must-fix #2):** the entire resolve+render
body is wrapped in a top-level try/catch that, on ANY thrown error (failed import / fs / parse), emits the
full bootstrap. Rationale: the worst failure is a standalone user silently losing the discipline.

## 3. Detection — TRI-STATE (panel must-fix #1, #5, #6)

The earlier v1 conflated "superpowers genuinely absent" with "settings unreadable/unparseable", both → `false`
→ `full`. That is the **critical bug**: `JSON.parse` throws on JSONC (verified: `// comments` and trailing
commas throw on Node v24). A dual-install user with one hand-edited settings file would parse to "not enabled"
→ `full` → **double injection on exactly the cohort this design protects**, silently. Fixed by a tri-state:

`detectSuperpowers({ settingsPaths, readFileSync }) → 'matched' | 'absent' | 'unreadable'`
- **`settingsPaths`** is an INJECTED, ordered low→high list (architecture seam — lets a future managed/enterprise scope be a caller change, not a logic change). Default caller passes, low→high precedence:
  1. user `os.homedir()/.claude/settings.json` — `homeDir` pinned to `os.homedir()`, NOT `process.env.HOME`.
  2. project `${projectDir}/.claude/settings.json`
  3. local `${projectDir}/.claude/settings.local.json`
  where `projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()`. The hook does NOT read stdin.
- **Per-file isolation:** each path is read+parsed in its OWN try/catch. A file that is missing → contributes nothing (`{}`); a file that exists but fails to read/parse/size-check → marks the result `unreadable` for that scope but does NOT abort the merge. Before reading, `statSync().size` skips oversized files (cap, e.g. 1 MiB) and non-regular files are skipped; keep it lightweight — NO per-OS lstat/symlink traversal (panel unresolved → SHOULD, not heavy).
- **Merge + decide:**
  - Collect each readable scope's `enabledPlugins` map; merge low→high so a higher scope overrides a lower one.
  - **`matched`** iff, in the merged map, some key matching `/^superpowers@/` has the value strictly `=== true` (non-boolean values like `"true"`, `1`, `{}` are ignored → not a match; a higher scope setting it `false` overrides a lower `true`).
  - Else if every needed file was missing/clean and no match → **`absent`**.
  - Else if at least one scope was `unreadable` AND no clean `matched` signal exists anywhere → **`unreadable`** (still maps to `full`, but is a DISTINCT state, surfaced in logs/tests, so the bug above can never silently recur and a future maintainer can choose to treat it differently).
- **Marketplace-agnostic:** match ANY `superpowers@<marketplace>` (e.g. `@claude-plugins-official`, `@inline`, `@<localname>`) via the prefix. NON-matches: `superpowers-ng@mp`, `wagerforge@superpowers`.

## 4. Components

**`scripts/bootstrap-mode.mjs` (NEW — pure logic, in `scripts/` for the test gate):**
- `detectSuperpowers({ settingsPaths, readFileSync, statSync })` → `'matched'|'absent'|'unreadable'` (per §3).
- `resolveBootstrapMode(env, detect)` → `'full'|'defer'`. Pure; `detect` is a 0-arg thunk so env-override branches never touch the filesystem. Maps `matched→defer`, `absent|unreadable→full`.
- `renderContext(mode, { usingSuperpowersBody })` → string. The SINGLE source of the emitted context for both modes. Uses one shared `ROUTER_NUDGE` constant (panel should: Plugin Law #1). `full` = `<EXTREMELY_IMPORTANT>` wrapper + `usingSuperpowersBody` + `ROUTER_NUDGE`. `defer` = `DISCIPLINE_POINTER` + `ROUTER_NUDGE` only.
- Constants: `ROUTER_NUDGE` (directive: for iGaming/slot/crypto-minigame tasks, route via `wagerforge:using-wagerforge`; `wagerforge:*` skills take precedence and the duplicate list entries are the domain-tuned copies to prefer). `DISCIPLINE_POINTER` = one line, e.g. `Before acting, check whether a relevant skill applies and invoke it via the Skill tool.`

**`hooks/session-start.mjs` (MODIFIED — thin I/O, fail-open shell):**
```
try {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const paths = [user, project, local]   // built from os.homedir() + projectDir
  const mode = resolveBootstrapMode(process.env.WAGERFORGE_BOOTSTRAP,
                 () => detectSuperpowers({ settingsPaths: paths, readFileSync, statSync }))
  const body = mode === 'full' ? readFileSync(usingSuperpowersPath, 'utf8') : ''
  emit(renderContext(mode, { usingSuperpowersBody: body }))
} catch { emit(renderFull()) }   // hook-level fail-open
```
Output JSON envelope unchanged (`hookSpecificOutput.additionalContext`).

**SessionStart matcher (panel unresolved → decided):** add `resume` to the existing `startup|clear|compact`.
Safe now that defer is self-sufficient; strict improvement (resumed sessions also get routing/discipline).

## 5. Behavior matrix

| Scenario | detection | mode | injected |
|---|---|---|---|
| No superpowers | absent | full | `<EXTREMELY_IMPORTANT>` bootstrap + nudge |
| superpowers enabled | matched | defer | discipline pointer + router nudge only |
| superpowers enabled but its hook absent/errored | matched | defer | still safe — defer is self-sufficient (discipline pointer present) |
| `WAGERFORGE_BOOTSTRAP=force` | (skipped) | full | forced full |
| `WAGERFORGE_BOOTSTRAP=off` | (skipped) | defer | forced defer |
| one settings file is JSONC/garbage, another clean scope has `superpowers@x:true` | matched | defer | NOT double-injected (the v1 bug) |
| settings unreadable AND no clean superpowers signal | unreadable | full | fail-open |
| any unexpected throw in the hook | — | full | hook-level fail-open |

## 6. Testing — gate widened to `node --test '{scripts,hooks}/**/*.test.mjs'` (panel must-fix #3)

State the chosen glob in README/§9. `scripts/bootstrap-mode.test.mjs`:

`detectSuperpowers` (inject fake `readFileSync`/`statSync` mapping path→content/size):
- user scope `superpowers@claude-plugins-official: true` → `matched`
- `superpowers@inline: true` and `superpowers@localname: true` → `matched` (marketplace-agnostic)
- non-matches `superpowers-ng@mp: true`, `wagerforge@superpowers: true` → `absent`
- project/local override user `true`→`false` → `absent`; local re-enables → `matched`
- no `superpowers@*` key anywhere → `absent`
- one file malformed JSONC BUT another clean scope has `superpowers@x:true` → `matched` (per-file isolation; the anti-regression case)
- malformed/garbage everywhere, no clean signal → `unreadable` (NOT silently absent)
- missing files (readFileSync ENOENT) → `absent`, no throw
- oversized file (statSync.size over cap) → skipped, not parsed
- non-boolean value (`"true"`, `1`, `{}`) → not a match
- user-scope path derived from an injected non-`HOME` `homeDir` resolves correctly

`resolveBootstrapMode`: env `force`→full (detect NOT called); `off`→defer; unset+matched→defer; unset+absent→full; unset+unreadable→full.

`renderContext` (the mode→string contract — the real anti-double-injection guard):
- `full` → contains `<EXTREMELY_IMPORTANT>` AND the using-superpowers body AND `ROUTER_NUDGE`; `JSON`-embeddable.
- `defer` → contains `DISCIPLINE_POINTER` AND `ROUTER_NUDGE`; **does NOT contain** `<EXTREMELY_IMPORTANT>` nor `using-superpowers` (negative guard).
- full output literally contains the exact `ROUTER_NUDGE` substring used by defer (shared constant).
- golden/snapshot of full-mode `additionalContext` so a future re-vendor that changes the using-superpowers body forces a deliberate version decision.

Hook-level: a small test that invoking the hook with `WAGERFORGE_BOOTSTRAP=off` emits valid JSON whose `additionalContext` is defer-shaped, and with `=force` is full-shaped (proves the wiring, not just the pure fns).

Version parity: `scripts/version-parity.test.mjs` asserting `plugin.json.version === marketplace.json plugins[0].version`.

## 7. Non-goals / explicitly rejected this release (panel unresolved → decided)

- **No third `lead` mode and no project-committable `wagerforge.bootstrap` settings key.** The legitimate need (a dual-install user who wants wagerforge routing to win) is served by `WAGERFORGE_BOOTSTRAP=force` + the now-directive defer nudge. Revisit only if demand appears.
- **No managed/enterprise settings scope** in 0.2.1 — but the injected `settingsPaths` list makes adding it later a caller change, not a detection-logic change.
- No heavy per-OS symlink/FIFO/lstat hardening (self-machine threat model; the `statSync.size` + non-regular skip + per-file try/catch is the agreed cheap hardening).
- Do NOT modify the 14 vendored skills or the `using-wagerforge` router substance. No second "lite" plugin variant. No `validate.mjs` rule change. Skill-list duplication for dual users is accepted (cosmetic).

## 8. Versioning, changelog, rollback (panel should)

- **Behavior-changing-but-compatible** (not "additive"): for dual-install users the SessionStart payload flips from full bootstrap to router-only — intentional de-dup, not a regression; standalone users are unaffected. Bump `0.2.0 → 0.2.1` in `plugin.json` + `marketplace.json` (guarded by the version-parity test).
- **`CHANGELOG.md`** (NEW) 0.2.1 entry: the dual-install flip, the `WAGERFORGE_BOOTSTRAP=force|off` hatch ("since 0.2.1"), the tri-state + fail-open guarantee.
- **Rollback:** downgrade to 0.2.0 restores unconditional full; or set `WAGERFORGE_BOOTSTRAP=force` per environment.

## 9. Success criteria

1. superpowers enabled → `node hooks/session-start.mjs` emits defer (discipline pointer + nudge), with NO `<EXTREMELY_IMPORTANT>` / using-superpowers content (negative anti-double-injection assertion passes).
2. superpowers absent → full bootstrap exactly as before (golden snapshot stable).
3. The JSONC-anti-regression case (one malformed scope + a clean superpowers signal in another) → defer, NOT double injection.
4. `WAGERFORGE_BOOTSTRAP=force|off` overrides detection; detection thunk not even called when env decides.
5. Any thrown error in the hook → full bootstrap (hook-level fail-open), never an exception.
6. `unreadable` is a distinct, surfaced state (not silently `absent`).
7. Detection is marketplace-agnostic (`@inline`, `@localname` match) and strict-boolean.
8. `resume` is in the SessionStart matcher.
9. `node scripts/validate.mjs` → 0 errors; `node --test '{scripts,hooks}/**/*.test.mjs'` → all pass incl. all new tests; version parity holds.
