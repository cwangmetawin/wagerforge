---
name: build-host-bridge
description: Use when integrating a game into an operator shell - a postMessage connector (slots) or an inline mount (minigames) - with strict session bracketing. Keywords operator integration, postMessage, iframe, host bridge, session.
---

# build-host-bridge

## When to use / When NOT
- Use when: wiring a finished game into an operator/RGS shell — slots via an iframe `postMessage` connector, minigames via inline DOM mount — and you must bracket every round with start/end session calls.
- NOT for: in-game payout/RTP logic (server-authoritative; → `math-rtp-modeling`); wallet ledger mechanics (→ `build-wallet-and-money`); per-round game state (→ `build-game-flow`).

## Default stack (+ escape hatch)
Default: TS + a small connector module + React `createRoot` for inline mounts. Other shells: any `window.postMessage` transport works for slots; any DOM mount + custom-event bus works for minigames. Keep the host contract (message names, session lifecycle) identical regardless of framework.

## Process
Pick the bridge by game type — these are two different contracts, not variants of one:

1. **Slots → iframe + postMessage connector.** The game lives in an iframe; a connector module brokers balance, bet, and spin across the boundary. On spin, post the bet outward: `PostMessageToParent('spinStart', { bet })`. The parent shell debits, calls the RGS, and posts the result back; the game animates the server-resolved outcome only. Validate the origin of every inbound message before acting on it.

2. **Minigames → inline mount, no iframe.** Mount into the host's `<div>` with `createRoot` — no iframe, no postMessage. Install one global `window.mwgame` exactly once, backed by a private `EventTarget` for game↔host events (guard re-installs so a second mount reuses the existing instance). Read config from the URL query string first, then fall back to the host element's `data-*` attribute.

3. **Session bracketing (both paths).** Open a session at round start (`startGameSession`). On success, animate/complete. On ANY error, call `endGameSession` FIRST — before surfacing the error — so the host never sees a dangling open session. Treat `endGameSession` as the unconditional cleanup in your error path.

## Pitfalls / red flags
- Acting on inbound postMessages without an origin/source check (lets any frame drive the game).
- Installing `window.mwgame` per-mount instead of once → duplicate listeners and leaked `EventTarget`s.
- Letting the client decide the outcome from the bet — the settled result is always the server's; animation is cosmetic.
- An error path that returns without calling `endGameSession` → orphaned sessions, stuck balances.
- Reaching for an iframe in a minigame, or skipping the connector and posting raw messages from slot game code.
- Hardcoding config and ignoring the URL-query-first → data-attr precedence.

## Verification
- Slots: in devtools, a spin emits exactly one `spinStart` with the correct bet; the game renders only what the parent posts back.
- Minigames: `window.mwgame` is installed once (re-mount does not re-create it); config resolves from query string, then data-attr.
- Force an error mid-round and confirm `endGameSession` fires before the error surfaces — no session is left open.
