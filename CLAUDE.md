# wagerforge — Plugin Laws

These bind every wagerforge skill, command, agent, and hook.

1. **Skill is the single source of truth.** Knowledge is written once in a skill. Commands/agents/hooks stay thin and reference skills by name; they never restate domain knowledge.
2. **Domain-only; no bundled process skills.** wagerforge ships iGaming domain skills only. Generic engineering process (brainstorming, planning, TDD, debugging, review, skill authoring) comes from the user's own process skills; never vendor or reimplement them here (superpowers was removed in 0.3.0).
3. **Opinionated default stack + escape hatch.** Every `build-*` skill states the default (TS + PixiJS/Phaser + Node + exact integer/decimal money) and a concept-mapping for other stacks.
4. **Server-authoritative always.** Client renders server-resolved results; it never computes payouts, RTP, or outcomes.
5. **Correctness constraints C1–C14 are law.** Any skill touching those areas encodes the corrected statement from the spec (`docs/specs/2026-06-04-wagerforge-design.md` §7), never the refuted folk version.
6. **Credential exclusion.** Never reference the keys listed in `docs/SECURITY-NOTE.md`. Credential handling uses secret managers / WIF, never on-disk keys.
7. **Validate before done.** `node scripts/validate.mjs` must report 0 errors and 0 warnings, and `node --test '{scripts,hooks,evals}/**/*.test.mjs'` must pass, before any change is considered complete.
8. **Two agents, one source.** Every skill must load in both Claude Code and Codex: portable frontmatter only (`name`, `description`, `metadata`), no agent-specific tool names in domain skills, and nothing a Codex user needs may live only in a hook, command or agent (Codex runs none of them). `node scripts/check-codex-load.mjs` and `node scripts/check-claude-load.mjs` prove it.
9. **Ground truth is the production server.** Claims about real game code are calibrated against the read-only metawin-slot-server `main` (the push remote's tip, never the lagging fetch mirror); cite file paths, never copy proprietary code or keys.

**End node (v0.3.1, branch `feat/v0.3.1-backlog`; v0.3.0 awaits the owner's sign-off):** done when `rtpFromOutcomes` is correctly rounded (oracle over ≥10,000 tables) and cascades have an exact-atom form, both reviewed by Codex ultra and opus-max with no open HIGH; Codex opens a skill in ≥90% of with-skill eval runs over 3 runs; both eval suites run 3 times with the skills ahead in every run; ≥20 of the 27 partial MSS families are full and the rest are justified; validate 0/0, all tests and both load checks pass, the rest of the backlog is done or deferred, and Boss or the owner signs off (`docs/plans/2026-10-12-v0.3.1-backlog.md`).
