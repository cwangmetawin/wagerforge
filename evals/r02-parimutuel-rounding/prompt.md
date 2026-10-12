---
schema_version: "1.1"
name: r02-parimutuel-rounding
description: Round each proportional payout instead of flooring the shared price
tags: [build, money, audit-r02]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We settle a pooled prediction market using integer currency atoms. The payable pot is 10 atoms and the two winners hold 60 and 40 shares, for 100 total. The draft computes floor(pot / totalWinningShares), multiplies that integer value by each holding, and gives leftover dust to the last winner. That conserves the pot. Is it fair enough? Specify a safe exact allocation and deterministic rounding policy.
