---
schema_version: "1.1"
name: c10-draw-call-budget
description: Use measured device-tier frame budgets rather than universal thresholds
tags: [build, c10, performance]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

A mobile slot scene reports 520 draw calls and roughly 270 MB of texture allocations. A reviewer says anything above 500 calls or 256 MB VRAM always stutters on Android, so we should block release based only on those counters. We have not profiled the target devices yet. What release evidence and optimization plan should we require?
