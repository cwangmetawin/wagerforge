# Vendored upstream: superpowers

- **Source:** https://github.com/obra/superpowers
- **Pinned version:** 5.1.0
- **License:** MIT (© 2025 Jesse Vincent) — preserved in [`/THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md)
- **Vendored:** 2026-06-05

## What is vendored
The 14 process skills (see `scripts/revendor-superpowers.mjs` → `VENDORED_SKILLS`), copied flat into `skills/`:
`brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills`.

## What is stripped (non-Claude)
`.codex-plugin/`, `.cursor-plugin/`, `.opencode/`, `gemini-extension.json`, `GEMINI.md`,
`hooks/{hooks-cursor.json,run-hook.cmd,session-start}`, `scripts/sync-to-codex-plugin.sh`,
and each skill's `references/` (copilot/codex/gemini tool docs). wagerforge targets Claude Code only.

## Local adaptations (mechanical only — process substance untouched)
- `superpowers:<name>` → `wagerforge:<name>` (the 14 vendored names)
- `superpowers:webapp-testing` → `webapp-testing` (a separate global skill, NOT vendored)
- `superpowers:*` → `wagerforge:*`
- A provenance header (`<!-- Vendored from superpowers v5.1.0 … -->`) is stamped after the
  frontmatter of each `SKILL.md`.

Because the substance is never edited, re-vendoring a newer upstream is a clean re-run.

## The bootstrap
`hooks/session-start.mjs` reads `skills/using-superpowers/SKILL.md` and injects it wrapped in
`<EXTREMELY_IMPORTANT>` at session start — this is what makes the "always check for a skill"
discipline fire. (Upstream did this from its own SessionStart hook; wagerforge took it over.)

## How to re-vendor a newer upstream
1. Install/checkout the new superpowers version.
2. `node scripts/revendor-superpowers.mjs /path/to/superpowers/<version>`
3. Bump `UPSTREAM_VERSION` in `scripts/revendor-superpowers.mjs` + this doc.
4. `node scripts/validate.mjs && node --test 'scripts/**/*.test.mjs'`
5. Review the diff, then commit.
