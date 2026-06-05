---
name: using-wagerforge
description: Use when starting any iGaming, slot, or crypto-minigame task (RTP/house-edge math, provable fairness/RNG, RGS or wallet settlement, game economy, math/RNG QA, or gambling compliance) — routes to the right wagerforge skill, including the bundled generic engineering-process skills.
---

# Using wagerforge

wagerforge is the domain layer for building real-money slot & crypto-minigame software. It **bundles** the generic engineering-process skills (vendored from superpowers, MIT — see `THIRD-PARTY-NOTICES.md`); wagerforge owns the iGaming WHAT.

## Routing

**Generic engineering process → the bundled `wagerforge:` process skills** (do NOT reimplement):
- ideation/design → `wagerforge:brainstorming`
- plan a spec → `wagerforge:writing-plans`
- execute → `wagerforge:subagent-driven-development` / `wagerforge:executing-plans`
- TDD → `wagerforge:test-driven-development`
- debugging → `wagerforge:systematic-debugging`
- review → `wagerforge:requesting-code-review` / `wagerforge:receiving-code-review`
- authoring a wagerforge skill → `wagerforge:writing-skills`

**Domain task → wagerforge skill by prefix:**
- probability/RTP/paytable → `math-*`
- provable fairness, RNG, seeds → `fair-*`
- engine, RGS, wallet, settlement, deploy → `build-*`
- bonus, jackpot, A/B, LTV, liveops → `econ-*`
- simulation/cert/regression/load testing → `qa-*`
- responsible gaming, certification, audit → `comp-*`

## Order
Process-before-implementation holds: brainstorm → plan → execute, with wagerforge domain skills invoked **inside** implementation. User instructions (CLAUDE.md) outrank skills.
