---
name: build-mobile-performance
description: Use when a mobile web game janks, runs out of memory, loses its graphics context, or needs frame-time, draw-call, overdraw, texture and sustained-play profiling on real target devices.
metadata:
  constraints: C10
---

# build-mobile-performance
> **Core insight:** Mobile draw-call and texture-memory budgets are soft and workload-dependent; optimize the bottleneck measured on real target devices while preserving the server-resolved outcome.

## When to use / When NOT

- Use for mobile rendering, resource pressure and sustained gameplay profiling.
- NOT for asset authoring (use `build-asset-pipeline`) or settlement correctness (use `build-game-server-rgs`).

## Default stack (+ escape hatch)

TypeScript + PixiJS/Phaser client + Node server; exact integer money atoms. Other engines map rendering submissions, resource lifetimes and quality settings to their profiler. Renderer versions, batching limits and texture formats require target-client evidence (unverified).

## Process

1. **Pin the evidence boundary and outcome fixtures.** Client optimization must preserve server results. MetaWin's production server (MSS) `games/coinUp/gamePlay.ts` `buildResponse` returns grids, bonus data and a resolved win. MSS supplies no corresponding renderer or device/GPU measurements; those remain (unverified).
2. **Define targets before testing.** Agree device tiers, browser versions, representative scenes, session duration and frame-time/stability goals. Separate downloaded bytes, decoded texture resources and live runtime allocations; record how each is measured.
3. **Locate the bottleneck.** Capture main-thread/frame times, rendering submissions, overdraw/shader work, uploads and memory using the target device's available profiling tools. Include loading, long frames, sustained gameplay and thermal behavior. Neither call count nor overdraw alone identifies every slowdown.
4. **Change only measured costs.** Evaluate atlasing/batching for submission overhead, fewer transparent layers for overdraw, pooling for allocation churn, or lower resolution for proven resource pressure. Re-measure the complete scene; smaller files alone establish no runtime-memory saving.
5. **Check resource ownership.** Track allocations through repeated rounds, remounts, background/foreground transitions and graphics-context recovery. Release owned resources at the correct lifecycle boundary; preserve resources still shared by active objects.
6. **Keep quality changes cosmetic.** Preserve authoritative result snapshots, required controls, amounts and rules. Simplified animation must not select a continuation, place another bet or change credit. Follow `build-game-flow` for wagering transitions.

## Correctness constraints

- **C10:** Draw-call/VRAM thresholds are soft and workload-dependent. Android GPUs mostly share unified memory with the CPU, so texture allocations are not a separate VRAM budget. Budget per device tier and profile real low/mid-range Android; include GPU allocations in overall device memory pressure. Measure submission cost separately from overdraw and resource residency. Fixed call counts or MB values do not establish performance. See WF `docs/specs/2026-06-04-wagerforge-design.md` §7.

## Pitfalls / red flags

- Universal texture/page/batch limits or unsupported compression ratios.
- Startup-only, flagship-only or emulator-only measurements.
- Inferring texture residency from download size.
- Treating server simulation/tick timings as client rendering evidence.

## Verification

- Retain before/after profiles with device, browser, renderer revision, scene, duration, frame-time distributions, memory peaks and context failures; assess the agreed per-tier targets.
- Replay the same server fixtures across quality settings; verify result order, displayed amounts, controls and continuations remain correct.
- Source inspection and local builds cannot prove mobile performance. Missing real-device measurements remain (unverified).
