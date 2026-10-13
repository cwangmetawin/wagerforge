---
schema_version: "1.1"
name: cascade-orb-final-sum
description: Surviving multiplier orbs price accumulated spin wins once at the terminal board
tags: [math, features, modifiers]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our free-spin tumble slot keeps multiplier orbs on the board while winning symbols are removed. A replay has unmultiplied wave awards of 2, 3 and 4 units: a 2x orb is present from the start, a 5x orb arrives in the last refill, and that board has no further win. For easier accounting, can I multiply each wave by its visible orb total and sum the payments? What should this spin pay, and which edge cases should the server tests cover?
