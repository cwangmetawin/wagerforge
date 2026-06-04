---
name: build-win-presentation
description: Use when building win presentation - tiering (big/mega/epic by x-bet threshold), currency count-up, win-line lifecycle, and a data-driven responsive scene graph. Keywords win presentation, big win, count up, win lines, scene graph.
---

# build-win-presentation

## When to use / When NOT
- Use when: choosing a win tier, animating a currency count-up, driving win-line show/hide, or laying out the celebration scene responsively.
- NOT for: computing the win amount or RTP (server-authoritative — see math/RGS skills); building reels or symbols (sibling `build-*` skills); generic asset packing (`asset-pipeline`).

## Default stack (+ escape hatch)
Default: TS + PixiJS + GSAP for tweening; scene as JSON built by a `SceneManager`. Other stacks: map GSAP→your tween engine, PixiJS containers→your display tree; the tier band config and scene JSON schema stay engine-agnostic.

## Process
1. **Tier selection (presentational only).** Keep an ordered band config: `winThresholds[{ name, threshold, action, loopDur, loopFrames }]` where `threshold` is a multiple of `bet`. Select the highest tier where `totalWin >= threshold * bet`. This never changes the credited amount — `totalWin` comes from the server result.
2. **Tier → action map.** Map the selected tier to a presentation action, e.g. `PRESENT_WIN` (ordinary), `BIG_WIN`, `MAX_WIN`. The action drives which loop/banner/sound plays; below the lowest band, present nothing special.
3. **Count-up.** Tween a numeric value `0 → totalWin` with GSAP, and on each update render it through an **injected text formatter** (currency symbol, locale grouping, decimals from auth — never hardcode). Inject the formatter so display formatting is swappable and testable; never format money inline.
4. **Win-line lifecycle.** For each winning line: show line + symbol highlight, hold, then hide before the next — sequence them, and make any hold/loop duration server-parameterizable (read from the band config or result, not a magic constant).
5. **Scene graph.** Build the celebration scene from a data-driven JSON tree: `{ tree, objects: { <id>: { type, anchors, boundary, portrait{}, landscape{} } } }`. The `SceneManager` instantiates objects and applies the `portrait`/`landscape` anchor block matching the current orientation, re-laying-out on resize/orientation change.

## Pitfalls / red flags
- Letting the tier or count-up target decide or alter the win — it is cosmetic; the settled `totalWin` is always the server field.
- Hardcoding currency symbol, decimals, or grouping instead of using the injected formatter (precision must come from auth).
- Hardcoded animation/loop durations — must be parameterizable so server can tune timing.
- Mutating the scene/band config in place; build new orientation layouts rather than editing shared objects.
- Only testing landscape on desktop — verify portrait anchors on a real phone.

## Verification
- Unit-test the tier selector: a `totalWin` exactly at a band edge picks that band; just below picks the lower band; tier choice never mutates `totalWin`.
- Snapshot the count-up's final formatted string for several currencies/locales via the injected formatter.
- Toggle portrait/landscape and confirm `SceneManager` applies the matching anchors; win lines show then hide in order with no overlap.
