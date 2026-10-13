---
name: build-asset-pipeline
description: Use when packaging game sprites, texture atlases, skeletal animations or bitmap fonts, diagnosing stale incremental asset builds, or integrating generated art into an asset pipeline.
metadata:
  constraints: C10
---

# build-asset-pipeline
> **Core insight:** Atlas layout, download size and runtime resource costs need separate evidence; a packer choice or smaller file does not establish mobile performance.

## When to use / When NOT

- Use for asset packaging, incremental rebuilds and generated-art integration.
- NOT for runtime profiling (use `build-mobile-performance`) or outcome generation (use `build-game-server-rgs`).

## Default stack (+ escape hatch)

TypeScript + PixiJS/Phaser client, Node build tools/server, exact integer money atoms. Select formats from the actual client loader. Other stacks map atlas metadata to their frame maps and animation data to their runtimes; preserve identifiers and ordering.

## Process

1. **Establish the evidence boundary.** Inspect the target packer and loader before prescribing outputs. MetaWin's production server (MSS) `games/coinUp/gamePlay.ts` `buildResponse` supplies outcome data. The client asset pipeline is outside MSS; its tools, codecs and loading behavior are (unverified). WF contains skill guidance, not that client implementation.
2. **Define a runtime manifest.** Preserve symbol/frame identifiers, animation order, dimensions and page references. Validate skeletal data, atlas pages and font references together against the actual loader; do not assume one universal file triad or multipack convention.
3. **Choose formats by measurement.** Compare packaged bytes and visual fidelity on representative assets. Check transparency, fonts, animation playback and target-runtime support. Record codec settings; promise no fixed compression gain.
4. **Invalidate all dependencies.** A rebuild key must cover source inputs, resize factors, packing/compression settings and tool versions. Validate cached dimensions and manifest completeness. A pure mtime check cannot detect a changed transform setting.
5. **Bound build work.** Limit conversion/packing concurrency, preserve sources and publish complete outputs only after resolving references. Require generated art to satisfy the same manifest contract; provider APIs remain (unverified) until their implementation is inspected.
6. **Separate budgets.** Enforce an explicitly agreed package-size limit as build policy. Assess rendering and runtime memory separately with `build-mobile-performance`.

## Correctness constraints

- **C10:** Draw-call/VRAM thresholds are soft and workload-dependent; set budgets per device tier and profile real low/mid-range Android. Android GPUs use unified memory, so GPU allocations count toward overall device memory pressure. Atlasing alone proves no memory saving. See WF `docs/specs/2026-06-04-wagerforge-design.md` §7.

## Pitfalls / red flags

- Guessing loader metadata, codec support or GPU page limits.
- Treating smaller downloads as measured runtime-memory savings.
- Stale transforms, missing frames or unstable naming/order.

## Verification

- Record packer/loader revisions, settings, byte counts, dimensions and complete frame/page mappings.
- Exercise unchanged rebuilds, changed inputs/settings, missing dependencies and declared package-budget overflow.
- Load the shipped package in the target client; verify every frame, animation and font reference, then capture device profiles. Missing client/device evidence stays (unverified).
