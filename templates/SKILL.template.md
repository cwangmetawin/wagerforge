---
name: <prefix>-<topic>
description: Use when <concrete trigger / symptom / keyword> — third person, WHEN to use only, one line, ≤1024 chars, never a process summary.
metadata:
  constraints: C1, C4
---

# <Human Title>

> **Core insight:** <the one non-obvious, code-grounded takeaway — a single line, ~35 words>

## When to use / When NOT
- Use when: …
- Do NOT use for: … (point at a sibling skill by name, e.g. `math-rtp-modeling`)

## Default stack (+ escape hatch)
Default: <TS + PixiJS/Phaser + Node + exact integer/decimal money>. If your project uses X instead, map: <concept → concept>.

## Process
1. …
2. …

## Correctness constraints
<!-- Only if constraint-bound: list the ids under metadata.constraints AND state each corrected rule here
     (never the folk version). Delete metadata + this section otherwise. The validator errors on a
     declared id without a filled-in section, and on ids outside C1..C14. -->

## Pitfalls / red flags
- …

## Verification
- How to know it worked (evidence, not vibes): a test, a simulation with its CI, a reproduction.

<!-- Body budget ≤540 words (validator warns above, errors above 800). Portable frontmatter only:
     name, description, metadata (Claude Code and Codex both load it). Cite production files by path;
     never paste proprietary code or keys. -->
