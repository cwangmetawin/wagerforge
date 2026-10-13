---
name: build-win-presentation
description: Use when building win tiers, currency count-ups, win-line lifecycles or responsive celebration layouts, especially when display totals differ from credited or pending winnings. Keywords win presentation, totalWin, clientWin, big win, count up, win lines.
---

# build-win-presentation
> **Core insight:** Display totals drive read-only celebration; `response.win` is this call's credited amount, while a positive non-terminal `totalWin` may still be pending and lost.

## When to use / When NOT

- Use when choosing tiers, animating count-ups, highlighting wins or laying out celebrations.
- NOT for payout calculation (`build-game-server-rgs`), reel motion (`build-slot-reels-symbols`) or asset packing (`build-asset-pipeline`).

## Default stack (+ escape hatch)

Default: TypeScript + PixiJS/Phaser, Node server, exact integer/decimal money; presentation bands/layouts in config and an injected currency formatter. Other stacks map containers to their display tree and count-ups to their timeline/tween engine. MSS supplies server contracts, not evidence for a particular frontend library or layout schema.

## Process

1. Define an adapter from the game's documented display fields to display amount, increment/history, stake basis and pending/credited status. Keep these separate from `response.win`, the amount credited by that play call. MSS `games/fruitMachine/index.ts` `spin` returns positive `data.totalWin`, `win: 0` and `next: ["gamble", "bank"]`; `gamble` can later forfeit it.
2. Reconcile cumulative display and incremental credits explicitly. MSS `games/zeus/gamePlay.ts` `playMain` stores continuation `win = total - baseWin`, while `totalWin`/`clientWin` remain cumulative. Do not add those totals to the wallet or count the base credit twice. Balance changes come from authoritative wallet responses.
3. Choose the highest eligible band using the documented stake basis: `displayAmount >= threshold * referenceStake`. Configure thresholds and presentation events; handle zero-stake demo play without division. Buy-cost versus unit-stake labels must be explicit. Band flags/schema are application choices, never payout rules.
4. Count from a documented previous display value to the new display target using configured duration. Derive `total - increment` only if that game's contract guarantees it. Label pending/at-risk winnings appropriately; a count-up does not prove settlement. Format every frame through the currency formatter without changing authoritative amounts.
5. Highlight server-reported lines or symbol events: show, hold, hide; sequence cascades/cluster events according to the response. Hold/loop timing comes from presentation config unless the server contract supplies it. Do not infer or recalculate payline awards.
6. Use immutable orientation layouts and cancel/reset count-ups, highlights and listeners on interruption. Skip finishes visuals only; continuation/terminal handling belongs to `build-game-flow`.

## Pitfalls / red flags

Calling every positive total settled; balance updates from animated numbers; universal `totalWin` semantics; wrong stake denominator; treating band transitions as betting actions; assuming all games send timing or winning lines.

## Verification

Cover pending positive total followed by loss/bank, cumulative total with incremental credit, band edges, demo/buy stake bases and currency precision. Assert presentation never mutates response money or triggers wallet credit. Verify final strings, highlight cleanup, skip endpoints and portrait/landscape layouts in the client; MSS server tests alone cannot prove these visuals.
