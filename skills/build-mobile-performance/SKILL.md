---
name: build-mobile-performance
description: Use when optimizing a web game for mobile - frame budget, draw-call batching, texture compression, and memory - profiling on real low/mid-range Android. Keywords mobile performance, draw calls, frame budget, texture compression, batching.
constraints: C10
---

# build-mobile-performance

## When to use / When NOT
- Use when: a web game janks, stutters, or OOMs on phones, or you're budgeting frame time, draw calls, textures, or memory for mobile.
- NOT for: desktop-only perf; settled-outcome correctness (→ `build-game-server-rgs`); asset/atlas authoring (→ `game-art`).

## Default stack (+ escape hatch)
Default: TS + PixiJS 7 (pixi-spine 4; up to 16 textures/batch), WebP atlases via tex-packer (the only format MetaWin's 14 slots ship), Spine only for animating symbols, static at rest. NOTE: WebP is transfer/disk compression — it decodes to full RGBA8 in VRAM, so does NOT shrink VRAM. KTX2/Basis Universal (4–10× smaller VRAM) is the right *concept* for a true VRAM cut but isn't used here; reach for it only if VRAM is the proven bottleneck. Other stacks, same idea: batch shared textures, pool objects, cap atlas size. Map: Pixi batch ↔ Phaser/Three draw-call merge; KTX2 ↔ ASTC/ETC2.

## Process
1. Set targets first: ~16ms frame budget (60fps) on your shipped device class; ~50–100MB assets on mid-range phones. All numbers are heuristics, not laws.
2. Profile on a real 2–3-year-old Android (e.g. Snapdragon 6/7), never a flagship or emulator — the desktop↔low-end gap is 5–10×.
3. Measure draw calls AND overdraw, not just call count. Cut calls by atlasing/batching shared textures; cut overdraw by reducing layered transparency.
4. Cut VRAM as real slots do: cap the MOBILE atlas page below GPU MAX_TEXTURE_SIZE (e.g. 2016 under the 2048 legacy limit, vs 4096 desktop), spilling to multi-page sheets; convert idle Spine skeletons to static sprites (shared texture, batched, no per-frame solve); destroy filters (ColorMatrixFilter) and per-symbol RenderTextures after use, clearing refs.
5. Pool sprites; run Spine only WHILE a symbol animates, reverting to static at rest (a sustained-load iPhone GPU can drop the WebGL context at ~30 live skeletons @60fps).
6. Profile a SUSTAINED session (autoplay/long spin), not first seconds — startup 60fps ≠ sustained.

## Correctness constraints
- **C10:** Mobile draw-call and VRAM thresholds are SOFT and workload-dependent — 800 well-batched calls can run fine while 150 heavy-overdraw calls stutter, so never treat a fixed call/VRAM number as a pass/fail gate. Android uses UNIFIED memory (GPU/CPU share RAM), so VRAM isn't a separate budget. Batching/atlasing is primarily a CPU optimization (fewer driver submissions), not a GPU one. Always profile on real low/mid-range Android against a 30fps floor — never assume desktop or emulator results transfer.

## Pitfalls / red flags
- Testing only on Chrome desktop or flagship phones; trusting emulators.
- Treating a draw-call/VRAM number as a hard gate (C10).
- Declaring victory on startup fps; ignoring sustained thermal throttle.
- Assuming WebP/PNG atlases shrink VRAM — they decode to RGBA8; cap atlas size or use KTX2/ASTC for a real cut.
- Per-frame allocations (no pooling) causing GC pauses.

## Verification
- On target low/mid Android, a sustained autoplay loop holds ≥30fps (floor), frame time tracked, not eyeballed.
- Draw calls AND overdraw measured via a frame profiler; asset memory within 50–100MB.
