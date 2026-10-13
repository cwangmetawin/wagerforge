---
schema_version: "1.1"
name: c14-production-rtp-change
description: Allow approved certified variants but reject ad hoc production math changes
tags: [comp, c14, variants]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our slot was certified at 96% RTP. Operations wants 94% tomorrow and proposes editing two paytable entries directly in production. A colleague says all RTP changes after certification are permanently forbidden, including selecting an already-certified 94% variant. We also plan a separate cashback promotion. Which changes can proceed, and what must be approved and shown to players?
