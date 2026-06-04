---
name: build-slot-reels-symbols
description: Use when implementing slot reel spin and symbol rendering - bezier spin physics, a 3D perspective filter, SymbolMatrix object pooling, and Spine swaps. Keywords reel spin, symbol pooling, Spine, bezier, slot frontend.
constraints: C9
---

# build-slot-reels-symbols

## When to use / When NOT
- Use when: animating a slot reel spin, rendering the symbol matrix, or wiring deterministic stop positions to a server-resolved result.
- Do NOT use for: deciding the outcome (the server does — see `math-rtp-modeling`, `build-game-server-rgs`); win lines/count-up presentation (sibling win-presentation skill); RNG or fairness (`fair-rng-core`, `fair-commit-reveal`).

## Default stack (+ escape hatch)
Default: TS + PixiJS renderer; sprites at rest, Spine for mid-spin symbol animation; named cubic-bezier curves + JSON timing tables; a GLSL trapezoid filter for 3D perspective. Other stack (Phaser/Unity/DOM): map cubic-bezier control arrays → your tween easing, the perspective filter → a shader/mesh transform, the pool → your engine's object pool.

## Process
1. Receive the server result FIRST: final stop index per reel plus motion params (turbo/normal timing table, curve names). Never derive the stop from animation. [C9]
2. Build the visible matrix from pooled `MatrixSymbol` sprites; lay out the strip so the target stop index lands on screen at rest.
3. Spin deterministically: drive each reel by a named cubic-bezier curve — `startCurve`, `stopCurve`, plus `hotreelStopCurve`/`quickStopCurve` for anticipation/turbo — selected from the timing table. Duration and curve come from params, never hardcoded.
4. Swap sprite→Spine only while a symbol is animating (land/win/anticipation); return it to a sprite at rest to free the Spine instance back to its pool.
5. Apply the 3D perspective filter; recompute its uniforms ONLY on size/orientation change, not per frame.
6. For stacked/oversized cells, point multiple matrix positions at one shared symbol reference — do not clone or mutate per cell.

## Correctness constraints
- **C9:** Certified slots require the outcome to be server-determined, finalized, and audit-logged BEFORE animation (never client-influenced). A cryptographic commit-reveal is NOT required for certification — commit-reveal is the provably-fair transparency model and is optional/enhancing here. So: trust the server-committed stop index and animate to it; the animation is 100% cosmetic.

## Pitfalls / red flags
- Treating animation as logic — letting the visual landing decide or alter the result (violates C9).
- Hardcoding spin durations/curves instead of reading server motion params.
- Leaving a Spine skeleton mounted at rest (memory/GPU cost) instead of returning to a pooled sprite.
- Recomputing the perspective filter uniforms every frame.
- Cloning/mutating symbols for stacked cells instead of sharing one reference (mutation breaks pooling).
- 60fps on startup ≠ sustained; profile on a real mid-range 2–3-year-old Android.

## Verification
- Assert the on-screen stop matrix equals the server stop indices for every reel; mismatch is a bug, never a re-roll.
- Pool counts return to baseline at rest (sprites in, Spine out); no leaked skeletons after a spin.
- Spin timing/curves change when the server sends different motion params (turbo vs normal).
