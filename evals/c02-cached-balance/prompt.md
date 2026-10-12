---
schema_version: "1.1"
name: c02-cached-balance
description: Reject cache or replica authorization of real-money spend
tags: [build, money, c2]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our betting API reads a cached balance from a replica, accepts the bet if it looks affordable, and queues ledger writes. A nightly reconciliation fixes any drift. This keeps latency low, and Redis updates are fast. Is this enough for real-money stakes? Describe the smallest safe debit transaction and how two simultaneous bets and retries should behave.
