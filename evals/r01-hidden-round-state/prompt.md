---
schema_version: "1.1"
name: r01-hidden-round-state
description: Preserve internal underscore fields and sanitize only the client projection
tags: [build, state, audit-r01]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our multi-step mines game returns play() state containing _grid and _seed. To prevent leaks, I added a loop deleting every underscore-prefixed field from that state before the platform persists the play() result. After reconnect, the next reveal sometimes cannot resume. Should I strip those fields earlier? Explain exactly which object should be saved and which should reach the browser.
