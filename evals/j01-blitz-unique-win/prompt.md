---
schema_version: "1.1"
name: j01-blitz-unique-win
description: Price a draw game where the player wins only if every drawn card is different
tags: [math, draw-games, audit-job1-f01]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are building a card game: the server draws N cards from a 52-card deck WITH replacement, and the player wins only if all N cards are different. Target RTP is 98%. Our draft prices the N=10 multiplier from the collision probability, 1 - prod((52-i)/52). Is that right? Give the win probability and the multiplier for N=10, and what to check after rounding the multiplier.
