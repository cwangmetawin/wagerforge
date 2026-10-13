---
name: build-wager-limit-admission
description: "Use when admitting a stake: currency and precision locks, worst-case liability and maxExposure, per-chip versus per-spot limits, minimum and maximum bet, wallet-grid admission before RNG, auto cash-out targets and clamps."
metadata:
  pillar: build
---

# build-wager-limit-admission

> **Core insight:** Recheck queued debits in tick order before new RNG; booked tickets keep contracted price and payout despite missing limit metadata.

## When to use / When NOT

Use for admission; undo/seats: `build-live-table-operations`; money: `build-wallet-and-money`.

## Default stack

TypeScript + PixiJS/Phaser + Node, exact integer/decimal money; other stacks map grids and admission.

## Process

1. **Denomination:** first accepted stake locks currency/precision; later stakes match, rejects adopt nothing. Release only with no open tickets, cash traces or liabilities. Round lock survives empty unboarding/restaking until settlement; market closed outright cash traces persist until war end. Life protocol fixes tier stake, one open life/player; new epoch requires no lives, nonnegative ledger and debited=credited+house. MetaWin's production server (MSS) `games/hitShooter/state.ts` `closeEpoch`; MSS `games/hitShooter/lives.ts` `checkLife`. Resolve currency command→player memory→configured room; precision carried grid→currency→default. Carried-only limits are compatibility policy: MSS `games/hitCrashers/stakes.ts` `resolveMoney`, `checkMain`: gross stake*MAX_RETURN_MULTIPLE; later missing limits never void booked tickets. Pending debits still face tick rechecks/refunds: MSS `games/hitCrashers/commands.ts` `drainMain`. Other paths use trusted config fallback (MSS `games/hit-ai-wars/bets.ts` `validateWager`) or require authenticated opening grids (MSS `games/highLowHit/index.ts` `startRound`). Verify missing metadata/early unlock/rechecks.
2. **Liability:** include candidate in every ceiling; reject rather than clip winnings. Sum player's open maximum gross returns without offsetting opposite selections: stored prices or declared maximum multiple; pools re-estimate grown−floor(grown*rakeE6/1,000,000). MSS `games/hit-ai-wars/bets.ts` `maxReturnAtoms`. Each alive market outcome/context includes locked returns plus closed cash returns minus all accepted stakes, retaining closed stakes/returns: MSS `games/hit-ai-wars/liability.ts` `marketExposure`. Recheck multi-hand opening/Double/Split: naturals/surrenders separately, bust/inactive zero. Continuation cap=floor_grid(min(relative,absolute,exposure)); opening N*stake<=cap, risk only while pot<=floor(cap/N), otherwise pay after success; N is maximum step multiple. Overrides exceeding manifest return allowance disable affected stakes; derive ceilings from actual returns, strictest shared action/category cap: MSS `games/blackjack-live/config.ts` `clampStakeCap`. Composite bets enumerate each pocket's combined return, reduce/grid-floor stake ceiling to fit static payment ceiling; preserve accepted payouts. MSS `games/roulette-live/index.ts` `clampCallToDeclaredCeiling`. Verify candidate/pool/topology changes.
3. **Scopes:** declare scope per protocol: platform range per chip. Table first-chip-only minimum and accumulated spot maximum: MSS `games/baccarat-live/index.ts` `server.tick`; MSS `games/roulette-live/index.ts` `server.tick`. Every-chip minimum, accumulated main maximum=min(platform,table): MSS `games/blackjack-live/commands.ts` `validateCommand`. Every-chip minimum, platform per-chip/table per-spot maxima: MSS `games/blackjack-table-live/index.ts` `server.tick`. Paid continuations meet original and supplied current minimums/main maxima; positive explicit bonus maxima bind; saved exposure only tightens. Independent allowances count held SINGLE legs versus PARLAY tickets; undo frees corresponding capacity: MSS `games/world-spin/index.ts` `roundAllowanceUsage`. Verify add-ons/rejected allowance use/omitted-or-zero bonus limits/changed grids.
4. **Grid policies:** before RNG, nonzero stakes meet minimum/grid, one handBet/seat; aggregate debit equals exact sum; inactive zero seats get no cards/settlement. Strict paths require every possible stake×multiplier exactly divisible before rounding, then currencyUnit/exposure checks; reject whole opening on failure: MSS `games/hitDraw/gameLogic.ts` `prepareOpenPack`. Declared rounding paths value actual rounded returns: MSS `games/blackjack-multi-hands/state.ts` `payoutAtoms` floors. Supplied limits require exact safe wallet atoms; no-limits legacy normalizes base/returns to fifteen significant digits, but piercing still requires valid wallet grid: MSS `games/giftBox/index.ts` `baseStakeFor`, `splitPiercingStake`. Verify grids/scaling/no rejected draws.
5. **Auto policies:** continuous server grid missing/null/zero means none; nonnumeric/nonfinite rejects; minimum/grid reject before maximum clamp. Manual 1.00 cash-leg multiplier is legal; declare net/gross base and credit timing: MSS `games/hitCrashers/stakes.ts` `autoX100`. Ladder invalid/nonpositive means manual; positive selects first rung>=target, above-top clamps, never interpolates: MSS `games/skyfall/index.ts` `server.tick`; MSS `games/skyfall/gameLogic.ts` `resolveTargetArc`. Verify exact/between/above/manual.

## Pitfalls / red flags

Netted exposure; clipped wins; early unlock; post-RNG rejection.

## Verification

Test cap/grid boundaries and per-route rejection order.
