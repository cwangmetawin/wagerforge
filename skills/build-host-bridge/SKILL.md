---
name: build-host-bridge
description: Use when integrating a game with an operator shell, connector SDK, iframe or inline mount, defining postMessage contracts, or diagnosing host-session, reconnect and remount failures.
---

# build-host-bridge
> **Core insight:** A host bridge follows a verified transport and lifecycle contract; presentation events never authorize money movement or determine round completion.

## When to use / When NOT

- Use for operator embedding, transport adaptation and host lifecycle integration.
- NOT for payout math, wallet accounting or wagering state machines; use `math-rtp-modeling`, `build-wallet-and-money` and `build-game-flow`.

## Default stack (+ escape hatch)

TypeScript adapter + PixiJS/Phaser client + Node RGS; exact integer money atoms. Other stacks map transport, event schemas, mounting and teardown to the same verified shell contract. Choose iframe or inline embedding from that contract, not game genre.

## Process

1. **Pin the actual contract.** Inspect client and host source/SDK documentation; record versions, mount ownership, config precedence, message direction, schemas, request correlation and session-hook semantics. SDK globals, notify names and session calls are (unverified) in this evidence set; WF's historical descriptions supply no current implementation proof.
2. **Adapt server results.** Keep outcome authority on the server. MetaWin's production server (MSS) `docs/GDK_CONTRACT.md` `IGame.play` documents `win`, `state`, `data` and `next`; MSS contains game modules, not the client/host SDK implementation. Verify the platform envelope separately and expose only the documented public projection.
3. **Separate lifecycle signals.** Distinguish display totals, newly payable amounts, animation completion and round completion. MSS `games/fruitMachine/index.ts` `spin` can return positive `data.totalWin`, `win: 0` and `next: ["gamble", "bank"]`. Continue according to authoritative state and the verified platform completion contract; animation or UI errors must not settle/refund a bet.
4. **Enforce message boundaries.** For `postMessage`, use the verified destination origin. Any receiver validates origin, source, schema and request identity before dispatch. Treat notification-only versus request/response channels as explicit contract properties.
5. **Implement owned cleanup.** Balance session hooks according to their documented meaning, including refusal, timeout, disconnect and remount. Release owned listeners/timers/mounts and preserve the original error if cleanup fails. A host-session cleanup call must not discard an accepted open wager.
6. **Reconcile uncertain replies.** Resolve the existing platform request/round before enabling further paid actions; do not automatically submit a replacement wager. Identical retries preserve identity/content; the same key with different content must conflict. Money recovery belongs to `build-durable-settlement`.

## Pitfalls / red flags

- Assuming transport, config precedence or session APIs from game genre.
- Trusting wildcard destinations or unchecked inbound messages.
- Declaring funds credited from a displayed win or animation-end event.
- Treating every error as round closure; duplicate mounts or replacement bets after timeouts.

## Verification

- Retain versioned host/client contract evidence and integration traces for paid actions, continuation, pending display wins, terminal zero wins, errors and reconnects.
- Exercise repeated mount/unmount, invalid message origins/sources, late replies and identical/conflicting retries; prove no extra debit, credit or cancellation.
- Mock tests cannot establish the real SDK's behavior. Missing client/host source or integration evidence remains (unverified).
