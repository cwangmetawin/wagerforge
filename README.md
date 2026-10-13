# wagerforge

iGaming domain skills for **Claude Code and Codex** — slot math, provable fairness, RGS & durable settlement, game economy, math/RNG QA and gambling compliance, calibrated against a production game server.

## What's inside

- **64 domain skills** in six pillars plus the `using-wagerforge` router. Every skill opens with a one-line *Core insight*, states the corrected rules it is bound to (C1–C14 in [the design spec](docs/specs/2026-06-04-wagerforge-design.md) §7), then process, pitfalls and verification.
- **Reference implementations** in `scripts/` — zero-dependency `.mjs`, tested: exact BigInt money, exactly-once settlement whose legs are idempotent through the bet's own state, HMAC-SHA256 provably-fair derivation, epoch verification from the player's own log (untrusted input must be plain data: no getter or Proxy in it ever runs), RTP / Monte-Carlo tooling with exact sample sizes and a rounding bound.
- **Claude Code extras:** 4 slash commands, 4 agents, 2 hooks (a one-line router nudge at session start; a domain reminder after edits to money, RNG or game-math code).
- **Calibrated, not invented.** Specimens cited as `MSS <path>` point at MetaWin's production game server (metawin-slot-server, main @ 356fa2a); every claim about real code was checked against it.
- **Domain-only.** No generic process skills are bundled: plan, test and review with the process your setup already has; wagerforge supplies the iGaming rules inside it.

## Install — Claude Code

Inside Claude Code (these are built-in commands, not shell commands):

```
/plugin marketplace add <path-to-wagerforge or owner/repo>
/plugin install wagerforge@wagerforge-dev
```

Restart Claude Code. Verify: `/plugin` lists **wagerforge** as enabled; the commands resolve: `/wagerforge:fairness-audit`, `/wagerforge:rtp-check`, `/wagerforge:settlement-check`, `/wagerforge:new-minigame`.

## Install — Codex CLI

Codex (0.159+) reads the same marketplace file, so one checkout serves both agents:

```
codex plugin marketplace add <path-to-wagerforge or owner/repo>
codex plugin add wagerforge --marketplace wagerforge-dev
```

Skills appear as `wagerforge:<skill>`; Codex picks them by description, or name one in your prompt (for example `$wagerforge:fair-verify`). Codex runs no plugin hooks, slash commands or agents — everything they do is reachable through the skills, starting at `wagerforge:using-wagerforge`.

Codex lists skills within a size budget. With hundreds of personal skills (for example in `~/.agents/skills`), plugin skills can be crowded out of the list; check with `codex debug prompt-input "hi"`.

## Pillars (skill prefixes)

| Prefix | Covers |
|---|---|
| `math-` | probability, RTP, paytables, lines/ways/cluster, cascade, hold-and-win, crash/limbo/dice, ladders, conditional-value games (Hi-Lo, offers, dig-or-bank), plinko/lottery, table-game edge, fixed-odds event markets, guaranteed payout floors, feature buy & jackpots |
| `fair-` | HMAC commit-reveal, hash chains, outcome mappers, card-shoe draw ledgers, independent verification and the player-facing verifier |
| `build-` | RGS contract, instant/crash state machines, durable settlement, signed realtime settlement, exact money, prediction markets, live tables, bankroll runs, skill wagers, client flow & presentation, deploy |
| `econ-` | bonus cost, RTP cost, jackpots, sink/faucet, A/B tests, LTV:CAC, tournaments |
| `qa-` | math validation, Monte-Carlo certification, golden regression, game fingerprints, rules contracts, fairness tests, RNG statistics, settlement integrity, load |
| `comp-` | responsible gaming, self-exclusion, affordability, RNG/RTP certification, cert reports, audit & privacy, geo/edge |

## Develop

- `node scripts/validate.mjs` — skill gate; must report **0 errors and 0 warnings** (frontmatter portability, Core insight, constraints, dangling references, router reachability, excluded credentials).
- `node --test '{scripts,hooks,evals}/**/*.test.mjs'` — tooling, reference-implementation, hook and eval-runner tests. The Codex load test runs when the `codex` CLI is installed.
- `node scripts/check-codex-load.mjs` — proves Codex loads every skill from this checkout (throwaway `HOME`/`CODEX_HOME`; your real `~/.codex` is never touched).
- `node scripts/check-claude-load.mjs` — proves Claude Code loads every skill and agent from this checkout (`--plugin-dir`, read from the session's init message; one small haiku call).
- Behaviour evals (with and without the skills) for both agents: see [evals/README.md](evals/README.md) (`claude plugin eval .` and `node evals/run-codex.mjs`).
- `node scripts/build-dashboard.mjs` — regenerates the read-only dashboard `docs/dashboard/index.html` from the skills, the spec's C1–C14 table, the MSS coverage matrix (`docs/coverage/mss-games.json`) and `evals/summary.json`; `--check` fails when it is stale, `--fragment <file>` writes the same page without the document wrapper for hosts that add their own.

Design: `docs/specs/`. Research and calibration evidence: `docs/research/`. Plugin laws: [CLAUDE.md](CLAUDE.md) (Codex reads [AGENTS.md](AGENTS.md)).
