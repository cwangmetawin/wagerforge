---
name: build-game-flow
description: Use when orchestrating server-result playback, continuation choices, wagering state, skip/turbo, or cancellation in a game runtime. Keywords game flow, sequence, state machine, timeline, next, continuation, skip, turbo.
---

# build-game-flow

> **Core insight:** Presentation completion is not round completion: non-empty `next` preserves continuation, while skip/turbo finishes only visuals and never selects an action or sends a wager.

## When to use / When NOT

- Use when sequencing result playback and coordinating continuation, input and cancellation.
- NOT for deriving outcomes (`build-game-server-rgs`), reel effects (`build-slot-reels-symbols`) or celebrations (`build-win-presentation`).

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser, Node server, exact integer/decimal money; a wagering FSM plus a cancellable presentation sequence/timeline. Other stacks map steps to state-enter handlers and timelines to cosmetic scheduling. Sequence/Step classes and pooling are implementation options, not verified MSS frontend APIs. Concurrent work needs explicit cancellation; `Promise.race` alone does not cancel losers.

## Process

1. Separate request/round state from presentation state: wagering-idle, request-pending, presenting, continuation/choice and recovery. Receive authoritative responses; animate public data only. Keep opaque round state in the adapter for resumption, never expose hidden precomputed branches to the renderer.
2. Treat non-empty `next` as continuation after playback. Preserve the open round and show its documented choices; do not enable a fresh wager. MSS `games/zeus/gamePlay.ts` `playMain` returns credited base winnings with Rush/Chase `next`; `games/zeus/FRONTEND.md` documents the funded choice handshake.
3. Return to wagering-idle only on the documented terminal response and platform acknowledgement. Neither positive `win` nor animation completion is terminal proof. MSS `games/fruitMachine/index.ts` `spin` offers `gamble`/`bank`; `server.play` rejects another spin while the round is open. Different games have different terminal state shapes.
4. Sequence reels, snapshot/cascade events and win presentation from response order. Get timing from presentation config unless the actual server contract supplies it. Use `build-slot-reels-symbols` and `build-win-presentation` for their adapters.
5. Make skip/turbo a visual-only fast-forward to this response's final board. It must not choose a continuation, send a wager, change payment amounts or bypass choices. A distinct player decision or documented autoplay policy owns subsequent requests; keep it separate from skip handlers.
6. Settle or cancel every awaited task on skip, error, resize/restart and disposal. Reset/release pooled instances if used. On uncertain request status, enter recovery and reconcile the authoritative round; never infer loss, retry a wager blindly or discard pending state because animation failed.

## Pitfalls / red flags

Always transitioning win-present to idle; losing opaque continuation state; implicit `next[0]` selection during skip; comparing a mid-animation board with its final board; orphaned promises/timers; stale callbacks unlocking wagering.

## Verification

Normal playback and skipped playback of the same response must yield identical final boards, amounts and continuation state. Skip at each await boundary and assert zero action/wager requests from skip handlers. Test non-terminal positive wins, pending-total loss/bank, duplicate input, reconnection, cancellation and terminal acknowledgement. Record client request traces and lifecycle checks separately from MSS source evidence.
