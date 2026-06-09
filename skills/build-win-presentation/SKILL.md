---
name: build-win-presentation
description: Use when building win presentation - tiering (big/mega/epic by x-bet threshold), currency count-up, win-line lifecycle, and a data-driven responsive scene graph. Keywords win presentation, big win, count up, win lines, scene graph.
---

# build-win-presentation

## When to use / When NOT
- Use when: choosing a win tier, animating a currency count-up, driving win-line show/hide, or laying out the celebration scene responsively.
- NOT for: computing win amount or RTP (server-authoritative — see math/RGS skills); reels or symbols (sibling `build-*` skills); asset packing (`asset-pipeline`).

## Default stack (+ escape hatch)
Default: TS + PixiJS; tiering/scene as JSON; count-up driven by your game's per-frame timeline (interpolate `elapsed/duration`), NOT a tween lib (real games ship no GSAP). Other stacks: GSAP/your tween engine is an acceptable escape hatch; PixiJS containers→your display tree; tier band config and scene JSON schema stay engine-agnostic.

## Process
1. **Tier selection (presentational only).** Keep a descending-ordered band config: `winThresholds[{ name, threshold, isBigWin?, isMegaWin?, isEpicWin?, isMidWin?, isLowWin?, isBoring?, noCelebration?, loopDur, loopFrames }]` where `threshold` is a `bet` multiple and tier is set by boolean flags (not an `action` string). Pick the highest band where `totalWin >= threshold * bet`. Never changes the credited amount — `totalWin` is the server result.
2. **Tier → action map.** Derive the action from the band's flags: `isBigWin/isMegaWin/isEpicWin` → big-win posting; max-win flag → max-win posting; else ordinary `PRESENT_WIN`; `noCelebration`/boring presents nothing special.
3. **Count-up.** Interpolate a value from the prior running win (`server total − this win`, or 0) up to server `totalWin` over a band-driven duration, rendering each frame via an **injected currency handler** (symbol + grouping/decimals from session/auth currency — never hardcode). Big-win count-ups step `countFrom → countTo` across tier bands. Never format money inline.
4. **Win-line / symbol lifecycle.** Payline games sequence each winning line: show line + symbol highlight, hold, then hide before the next — hold/loop durations server-parameterizable (band config or result, not a magic constant). Cascade/cluster-pay games instead drive per-symbol win states, not animated lines.
5. **Scene graph.** Build the responsive scene from a flat layout JSON `{ layouts: { <container-name>: { landscape:{x,y,scaleX,scaleY}, portrait:{...} } } }`. A resizer iterates named containers and, on each resize/orientation change, reads `layouts[name][orientation]` and re-applies position/scale.

## Pitfalls / red flags
- Letting the tier or count-up target decide or alter the win — it is cosmetic; the settled `totalWin` is always the server field.
- Hardcoding currency symbol, decimals, or grouping instead of the injected currency handler (precision comes from auth).
- Hardcoded animation/loop durations — must be parameterizable so server can tune timing.
- Mutating the scene/band config in place; build new orientation layouts rather than editing shared objects.
- Only testing landscape on desktop — verify portrait anchors on a real phone.

## Verification
- Unit-test the tier selector: `totalWin` exactly at a band edge picks that band; just below picks the lower band; tier choice never mutates `totalWin`.
- Snapshot the count-up's final formatted string for several currencies/locales via the injected currency handler.
- Toggle portrait/landscape and confirm the resizer re-applies `layouts[name][orientation]` per container; win lines show then hide in order with no overlap.
