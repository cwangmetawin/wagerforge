---
schema_version: "1.1"
name: blackjack-insurance-double-funding
description: Insurance precedes the Double funding test, an unfunded Double follows its fallback, three-card 21 is ordinary, and incomplete custom charts are rejected
tags: [math, table-games, blackjack]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our autoplay blackjack engine plays hands from a 45-unit buy-in with a stake of 20 units per hand. The declared rules are exactly-half-opening-stake insurance at 2:1 profit, full-stake Double only (no double-for-less), 3:2 naturals, S17, and an Ace/ten-upcard hole-card peek. For hand 1 the opening stake is debited, which leaves 25 units. The dealer shows an Ace and the player holds 5 and 6. The strategy chart has insurance = TAKE and hard-11/A = D/H. The next card in the shoe is a 10, and the dealer's hole card is a 7. What should the engine do at each step, and what are the total wagered, the total returned and the bankroll after the hand? Then redo it with a King as the hole card instead of the 7. Also compare the King outcome if only peek is disabled. Which edge cases should the tests cover?

Separately, before another run opens, a player uploads a custom chart that lacks the soft 13 row. Should the server fill it from basic strategy? What if every row exists but the insurance choice is absent? How many hands, cards and accepted wagers may each opening request produce?
