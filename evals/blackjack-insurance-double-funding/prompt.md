---
schema_version: "1.1"
name: blackjack-insurance-double-funding
description: Insurance is debited before the Double funding test, an unfunded Double follows the chart fallback, and a three-card 21 is not a natural
tags: [math, table-games, blackjack]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our autoplay blackjack engine plays hands from a 45-unit buy-in with a stake of 20 units per hand. For hand 1 the opening stake is debited, which leaves 25 units. The dealer shows an Ace and the player holds 5 and 6. The strategy chart says: take insurance whenever it is offered, and for hard 11 against an Ace play "double, otherwise hit". The next card in the shoe is a 10, and the dealer's hole card is a 7. What should the engine do at each step, and what are the total wagered, the total returned and the bankroll after the hand? Then redo it with a King as the hole card instead of the 7. Which edge cases should the tests cover?
