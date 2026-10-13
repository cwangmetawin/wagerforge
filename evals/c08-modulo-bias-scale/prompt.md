---
schema_version: "1.1"
name: c08-modulo-bias-scale
description: Quantify modulo bias by the source-to-range ratio
tags: [fair, c8, mapping]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We reduce uniform unsigned 32-bit draws using x % 37 for roulette. Security calls this severe modulo bias. Another engineer says any modulo of a uint32 is negligible, even if we later map to three billion outcomes. Who is right? Quantify the small-range case and give an exact unbiased reducer for both ranges.
