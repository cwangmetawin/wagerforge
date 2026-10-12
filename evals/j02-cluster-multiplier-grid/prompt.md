---
schema_version: "1.1"
name: j02-cluster-multiplier-grid
description: Pay a cluster win on a persistent doubling multiplier grid
tags: [math, slots, clusters, audit-job1-f02]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our cluster slot has a persistent multiplier grid. A cell starts inactive; the first time it is part of a winning cluster it activates at x1; every later hit doubles it, capped at x1024. This wave, a winning 5-symbol cluster covers cells whose current values are: inactive, x1, x2, x4, inactive. The cluster's base pay is 0.5. Our draft first doubles the cells and then pays base pay times the sum of all multiplier cells. What should this cluster pay this wave, what do the five cells become, and what does a cluster pay when none of its cells is at x2 or more?
