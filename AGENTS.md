# AGENTS.md

Codex and other agents working on this repository: the plugin laws are in [CLAUDE.md](CLAUDE.md) and bind you exactly as they bind Claude. Read it before changing anything.

Checks that must pass before any change is complete:

- `node scripts/validate.mjs` — 0 errors, 0 warnings
- `node --test '{scripts,hooks,evals}/**/*.test.mjs'`
- `node scripts/check-codex-load.mjs` — every skill loads in Codex
- `node scripts/check-claude-load.mjs` — every skill and agent loads in Claude Code
- `node scripts/build-dashboard.mjs --check` — the dashboard matches the repository

Using wagerforge from Codex (rather than developing it) needs no file here: install it as a plugin (see README) and start from the `wagerforge:using-wagerforge` skill.
