---
name: build-mobile-performance
description: Use when optimizing a web game for mobile - frame budget, draw-call batching, texture compression, and memory - profiling on real low/mid-range Android. Keywords mobile performance, draw calls, frame budget, texture compression, batching.
constraints: C10
---

# build-mobile-performance

## When to use / When NOT
- Use when: a web game janks, stutters, or OOMs on phones, or you are budgeting frame time, draw calls, textures, or memory for mobile.
- NOT for: desktop-only perf; correctness of the settled outcome (→ `build-game-server-rgs`); asset authoring/atlas tooling itself (→ `game-art`).

## Default stack (+ escape hatch)
Default: TS + PixiJS (batches up to 16 textures/batch), Basis Universal/KTX2 textures, Spine for animated symbols, sprite+atlas for static UI. Other stacks: same idea — batch by shared texture, GPU-compress, pool objects. Map: Pixi batch ↔ Phaser/Three draw-call merge; KTX2 ↔ ASTC/ETC2.

## Process
1. Set targets up front: ~16ms frame budget (60fps) on the device class you actually ship to; ~50–100MB asset budget on mid-range phones. Treat all numbers as heuristics, not laws.
2. Profile on a real 2–3-year-old Android (e.g. Snapdragon 6/7), never a flagship or emulator. The desktop↔low-end gap is 5–10×.
3. Measure draw calls AND overdraw, not just call count. Cut calls by atlasing/batching shared textures; cut overdraw by reducing layered transparency.
4. Compress textures with Basis Universal/KTX2 (4–10× smaller VRAM footprint vs RGBA8). Pool sprites; swap to Spine only mid-animation, back to sprite at rest.
5. Profile a SUSTAINED session (autoplay/long spin loop), not the first few seconds — 60fps on startup ≠ sustained.

## Correctness constraints
- **C10:** Mobile draw-call and VRAM thresholds are SOFT and workload-dependent — 800 well-batched calls can run fine while 150 heavy-overdraw calls can stutter, so never treat a fixed call/VRAM number as a pass/fail gate. Android uses UNIFIED memory (GPU and CPU share RAM), so VRAM is not a separate budget. Batching/atlasing is primarily a CPU optimization (fewer driver submissions), not a GPU one. Always profile on real low/mid-range Android against a 30fps floor — never assume desktop or emulator results transfer.

## Pitfalls / red flags
- Testing only on Chrome desktop or flagship phones; trusting emulators.
- Treating a draw-call/VRAM number as a hard gate (C10).
- Declaring victory on startup fps; ignoring sustained-session thermal throttle.
- Shipping RGBA8 PNGs decoded to full-size VRAM instead of GPU-compressed textures.
- Per-frame allocations (no pooling) causing GC pauses.

## Verification
- On the target low/mid Android, a sustained autoplay loop holds ≥30fps (floor) with frame time tracked, not eyeballed.
- Draw calls AND overdraw measured via a frame profiler; asset memory within the 50–100MB budget.
