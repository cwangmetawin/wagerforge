---
name: build-game-flow
description: Use when structuring the game runtime control flow - a Sequence/Step coroutine engine (default) vs a Gamestate FSM plus Timeline. Keywords game flow, sequence, coroutine, state machine, timeline.
---

# build-game-flow

## When to use / When NOT
- Use when: orchestrating a round's runtime control flow — spin → resolve → cascade → win-present → idle — and choosing how steps sequence, run concurrently, and skip.
- NOT for: deciding the outcome (server-authoritative — outcome arrives before flow runs); win-tier visuals (→ `build-win-presentation`); reel motion physics (→ `build-slot-reels-symbols`); scene layout (→ `build-win-presentation`).

## Default stack (+ escape hatch)
Default: TS + PixiJS + a pool-backed, skippable **Sequence/Step coroutine engine**. Each `Step` is an awaitable unit; a `Sequence` runs steps in order. Composite steps: `AwaitConcurrent` (all settle), `RaceConcurrent` (first settles), `SkipGroup` (skip/turbo collapses a span). Steps are pooled and reset, never re-allocated per round. If your project is older JS or signal/Redux-driven, map: Step→state-enter handler, Sequence→transition table, SkipGroup→fast-forward flag, AwaitConcurrent→`Promise.all`, RaceConcurrent→`Promise.race`.

Escape hatch — **Gamestate FSM + Timeline**: discrete states (`idle`, `start-spinning`, `loop`, `stop-spinning`, `process-cascade`, `evaluate-result`) with a Timeline scheduling cosmetic events by parameterized delay. Prefer this only when an existing codebase already runs an FSM, or designers need an explicit visual state diagram.

## Process
1. Receive the resolved outcome from the server; the flow only animates it. Never branch flow logic on a client-computed result.
2. Pick the engine. Default Sequence/Step for modern TS; FSM+Timeline for legacy/diagram-driven titles.
3. Model the round as composed steps: spin-start → await reels stop (`AwaitConcurrent`) → loop cascades (`process-cascade` per tumble) → evaluate → win-present → idle.
4. Make every duration a server/config parameter passed into the step, not a literal.
5. Wrap user-skippable spans in a `SkipGroup` (or FSM fast-forward flag) so turbo/slam jumps to the settled frame without altering the outcome.
6. Pool step and sequence instances; reset state on acquire, return on completion.

## Pitfalls / red flags
- Treating animation as logic — flow must never decide or mutate the outcome.
- Hardcoded durations; turbo/skip that re-derives a result instead of fast-forwarding to the server frame.
- Allocating steps per round (GC churn) instead of pooling.
- A skip that leaves a sequence mid-await, orphaning timers or leaking pooled instances.
- Global mutable flow state shared across concurrent rounds.

## Verification
- Skip/turbo lands on the exact server-settled frame — assert pre- and post-skip board states are identical.
- Pool size stays flat across many rounds (no per-round growth).
- Concurrent steps all settle (or the race winner cancels losers) with no orphaned timers.
- Replaying the same outcome twice yields an identical end state.
