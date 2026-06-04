---
name: using-wagerforge
description: Use when starting any iGaming, slot, or crypto-minigame task (RTP/house-edge math, provable fairness/RNG, RGS or wallet settlement, game economy, math/RNG QA, or gambling compliance) — routes to the right wagerforge skill and defers generic engineering process to superpowers.
---

# Using wagerforge

wagerforge is the domain layer for building real-money slot & crypto-minigame software. It is a **companion to superpowers**: superpowers owns generic process; wagerforge owns iGaming WHAT.

## Routing

**Generic engineering process → delegate to superpowers** (do NOT reimplement):
- ideation/design → `superpowers:brainstorming`
- plan a spec → `superpowers:writing-plans`
- execute → `superpowers:subagent-driven-development` / `superpowers:executing-plans`
- TDD → `superpowers:test-driven-development`
- debugging → `superpowers:systematic-debugging`
- review → `superpowers:requesting-code-review` / `superpowers:receiving-code-review`
- authoring a wagerforge skill → `superpowers:writing-skills`

**Domain task → wagerforge skill by prefix:**
- probability/RTP/paytable → `math-*`
- provable fairness, RNG, seeds → `fair-*`
- engine, RGS, wallet, settlement, deploy → `build-*`
- bonus, jackpot, A/B, LTV, liveops → `econ-*`
- simulation/cert/regression/load testing → `qa-*`
- responsible gaming, certification, audit → `comp-*`

## Order
Process-before-implementation holds: brainstorm → plan → execute, with wagerforge domain skills invoked **inside** implementation. User instructions (CLAUDE.md) outrank skills.

## If superpowers is missing
Tell the user to install the superpowers companion plugin; do not silently reimplement its process skills.
