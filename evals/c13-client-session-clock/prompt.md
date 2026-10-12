---
schema_version: "1.1"
name: c13-client-session-clock
description: Enforce session duration against authoritative server time
tags: [comp, c13, responsible-gaming]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We need a one-hour real-money session limit. The browser sends sessionStartedAt on each bet; the server subtracts it from Date.now() and blocks when the hour expires. A reconnect sends a fresh start time to handle stale tabs. Since the server performs the comparison, is this authoritative enough? Describe enforcement across retries and reconnects.
