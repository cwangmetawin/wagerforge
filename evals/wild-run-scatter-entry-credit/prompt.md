---
schema_version: "1.1"
name: wild-run-scatter-entry-credit
description: A wild prefix and scatter-ended runs pay once and a cumulative continuation is credited once
tags: [math, slots, evaluation]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our 5-reel, 3-row slot pays 3 straight lines (top, middle and bottom row, left to right) at 1 coin per line, so the total bet is 3 coins. W is a wild that substitutes for A and B; for wild-prefix handling, use the MSS `games/bookOfDead/gameLogic.ts` `detectPaylineWins` policy. S is a scatter that pays anywhere. Line pays in multiples of the line bet for 3, 4 and 5 of a kind are A 10/40/200, B 5/15/50 and W 25/100/500. Scatters pay 2/10/50 times the total bet for 3, 4 and 5, and 3 or more start free spins. A spin lands as follows (reels 1 to 5):

top: W W W B S
middle: A W S A A
bottom: B B W S A

The opening response reports this spin's win and a free-game state. The free games then total 80 coins and the continuation response reports win = 106. Our wallet adapter credits the win field of every response it receives. What does the opening spin pay, does it start free spins, how many coins should the wallet be credited for the whole round, and which server tests should we add?
