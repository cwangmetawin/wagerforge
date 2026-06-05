# wagerforge

iGaming superpowers for Claude Code — skills for slot math, provable fairness, RGS & durable settlement, game economy, math/RNG QA, and gambling compliance.

> **Self-contained.** wagerforge bundles the generic engineering-process skills (brainstorm, plan, TDD, debug, review — vendored from [superpowers](https://github.com/obra/superpowers), MIT, © 2025 Jesse Vincent; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)) alongside its iGaming domain layer. No separate plugin required.

## Install

wagerforge is a single self-contained plugin — no companion install needed.

The `/plugin` commands below are run **inside Claude Code** (they are built-in commands, not shell commands).

1. **Add this folder as a marketplace.** Point at the directory that contains `.claude-plugin/marketplace.json`:
   ```
   /plugin marketplace add <path-to-wagerforge>
   ```
   For a local checkout that is the repo directory, e.g. `/plugin marketplace add ~/Documents/Developments/wagerforge`. Once it is on GitHub you can instead use `/plugin marketplace add <owner>/<repo>`.
2. **Install the plugin** from that marketplace (`wagerforge` is the plugin, `wagerforge-dev` the marketplace):
   ```
   /plugin install wagerforge@wagerforge-dev
   ```
3. **Restart Claude Code** so the `SessionStart` hook loads the `using-wagerforge` router.

Prefer a menu? Run `/plugin`, choose **Add marketplace** (enter the path), then **Install** wagerforge.

### Verify the install
- `/plugin` lists **wagerforge** as enabled.
- A new session nudges you to invoke `using-wagerforge` for any iGaming task.
- The commands resolve: `/wagerforge:fairness-audit`, `/wagerforge:rtp-check`, `/wagerforge:settlement-check`, `/wagerforge:new-minigame`.
- Try: ask Claude to "design the math for a new plinko game" — it should route through `wagerforge:brainstorming` → `math-*`.

## Pillars (skill prefixes)
- `math-` — probability, RTP, paytables, crash/ladder/cluster/lottery math
- `fair-` — provable fairness (HMAC commit-reveal), RNG integrity, independent verification
- `build-` — engine/rendering, RGS, wallet, **durable settlement**, deploy
- `econ-` — bonus/jackpot design, A/B, LTV, liveops
- `qa-` — Monte-Carlo certification, golden regression, RNG statistics, load
- `comp-` — responsible gaming, RNG/RTP certification, audit & privacy

Start any iGaming task by invoking the `using-wagerforge` skill.

## Credits
wagerforge bundles the generic engineering-process skills from [superpowers](https://github.com/obra/superpowers) by Jesse Vincent (MIT). Full license + attribution: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). To refresh from a newer upstream, see [docs/vendor/superpowers-UPSTREAM.md](docs/vendor/superpowers-UPSTREAM.md).

## Develop
- `node scripts/validate.mjs` — validate all skills
- `node --test 'scripts/**/*.test.mjs'` — run tooling tests (glob form; newer Node treats a bare `scripts/` arg as a module, not a dir)

See `docs/specs/` for the design and `docs/research/` for the grounding dossier.
