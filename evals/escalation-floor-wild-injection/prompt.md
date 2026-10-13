---
schema_version: "1.1"
name: escalation-floor-wild-injection
description: Audit escalation save/restore with declared mode caps and independent injection into eligible vacancies
tags: [math, slots, board-state]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are auditing save/restore code for a tumble slot's free-spin feature. Product design selects the winning-wave climb mode with terminal-scatter floor leveling; the engine also supports a separate qualifying-wild progression mode that follows the MSS `games/tartarus/gameLogic.ts` `loadUpgradingFreeGames` contract. This case's configuration is:

- Multiplier encoding: ABSOLUTE. Ladder (zero-based indices): [1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 100, 150, 200, 300, 500, 1000].
- Start-index cap: 15; persistent-floor cap: 15; wave-index cap: 15. These are our configured caps, not an imported production game's defaults.
- Head-start draw: 1 to 5 index steps. Terminal-scatter level threshold: 2; level step: 1.

Replay data: spin 5 enters with stored floor index 9 and sampled head start 4; its three winning waves have base wins [1, 1, 1] coins; its final board has 3 scatters. Spin 6 samples head start 1 and ends with 0 scatters; spin 7 samples head start 1 and has one winning wave with base win 1 coin. An engineer proposes using one mutable index for the head start, wave progression, terminal-scatter leveling and saved floor.

Separately, after wave 1 of spin 5 the board is refilled. Reel 1 has new vacancies but still holds a surviving wild; reel 2 lost no symbols; reels 3, 4 and 5 have new vacancies and no retained wild or scatter. Our rule book limits each reel to one wild or scatter. This model injects wilds, never scatters, and follows the MSS `games/tartarus/gameLogic.ts` `getNextWave` refill-injection contract. Each eligible reel makes an independent 20% wild-injection roll. This wave is within the configured injection cutoff. Which reels and cells may be injected, and what placement law should we implement?

Audit the proposed state design: what does spin 5 pay, which updates belong in the saved floor, and which rung does spin 6 start on? State spin 7's restored floor, starting rung and payout. What is the chance this refill adds at least one new wild? Give fixtures for save/restore, caps, injection and separation from the qualifying-wild mode.
