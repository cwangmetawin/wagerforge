---
schema_version: "1.1"
name: baccarat-chip-floor-pair-rank
description: Per-chip floor settlement, original-rank pairs and the Banker tableau, plus half-up per-chip admission and stake-dependent RTP certification
tags: [math, table-games, baccarat]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our live baccarat table uses the standard third-card rules, pays Banker 0.95:1 with winnings floored to the cent, and pays Player pair and Banker pair at 11:1; wallets have two decimals. In one round a player holds three separate 0.07 Banker chips, a 1.00 Player-pair chip and a 1.00 Banker-pair chip, each accepted as its own bet. The deal order was Player king of spades, Banker two of diamonds, Player ten of hearts, Banker two of clubs, and the shoe then holds king of diamonds, six of spades, nine of hearts. For easier accounting our settlement merges the three Banker chips into one 0.21 bet before applying the commission, and it scores each pair bet on that side's final cards (any two equal ranks). What should this round pay in total, and which edge cases should the server tests cover?

Separately, product proposes a variant that settles each winning Banker chip with half-up rounding to the cent. Its 0.11 table minimum would apply only to the first chip on a spot; later chips could be as small as 0.01. Any cent-sized chip up to 100.00 is available. For the eight-deck certification model, use P(Banker win) = 0.458597422632763 and P(Tie) = 0.0951559680236402. Is this admission rule safe? Compute RTP for 0.01, 0.11, 0.20 and 0.30 chips. Recommend the smallest safe minimum and where to enforce it. Under that admission policy, which legal size has the highest RTP, and can certification use 98.9421% for all sizes?
