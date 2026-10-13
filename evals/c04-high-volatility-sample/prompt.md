---
schema_version: "1.1"
name: c04-high-volatility-sample
description: Require confidence precision rather than a fixed spin count
tags: [math, c4, simulation]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Can we sign off a very volatile slot after one million simulated complete rounds? We need RTP within ±0.1 percentage point at 95% confidence. A validated preliminary model estimates the standard deviation of return per unit stake at about 20 and includes very rare jackpots. The team says one million spins is the industry rule. Please size the run and explain the acceptance evidence.
