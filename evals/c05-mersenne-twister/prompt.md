---
schema_version: "1.1"
name: c05-mersenne-twister
description: Statistical battery success does not make MT19937 secure
tags: [comp, c5, rng]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our slot RNG uses MT19937 with a secret timestamp-based seed. It passes Diehard and NIST statistical tests, and the test lab is ISO 17025 accredited. Replacing it would delay launch. Is this sufficient for a certified real-money game, and what would the replacement and certification evidence need to demonstrate?
