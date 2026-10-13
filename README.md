# wagerforge

iGaming domain skills for **Claude Code and Codex** — slot math, provable fairness, RGS & durable settlement, game economy, math/RNG QA and gambling compliance, calibrated against a production game server.

## What's inside

- **78 domain skills** in six pillars plus the `using-wagerforge` router. Every skill opens with a one-line *Core insight*, states the corrected rules it is bound to (C1–C14 in [the design spec](docs/specs/2026-06-04-wagerforge-design.md) §7), then process, pitfalls and verification.
- **Reference implementations** in `scripts/` — zero-dependency `.mjs`, tested: exact BigInt money, exactly-once settlement whose legs are idempotent through the bet's own state, HMAC-SHA256 provably-fair derivation, epoch verification from the player's own log (untrusted input must be plain data: no getter or Proxy in it ever runs), RTP / Monte-Carlo tooling with exact sample sizes and a rounding bound.
- **Claude Code extras:** 4 slash commands, 4 agents, 2 hooks (a one-line router nudge at session start; a domain reminder after edits to money, RNG or game-math code).
- **Calibrated, not invented.** Specimens cited as `MSS <path>` point at MetaWin's production game server (metawin-slot-server, main @ 356fa2a); every claim about real code was checked against it.
- **Domain-only.** No generic process skills are bundled: plan, test and review with the process your setup already has; wagerforge supplies the iGaming rules inside it.

## Give an agent these skills

The dashboard at <https://wagerforge.gladiatorstudios.co.uk> (English: <https://wagerforge.gladiatorstudios.co.uk/en/>) shows the latest signed-off release: every skill, the C1–C14 constraints, MSS coverage and the behaviour evals. Give that URL to a coding agent and it can install the skills itself: the page and <https://wagerforge.gladiatorstudios.co.uk/llms.txt> carry the install commands pinned to the release tag, the plugin ZIP and a link to every `SKILL.md`.

Releases are git tags (`v0.3.0`, `v0.3.1`, `v0.3.2`), each a version the owner signed off; `main` may carry unreleased work. The commands below install `v0.3.2`; use the newest tag.

## Install — Claude Code

```
claude plugin marketplace add cwangmetawin/wagerforge#v0.3.2
claude plugin install wagerforge@wagerforge-dev
```

Inside a Claude Code session the same steps are `/plugin marketplace add cwangmetawin/wagerforge#v0.3.2` and `/plugin install wagerforge@wagerforge-dev`. After `#` give a branch or tag name, not a commit SHA. A local checkout works too: `/plugin marketplace add <path-to-wagerforge>`.

Restart Claude Code. Verify: `/plugin` lists **wagerforge** as enabled; the commands resolve: `/wagerforge:fairness-audit`, `/wagerforge:rtp-check`, `/wagerforge:settlement-check`, `/wagerforge:new-minigame`.

## Install — Codex CLI

Codex (0.159+) reads the same marketplace file, so one release serves both agents:

```
codex plugin marketplace add cwangmetawin/wagerforge --ref v0.3.2
codex plugin add wagerforge --marketplace wagerforge-dev
```

A local checkout works too: `codex plugin marketplace add <path-to-wagerforge>`.

Skills appear as `wagerforge:<skill>`; Codex picks them by description, or name one in your prompt (for example `$wagerforge:fair-verify`). Codex runs no plugin hooks, slash commands or agents — everything they do is reachable through the skills, starting at `wagerforge:using-wagerforge`.

Codex lists skills within a size budget (about 22 KB of names and descriptions). With hundreds of personal skills (for example in `~/.agents/skills`), plugin skills can be crowded out entirely: in a test with about 350 personal skills, Codex listed none of wagerforge's. Check with `codex debug prompt-input "hi"`. A separate `CODEX_HOME` alone does not help, because personal skills under `HOME` are still read; raise its skill budget as well. Tested with 357 personal skills, all 79 wagerforge skills are then listed:

```
export CODEX_HOME=~/.codex-wagerforge
codex login
codex plugin marketplace add cwangmetawin/wagerforge --ref v0.3.2
codex plugin add wagerforge --marketplace wagerforge-dev
printf '\n[skills]\nmax_context_tokens = 60000\n' >> "$CODEX_HOME/config.toml"
codex debug prompt-input hi | grep -o 'wagerforge:[a-z0-9-]*' | sort -u | wc -l
```

Start Codex with that `CODEX_HOME` for iGaming work; your everyday `~/.codex` stays as it is. Claude Code registered every wagerforge skill in the same test.

## Pillars (skill prefixes)

| Prefix | Covers |
|---|---|
| `math-` | probability, RTP, paytables, lines/ways/cluster, slot evaluation and board-state rules, cascade, hold-and-win, crash/limbo/dice, ladders, conditional-value games (Hi-Lo, offers, dig-or-bank), plinko/lottery, table-game edge, blackjack rules and actions, table bets (baccarat, roulette, Sic Bo), betting progressions, payout and quote precision, forced-outcome shaping, fixed-odds event markets, guaranteed payout floors, feature buy & jackpots |
| `fair-` | HMAC commit-reveal, hash chains, outcome mappers, card-shoe draw ledgers, independent verification and the player-facing verifier |
| `build-` | RGS contract, instant/crash state machines, durable settlement, signed realtime settlement, exact money, prediction markets, pooled-market operations, live tables and their operations, wager-limit admission, round-recovery contracts, bankroll runs, skill wagers, client flow & presentation, deploy |
| `econ-` | bonus cost, RTP cost, jackpots, sink/faucet, A/B tests, LTV:CAC, tournaments |
| `qa-` | math validation, Monte-Carlo certification, golden regression, game fingerprints, rules contracts, fairness tests, RNG statistics, settlement integrity, load |
| `comp-` | responsible gaming, self-exclusion, affordability, RNG/RTP certification, cert reports, audit & privacy, geo/edge |

## Develop

- `node scripts/validate.mjs` — skill gate; must report **0 errors and 0 warnings** (frontmatter portability, Core insight, constraints, dangling references, router reachability, excluded credentials).
- `node --test '{scripts,hooks,evals}/**/*.test.mjs'` — tooling, reference-implementation, hook and eval-runner tests. The Codex load test runs when the `codex` CLI is installed.
- `node scripts/check-codex-load.mjs` — proves Codex loads every skill from this checkout (throwaway `HOME`/`CODEX_HOME`; your real `~/.codex` is never touched).
- `node scripts/check-claude-load.mjs` — proves Claude Code loads every skill and agent from this checkout (`--plugin-dir`, read from the session's init message; one small haiku call).
- Behaviour evals (with and without the skills) for both agents: see [evals/README.md](evals/README.md) (`claude plugin eval .` and `node evals/run-codex.mjs`).
- `node scripts/build-dashboard.mjs` — regenerates the read-only dashboard from the skills, the spec's C1–C14 table, the MSS coverage matrix (`docs/coverage/mss-games.json`, English notes in `docs/coverage/mss-games.en.json`) and `evals/summary.json`: the Chinese page `docs/dashboard/index.html`, the English page `docs/dashboard/en/index.html` and `docs/dashboard/llms.txt` for agents. `--ref <tag>` pins every install command, download and source link (default `main`; a deploy passes the release tag); `--check` fails when any of the three files is stale; `--fragment <file> [--lang en]` writes one page without the document wrapper for hosts that add their own.

Design: `docs/specs/`. Research and calibration evidence: `docs/research/`. Plugin laws: [CLAUDE.md](CLAUDE.md) (Codex reads [AGENTS.md](AGENTS.md)).
