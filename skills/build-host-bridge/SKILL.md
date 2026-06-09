---
name: build-host-bridge
description: Use when integrating a game into an operator shell - a connector SDK + one-way postMessage notify (slots) or an inline mount (minigames) - with strict session bracketing. Keywords operator integration, connector SDK, postMessage, iframe, host bridge, session.
---

# build-host-bridge

## When to use / When NOT
- Use when: wiring a finished game into an operator/RGS shell — slots via a global connector SDK (+ one-way notify), minigames via inline DOM mount — bracketing every round with start/end session calls.
- NOT for: in-game payout/RTP logic (server-authoritative; → `math-rtp-modeling`); wallet ledger (→ `build-wallet-and-money`); per-round game state (→ `build-game-flow`).

## Default stack (+ escape hatch)
Default: TS + a host-provided global connector SDK (slotify-style) for slots + React `createRoot` for inline minigame mounts. Other shells: any global connector that calls the RGS directly (slots), or any DOM mount + custom-event bus (minigames). Keep the host contract (connector API, notify names, session lifecycle) identical across frameworks.

## Process
Pick the bridge by game type — two distinct contracts, not variants of one:

1. **Slots → connector SDK (RGS-direct) + one-way notify.** The game (in an iframe) loads a host-provided global connector SDK (e.g. slotify `window.connector`, a separate non-bundled script) and calls the RGS **directly** for play: `create`/`authenticate`/`info`/`play`/`replay`. The parent shell does NOT broker balance/bet/spin and posts nothing back. Separately, the iframe fires **one-way** notifications to the parent — `PostMessageToParent('spinStart', { bet })` then `PostMessageToParent('spinEnd', { wonAmount })` (target `'*'`); send-only, never consumes inbound. The client renders only the server's `playResponse`.

2. **Minigames → inline mount, no iframe.** Mount into the host's `<div>` with `createRoot` (no iframe, no postMessage). Install one global `window.mwgame` exactly once, backed by a private `EventTarget` (guard re-installs so a second mount reuses the instance). Read config URL-query-first, then the host element's `data-*` attribute.

3. **Session bracketing (both paths).** Open a session at round start (`startGameSession`). On ANY error, call `endGameSession` FIRST — before surfacing the error — so the host never sees a dangling session; treat it as unconditional cleanup.

## Pitfalls / red flags
- Treating the parent `postMessage` channel as the slot play transport, or awaiting a result posted back — slots call the RGS directly via the connector SDK; `postMessage` is send-only notify. (Origin/source validation belongs to the CONSUMER — the host — not the send-only slot game.)
- Installing `window.mwgame` per-mount instead of once → duplicate listeners, leaked `EventTarget`s.
- Letting the client decide the outcome from the bet — the settled result is always the server's; animation is cosmetic.
- An error path returning without `endGameSession` → orphaned sessions, stuck balances.
- Reaching for an iframe in a minigame, or routing slot **play** through `postMessage` rather than the connector SDK (postMessage is notify-only).
- Hardcoding config, ignoring URL-query-first → data-attr precedence.

## Verification
- Slots: a spin calls `connector.play` → RGS and renders the returned `playResponse`; exactly one one-way `spinStart{bet}` then `spinEnd{wonAmount}` to the parent; the game never consumes an inbound result.
- Minigames: `window.mwgame` installs once (re-mount does not re-create it); config resolves from query string, then data-attr.
- Force an error mid-round; confirm `endGameSession` fires before the error surfaces — no session left open.
