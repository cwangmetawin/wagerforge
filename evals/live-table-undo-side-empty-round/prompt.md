---
schema_version: "1.1"
name: live-table-undo-side-empty-round
description: Undo refunds whole chips once, drops a dependent side bet with its last main chip, and an empty round still draws
tags: [build, live-tables, money]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our house-banked live table lets players stack chips on one main bet and add a side bet that only makes sense next to a main bet. Player A is the only player seated. A's accepted chips this round, oldest first, are: main 1, main 5, main 2, main 2, then side 1 (each chip is its own wallet debit). Betting closes at tick time 30,000 ms. At tick 29,000 the queue holds A's command "undo main 6". At tick 29,500 the platform re-delivers the original chip command for the newest "main 2" (same command id), and A also sends "undo main 5". Nobody else bets this round. For each tick, what should the server refund and what should stay in settlement, and what should it do when betting closes at 30,000? Which server tests should we add?
