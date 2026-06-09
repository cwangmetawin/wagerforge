---
name: build-asset-pipeline
description: Use when building the art asset pipeline - Spine triad (json plus atlas plus webp), texture atlas packing, incremental mtime builds, and swappable AI-asset providers. Keywords asset pipeline, Spine, atlas, texture packer, asset budget.
constraints: C10
---

# build-asset-pipeline

## When to use / When NOT
- Use when: packing sprites/atlases, the Spine triad, incremental builds, or a swappable AI-asset provider.
- NOT for: rendering/playback (→ symbol/scene/win-presentation skills); renderer choice/bootstrap (→ `setup-engine`).

## Default stack (+ escape hatch)
Default: Node scripts + `free-tex-packer-core` + `cwebp` → PixiJS JSON-Hash atlas. Same triad elsewhere: atlas JSON → sprite frame map, `.atlas` → Spine runtime, `.webp` → compressed texture (KTX2/Basis if supported). TS/Webpack: pack at build via a `sharp` generator (`SpriteSheetGenerator` + per-type loaders) — different tooling. Reference: medusa `scripts/build-sprites.js`.

## Process
1. **Format per asset class.** Animated symbols → Spine skeletal (`json` + `.atlas` + `.webp`), 30–50% smaller than spritesheets. Static UI → spritesheet + atlas + bitmap fonts.
2. **Pack, device-aware page cap.** `free-tex-packer-core` emits a JSON-Hash atlas; `<anim>/000` zero-padded frames sort deterministically. Cap mobile pages UNDER GPU `MAX_TEXTURE_SIZE` (e.g. 2016 under 2048); legacy drivers fail at the limit. Overflow → multi-page; link via `meta.related_multi_packs` on page 0 so PIXI v7 auto-fetches+merges into one TextureCache.
3. **Compress.** Pipe each packed PNG through `cwebp` (spritesheets ~`-q 90 -m 4`); rewrite `.atlas`/`.fnt` PNG refs to `.webp` (`-q 80` fine). Keep source PNGs, ship only `.webp`.
4. **Build incrementally.** Skip outputs at least as new as all inputs. For RESIZED mobile assets, key the cache on BOTH mtime AND output PNG dimensions (`source*factor` ±1px) — a factor change leaves stale-but-newer PNGs that pure-mtime skips and the packer silently drops. Convert under **bounded concurrency** (worker pool), not unbounded `Promise.all`.
5. **Provider abstraction.** Put AI gen behind a `SpriteAnimationProvider` interface (`generate(spec) → frames`). Ship a mock first; resolve real providers from a registry. Keep the API secret in memory only (env/secret manager); never to disk or atlas.
6. **Enforce the budget.** Sum packed atlas + texture bytes vs a per-build budget; fail on overflow.

## Correctness constraints
- **C10:** Mobile draw-call/VRAM thresholds are SOFT and workload-dependent — 800 batched calls can be fine while 150 heavy-overdraw calls stutter. Android uses unified memory (no separate VRAM pool), so batching/atlasing is a CPU optimization (fewer submits), not a VRAM trick. Don't gate on a hardcoded draw-call/MB number; profile on a real low/mid-range Android against a 30fps floor and tune from measured frames.

## Pitfalls / red flags
- Hardcoded draw-call/VRAM caps as hard laws (C10); judging perf on a flagship/emulator.
- Unbounded concurrency exhausting file handles on large packs.
- mtime check using wrong/missing inputs, or ignoring resized-output dimensions → silent stale/dropped frames.
- A `cwebp` JS wrapper using `shell:true` — newer Node (DEP0190) can leave the callback unfired → Promise hangs, build silently exits; invoke `cwebp` via `execFile`.
- API key written into the atlas, logs, or repo.
- Non-deterministic frame naming breaking animation order.

## Verification
- Re-run unchanged: every asset reports "skipped" (cache hit).
- Atlas JSON validates as PixiJS JSON-Hash; frames load and animate in order.
- Budget check passes; build fails on an oversized asset.
- Profile a scene on low/mid Android: sustained ≥30fps.
