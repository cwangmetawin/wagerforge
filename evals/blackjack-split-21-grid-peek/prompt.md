---
schema_version: "1.1"
name: blackjack-split-21-grid-peek
description: Split 21, per-hand wallet flooring, and explicitly declared all-bets liability with insurance preceding peek
tags: [math, table-games, blackjack]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are settling one round at a 3-seat blackjack table: 8 decks, a natural pays 3:2, and the wallet's smallest unit is 0.01. Seat 1 bets 0.01 and is dealt Ace-King. Seat 2 bets 0.01 and is dealt Queen-Ace. Seat 3 bets 0.03 and is dealt Ace-Ace, splits with a matching 0.03 stake, and each ace then receives a King. This table uses all-bets liability: a later dealer natural takes every added Double and Split stake. Assume no insurance is purchased, including in the peek comparison. For easier accounting our code pays every two-card 21 as a natural and floors the natural returns once over the table: floor(sum of natural stakes x 2.5 / 0.01) x 0.01.

Case A: the dealer shows a 10 and holds a 10. Case B: the dealer shows an Ace and holds a King; our table never peeks, so seat 3 still splits before the dealer reveals. For each case, what should the server credit, and what has each seat wagered? When can the server safely credit the two player naturals? What would a hole-card peek change in Case B? Which tests should we add?
