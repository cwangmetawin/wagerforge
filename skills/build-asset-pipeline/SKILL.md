---
name: build-asset-pipeline
description: Use when building the art asset pipeline - Spine triad (json plus atlas plus webp), texture atlas packing, incremental mtime builds, and swappable AI-asset providers. Keywords asset pipeline, Spine, atlas, texture packer, asset budget.
constraints: C10
---

# build-asset-pipeline

## When to use / When NOT
- Use when: packing sprites/atlases, wiring the Spine triad, adding incremental builds, or plugging in a swappable AI-asset provider.
- NOT for: in-game rendering/animation playback (→ symbol/scene/win-presentation skills); choosing the renderer or engine bootstrap (→ `setup-engine`).

## Default stack (+ escape hatch)
Default: Node build scripts + `free-tex-packer-core` + `cwebp`, output as a PixiJS JSON-Hash atlas. Other stacks: same triad maps — atlas JSON → your sprite frame map, `.atlas` → Spine runtime, `.webp` → your compressed texture (KTX2/Basis if your runtime decodes it).

## Process
1. **Pick the format per asset class.** Animated symbols → Spine skeletal (`json` + `.atlas` + `.webp`); it is 30–50% smaller than equivalent spritesheets. Static UI → spritesheet + atlas + bitmap fonts.
2. **Pack.** Run `free-tex-packer-core` to lay out frames; emit a PixiJS JSON-Hash atlas with `<anim>/000` zero-padded frame naming so animation frames sort deterministically.
3. **Compress.** Pipe each packed PNG through `cwebp`; keep the source PNG as build input, ship only `.webp`.
4. **Build incrementally.** Skip any output whose mtime is newer than all its inputs; rebuild only stale assets. Run conversions under **bounded concurrency** (a fixed worker pool), not unbounded `Promise.all`, so large packs don't exhaust file handles/memory.
5. **Provider abstraction.** Generate AI assets behind a `SpriteAnimationProvider` interface (`generate(spec) → frames`). Ship a mock provider first; resolve real providers from a registry. Keep the API secret in memory only (read from env/secret manager at call time); never write it to disk or the atlas.
6. **Enforce the budget.** Sum packed atlas + texture bytes against a per-build asset budget; fail the build on overflow.

## Correctness constraints
- **C10:** Mobile draw-call/VRAM thresholds are SOFT and workload-dependent — 800 batched calls can be fine while 150 heavy-overdraw calls can stutter. Android uses unified memory (no separate VRAM pool), so batching/atlasing is fundamentally a CPU optimization (fewer submits), not a VRAM trick. Do not gate the pipeline on a hardcoded draw-call or MB number; profile on a real low/mid-range Android device against a 30fps floor and tune from measured frames.

## Pitfalls / red flags
- Hardcoded draw-call/VRAM caps treated as hard laws (C10); judging perf on a flagship or emulator.
- Unbounded concurrency exhausting file handles on large packs.
- mtime check comparing against the wrong/missing inputs → silent stale ships.
- API key written into the atlas, logs, or repo.
- Non-deterministic frame naming breaking animation order.

## Verification
- Re-run the build with no source changes: every asset reports "skipped" (mtime cache hit).
- Atlas JSON validates as PixiJS JSON-Hash; frames load and animate in order.
- Budget check passes; build fails on a deliberately oversized asset.
- Profile a representative scene on a real low/mid Android: sustained ≥30fps.
