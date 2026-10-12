---
schema_version: "1.1"
name: c01-reel-weight-rtp
description: Recompute normalized reel probabilities instead of scaling RTP by a raw weight
tags: [math, c1, ablation]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We have a five-reel slot at 96% RTP. The designer wants to double the weight of the top-paying symbol on reel three, keeping the paytable and all other raw weights unchanged. Can I estimate the new RTP by doubling that symbol's contribution and applying the same percentage increase to the headline RTP? Give me a production-safe way to evaluate the change, including free-spin triggers.
