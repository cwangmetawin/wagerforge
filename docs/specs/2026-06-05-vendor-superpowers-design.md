# wagerforge — Vendoring superpowers (self-contained integration) — Design

- **Date:** 2026-06-05
- **Status:** Approved (design); pending spec review → implementation plan
- **Author:** Chao Wang
- **Supersedes:** the "companion to superpowers" posture in `README.md`, `.claude-plugin/*.json`, and **Plugin Law #2** in `CLAUDE.md`.

---

## 1. Context & motivation

Today wagerforge is a **companion** plugin: it owns iGaming domain knowledge and *delegates* all generic engineering process (brainstorm/plan/TDD/debug/review/skill-authoring) to the external **superpowers** plugin (`github.com/obra/superpowers`, MIT, currently 5.1.0). This is encoded as Plugin Law #2 and documented as a hard prerequisite in the README and marketplace entry.

The user wants superpowers **fully integrated** into wagerforge. Stated goals (all four selected):

1. **One-step install / self-contained distribution** — install only wagerforge, get everything.
2. **Version pinning** — a known-good superpowers can't be broken by upstream churn.
3. **Trim / customize for iGaming** — own the right to adapt.
4. **Full ownership** — no third-party runtime dependency.

**Licensing finding (the unblock):** superpowers is **MIT** (`Copyright (c) 2025 Jesse Vincent`). MIT permits copy/modify/merge/sublicense **provided the copyright notice and license text are preserved**. Therefore vendoring is legally sound *with attribution*. The user explicitly requires the copyright notice be carried over.

**Real cost (not legal, but maintenance):** superpowers is very active (66 KB of release notes, at 5.1.0). Vendoring forks it; we own staying current.

## 2. Decision

**Approach A — clean vendor, flat layout, `wagerforge:`-namespaced references.** Copy superpowers' 14 skills (plus their `references/`) into wagerforge's `skills/` directory at the top level, alongside the 52 domain skills. Rewrite every `superpowers:<name>` reference (in wagerforge's own files **and** inside the vendored skills' internal cross-references) to `wagerforge:<name>`. wagerforge's existing Node SessionStart hook takes over the bootstrap-injection role. Attribution is preserved per §5.

**No name collisions:** the 14 superpowers skill names (`brainstorming`, `writing-plans`, `test-driven-development`, …) do not collide with wagerforge's names (all prefixed `build-`/`comp-`/`econ-`/`fair-`/`math-`/`qa-`/`using-wagerforge`).

**Rejected alternatives:**
- **B — nested `skills/_vendor/superpowers/`:** Claude Code discovers skills by scanning `skills/*/SKILL.md` one level deep; nesting risks non-discovery. Provenance is solved by attribution files, not directory nesting. Rejected.
- **C — git subtree of upstream:** eases updates but fights goals 3 & 4 (local customization is clobbered on pull) and still must land under `skills/` to be discovered. Kept only as the conceptual basis for the re-vendor tooling in §10.

## 3. Scope of vendoring

**Copied (Claude-relevant):**
- All 14 skills with their full content **unmodified** except mechanical namespace rewrites (§6): `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`.
- Each skill's `references/` subdirectory.
- The SessionStart bootstrap *behavior* (re-implemented in wagerforge's `.mjs` hook, §7 — not a file copy).

**NOT copied (non-Claude platform config / cross-platform plumbing):**
`.codex-plugin/`, `.cursor-plugin/`, `.opencode/`, `gemini-extension.json`, `GEMINI.md`, `hooks/hooks-cursor.json`, `hooks/run-hook.cmd`, `hooks/session-start` (bash), `scripts/sync-to-codex-plugin.sh`. Within `using-superpowers`, the Copilot/Codex/Gemini "platform adaptation" pointers are trimmed (wagerforge targets Claude Code), but no process substance is altered.

## 4. Repository structure (after)

```
wagerforge/
├── CLAUDE.md                      # Law #2 rewritten (§8)
├── LICENSE                        # wagerforge's own MIT (unchanged)
├── THIRD-PARTY-NOTICES.md         # NEW — superpowers MIT + © 2025 Jesse Vincent (§5)
├── README.md                      # prerequisite removed; Credits section added
├── .claude-plugin/
│   ├── plugin.json                # description de-companioned; version 0.2.0
│   └── marketplace.json           # "Requires superpowers" removed
├── hooks/
│   ├── hooks.json                 # unchanged shape
│   ├── session-start.mjs          # takes over using-superpowers injection (§7)
│   └── rng-edit-reminder.mjs      # unchanged
├── skills/
│   ├── brainstorming/ … writing-skills/   # 14 vendored (flat, original names)
│   ├── using-wagerforge/          # router (updated refs)
│   └── build-* / comp-* / econ-* / fair-* / math-* / qa-*   # 52 domain skills
├── scripts/
│   ├── validate.mjs               # extended (§9)
│   └── revendor-superpowers.mjs   # NEW — pinned re-vendor tool (§10)
└── docs/
    ├── specs/2026-06-05-vendor-superpowers-design.md   # this doc
    └── vendor/superpowers-UPSTREAM.md                  # NEW — pin + provenance (§10)
```

## 5. Copyright & attribution (hard requirement)

MIT's only binding condition is preservation of the copyright notice + license text. Three layers, so it is both compliant and visible:

1. **`THIRD-PARTY-NOTICES.md`** (repo root): verbatim `Copyright (c) 2025 Jesse Vincent`, the full MIT text, upstream URL `https://github.com/obra/superpowers`, and the pinned version (5.1.0). Lists the 14 vendored skills.
2. **Per-skill provenance header** at the top of each vendored `SKILL.md`, immediately under the frontmatter, as an HTML comment so it never affects rendering or skill behavior:
   `<!-- Vendored from superpowers v5.1.0 — MIT, © 2025 Jesse Vincent. See /THIRD-PARTY-NOTICES.md -->`
3. **README "Credits / Third-party"** section crediting superpowers and pointing to the notices file.

## 6. Reference rewrites (mechanical only — no substance changed)

Global, scripted rewrite of `superpowers:<name>` → `wagerforge:<name>`, with a verification grep asserting **zero residual `superpowers:` references** afterward. Affected (from current grep):
- `README.md`, `CLAUDE.md`, `templates/SKILL.template.md`
- `agents/{settlement-engineer,economy-designer,fairness-auditor,slot-math-designer}.md`
- `skills/using-wagerforge/SKILL.md`, `skills/build-deploy-and-rtp-variant/SKILL.md`, `skills/qa-load-and-observability/SKILL.md`, `skills/econ-ab-testing/SKILL.md`
- `hooks/session-start.mjs`
- **Inside the vendored skills:** their own internal `superpowers:` cross-references (e.g. brainstorming → `writing-plans`, subagent-driven-development → siblings). Rewriting a namespace token is not rewriting process content.
- `commands/new-minigame.md`
- Docs under `docs/` (`research/*`, `plans/*`, `specs/2026-06-04-*`) are **historical records** — left as-is (they describe the prior companion design); optionally annotated, not rewritten.

Reference form chosen: fully-qualified **`wagerforge:<name>`** (not bare `<name>`) so resolution is unambiguous and always uses the owned/pinned copy even if a user still has external superpowers installed (serves goals 2 & 4).

## 7. Hook takeover (the critical step)

superpowers' discipline ("check for a skill before acting") is injected by its **SessionStart hook**, which reads `skills/using-superpowers/SKILL.md` and emits it wrapped in `<EXTREMELY_IMPORTANT>You have superpowers…</EXTREMELY_IMPORTANT>`. Copying skill files alone would **not** reproduce this — the hook is the trigger.

wagerforge's existing `hooks/session-start.mjs` (Node) is extended to:
1. Read the vendored `skills/using-superpowers/SKILL.md` and emit it in the same `<EXTREMELY_IMPORTANT>` envelope (text adjusted so it says the skills are wagerforge's, referenced via the `Skill` tool).
2. Continue nudging `using-wagerforge` as the iGaming router.
3. Drop the "if superpowers is missing, tell the user to install it" soft-check (no longer applicable).

Kept in Node (`.mjs`), so we discard the bash polyglot wrapper and all cross-platform branches the user asked to strip. `hooks.json` shape is unchanged. `rng-edit-reminder.mjs` (PostToolUse) is untouched.

Note: if a user *also* has external superpowers installed, both SessionStart hooks fire and the bootstrap is injected twice — harmless; README notes superpowers can be uninstalled.

## 8. Plugin Law #2 rewrite (`CLAUDE.md`)

**Before:**
> 2. **Delegate process to superpowers.** Never reimplement brainstorming/planning/TDD/debugging/review/skill-authoring. Reference `superpowers:*` by name; never `@`-force-load or Read its files.

**After (proposed):**
> 2. **Use the bundled process skills; don't reinvent them.** wagerforge ships the generic engineering-process skills (brainstorming/planning/TDD/debugging/review/skill-authoring) **vendored from superpowers (MIT, © 2025 Jesse Vincent — see `THIRD-PARTY-NOTICES.md`)**. Reference them as `wagerforge:*` by name; never reimplement them, and don't edit their process substance — only re-vendor from the pinned upstream (see `docs/vendor/superpowers-UPSTREAM.md`).

Intent preserved (don't reinvent process); the external-dependency assumption removed.

## 9. Manifest / README / marketplace

- `.claude-plugin/plugin.json`: description drops "Companion to the superpowers plugin"; **version `0.1.0` → `0.2.0`** (breaking packaging change).
- `.claude-plugin/marketplace.json`: plugin description drops "Requires the superpowers plugin >= 5.x …".
- `README.md`: remove the "Prerequisite: install superpowers first" install step and the requires-callout; add the Credits/Third-party section (§5).

## 10. Maintenance & re-vendor tooling

- `docs/vendor/superpowers-UPSTREAM.md`: records the pinned upstream (version 5.1.0, source path/commit), the strip-list (§3), the rewrite rule (§6), and the manual steps.
- `scripts/revendor-superpowers.mjs`: given a path/tag to an upstream superpowers checkout, copies the 14 skills + `references/`, applies the `superpowers:` → `wagerforge:` rewrite, re-adds the provenance headers, and refreshes `THIRD-PARTY-NOTICES.md`. Makes "catch up to a newer upstream" a one-command, reviewable diff (recovers Approach C's only real advantage).

## 11. Validation & quality gates (wagerforge law: validate before done)

Extend `scripts/validate.mjs` to also:
- Treat the 14 vendored skills as first-class: frontmatter has `name`+`description`, `name` == folder, no broken `[[links]]`.
- Assert **zero residual `superpowers:` tokens** anywhere except `docs/` historical records and `THIRD-PARTY-NOTICES.md`/`UPSTREAM.md`.
- Assert `THIRD-PARTY-NOTICES.md` exists and contains the MIT text + copyright line.
- Assert each vendored skill carries its provenance header.

**Done = `node scripts/validate.mjs` → 0 errors AND `node --test 'scripts/**/*.test.mjs'` passes.**

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Upstream drift (superpowers evolves fast) | `revendor-superpowers.mjs` + pinned UPSTREAM doc; periodic re-vendor PRs. |
| Double bootstrap injection if user keeps external superpowers | Harmless duplication; README notes superpowers may be uninstalled. |
| Breaking change for existing companion-style users | Version bump 0.2.0 + README migration note. |
| Vendored cross-refs missed → dead `superpowers:` links | Scripted rewrite + validate.mjs zero-residual gate. |
| Hook injection regression (discipline silently lost) | Manual session smoke-test: new session shows the `<EXTREMELY_IMPORTANT>` bootstrap from wagerforge. |

## 13. Non-goals / out of scope

- No rewriting of superpowers' process **content** (only namespace tokens + the trimmed non-Claude pointers in `using-superpowers`).
- No changes to the 52 iGaming domain skills' substance (only `superpowers:` → `wagerforge:` reference tokens where present).
- No cross-platform (Codex/Cursor/Gemini/Copilot) support — Claude Code only.
- Unrelated to the in-flight **calibration audit** (drift-auditing skills vs the real MetaWin repos) — that runs independently.

## 14. Success criteria

1. Installing **only** wagerforge yields working `wagerforge:brainstorming`, `wagerforge:writing-plans`, `wagerforge:test-driven-development`, etc.
2. A fresh session injects the using-superpowers bootstrap **from wagerforge's hook** (discipline intact) with no external plugin installed.
3. `THIRD-PARTY-NOTICES.md` preserves superpowers' MIT + copyright; provenance headers present on all 14 vendored skills.
4. `node scripts/validate.mjs` passes (0 errors), including the new zero-residual-`superpowers:` and attribution gates.
5. `docs/vendor/superpowers-UPSTREAM.md` + `revendor-superpowers.mjs` allow a reviewable re-vendor from a newer upstream.
6. Plugin Law #2 reads the new bundled-and-attributed statement; README/marketplace no longer require an external plugin.
