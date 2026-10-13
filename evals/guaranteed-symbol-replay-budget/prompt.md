---
schema_version: "1.1"
name: guaranteed-symbol-replay-budget
description: Independent golden-symbol retries change RTP and leak at a finite budget; shared mutation requires a separate state model
tags: [math, features, retries]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our slot sells a normal bonus buy for 45x the base stake and its simulated RTP is 96%. For every pristine entry snapshot, an unforced complete bonus run under an analysis-only IID candidate model lands gold with probability 4%. Its mean payout is 120x the base stake conditional on gold, and 40x conditional on no gold. These statistics apply only to independent runs from pristine snapshots, not to entry states mutated by previous runs. Keep that base stake and outcome law fixed when repricing.

Marketing wants a "Golden Bonus" at the same 45x. First analyze an isolated implementation: condition on one sampled entry and draw IID complete-bonus candidates at a fixed total charge of 45x, stop at the first gold, or after 25 total attempts pay the last attempt. What are expected payout, RTP at 45x, average attempt count, guarantee-failure probability, and the price restoring 96%? Give the same quantities with no attempt cap, and reconcile the normal buy's 96%.

The proposed allocation optimization instead reuses entry-board objects (symbol grid, persistent multiplier grid, counters), which the bonus mutates. Can the isolated figures price this implementation? What additional information is needed, how should production retries use state and RNG, and what mutation/reproducibility tests should we run? We may also need to reproduce the shared-state behavior when auditing legacy RTP.
