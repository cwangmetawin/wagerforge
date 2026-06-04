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
- `node --test 'scripts/**/*.test.mjs'` — run tooling tests (glob form; newer Node treats a bare `scripts/` arg as a module, not a dir)

See `docs/specs/` for the design and `docs/research/` for the grounding dossier.
