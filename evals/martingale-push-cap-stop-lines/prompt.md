---
schema_version: "1.1"
name: martingale-push-cap-stop-lines
description: A tie freezes a capped Martingale, a loss at the cap restarts it, and take-profit or stop-loss lines depend on a declared denominator
tags: [math, progressions, bankroll-runs]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are building an automated baccarat run: a 1,000.00 buy-in, Banker on every hand (0.95:1, whole cents), base stake 20.00, a Martingale limited to 3 steps (20, 40, 80), table limit 100.00, take-profit 200.00 and stop-loss 150.00 entered as run profit and loss amounts, 7 hands. The hands come out: Banker loses, loses, ties, loses, loses, wins, wins. QA also reports that a take-profit of 1,000.00 on a 1,000.00 buy-in ends our blackjack run at once with zero hands, while the same entry in the baccarat run just plays on. List the stake and bankroll for each hand, say how and when the run ends and what is returned, and tell me whether either QA observation is a bug.
