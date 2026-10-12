---
schema_version: "1.1"
name: f13-rtp-ci-acceptance
description: Use confidence-interval containment for tolerance acceptance
tags: [qa, rtp, audit-f13]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

A slot validation run has mean gross return 1.0000, target RTP 0.9875, and a 95% CI half-width of 0.0196. Our allowed absolute tolerance is 0.0200. The target lies inside the CI and the half-width is below tolerance, so the script reports PASS. Can we accept that as proof the implemented RTP is within tolerance? Give the correct gate and explain what a CI miss would tell us.
