# wagerforge — Plugin Laws

These bind every wagerforge skill, command, agent, and hook.

1. **Skill is the single source of truth.** Knowledge is written once in a skill. Commands/agents/hooks stay thin and reference skills by name; they never restate domain knowledge.
2. **Use the bundled process skills; don't reinvent them.** wagerforge ships the generic engineering-process skills (brainstorming/planning/TDD/debugging/review/skill-authoring) **vendored from superpowers (MIT, © 2025 Jesse Vincent — see `THIRD-PARTY-NOTICES.md`)**. Reference them as `wagerforge:*` by name; never reimplement them, and don't edit their process substance — only re-vendor from the pinned upstream (see `docs/vendor/superpowers-UPSTREAM.md`).
3. **Opinionated default stack + escape hatch.** Every `build-*` skill states the default (TS + PixiJS/Phaser + Node + decimal.js) and a concept-mapping for other stacks.
4. **Server-authoritative always.** Client renders server-resolved results; it never computes payouts, RTP, or outcomes.
5. **Correctness constraints C1–C14 are law.** Any skill touching those areas encodes the corrected statement from the spec (`docs/specs/2026-06-04-wagerforge-design.md` §7), never the refuted folk version.
6. **Credential exclusion.** Never reference the keys listed in `docs/SECURITY-NOTE.md`. Credential handling uses secret managers / WIF, never on-disk keys.
7. **Validate before done.** `node scripts/validate.mjs` must pass (0 errors) before any skill is considered complete.
