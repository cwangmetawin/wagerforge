---
schema_version: "1.1"
name: c03-no-deposit-bonus
description: Distinguish guaranteed turnover algebra from stopped no-deposit bonus cashflows
tags: [econ, c3, optional-stopping]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We want a $100 no-deposit bonus, cashable after 30x wagering, on a 96% RTP game. Marketing says the cost is $100 + 4% × $3,000 = $220. Finance instead says it makes us $20 because 30 is above the break-even WR of 25. Players can bust or abandon before completing. Which argument can we use to approve the campaign? Explain what we actually need to model.
