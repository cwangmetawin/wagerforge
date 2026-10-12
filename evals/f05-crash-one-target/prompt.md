---
schema_version: "1.1"
name: f05-crash-one-target
description: Reject the 1.00 equality-paying crash target or explicitly model instabust
tags: [math, crash, audit-f05]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our crash point is C = max(1, (1-h)/(1-u)) with h = 0.02, and a bet wins when C >= its target. Product wants to allow a 1.00x auto-cashout, promising it still wins only 98% of the time. We also floor the displayed crash point to two decimals. Can we ship that target? Explain the boundary rule and what transforms can invalidate the headline RTP identity.
