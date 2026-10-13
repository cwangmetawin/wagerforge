---
schema_version: "1.1"
name: moving-wild-collector-order
description: Moving wild collection requires retained state, covered-coin exclusion and per-wild pricing
tags: [math, c6, features]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We're adding a five-reel respin feature with gold wilds that move right and collect coins. The simulator reuses the ordinary-wild evaluator and sweeps coin values from the refill. At a unit stake, a retained 3x wild enters reel 3's middle row over a 7-unit coin; two other coins on that reel are worth 2 and 4. A fresh 5x wild lands on reel 1. Is this enough to settle the respin and model feature RTP, including the remaining respins?
