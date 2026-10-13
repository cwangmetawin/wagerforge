---
name: math-cascade-modifiers
description: Cascade modifiers, wild tiers, persistent meters, chests, orbs, and detonation policies. Use when modeling orb multiplier, bomb, square, blast, tumble multiplier, wild downgrade, or continuation quota.
metadata:
  pillar: math
---

# math-cascade-modifiers
> **Core insight:** A modifier's lifetime, activation gate, and payment boundary define its mathematics; visible values and persistent carry alone do not authorize a multiplier.

## When to use / When NOT

- Use for state and award modifiers inside cascades.
- For evaluation, loops, and moving collectors see `math-lines-ways-cluster`, `math-cascade-tumble`, and `math-moving-wild-collection`.

## Process

1. **Wild tiers:** substitute every tier; after a qualifying evaluation remove regular wilds, apply gravity, then downgrade survivors. Do not delete higher tiers or downgrade dead boards. Check lifetime chains and overlapping wins. MetaWin's production server (MSS) `games/medusa/gameLogic.ts` `detectWin`. Preserve pre-downgrade evidence; pay before persistent upgrades. Specify exact-tier versus minimum-tier triggers and carry: MSS `games/zeus/gameLogic.ts`, `games/medusa/gameLogic.ts` `loadUpgradingFreeGames`; verify qualifying tiers and no retroactive repricing.
2. **Meters:** separate wave number, transient wild factors, and persistent level. Advancement may require wild-assisted wins or zero-pay special-wild landings; pay before advancing. Separate spin-only any-win progression and jumps from a scatter-raised persistent floor. Reset transient wild factors before shifts; wave number is not meter level. Verify no-wild wins, zero-pay landings, and next-spin state: MSS `games/cetusOnly/gameLogic.ts` `loadBaseGame`, `games/perseusCetusOnly/gameLogic.ts` `loadFreeGames`, `loadRushFreeGames`.
3. **Chests:** pay edge chests on qualifying winning waves, then surviving chests at feature end; exempt both from wave multipliers. Collecting again during reel shifts duplicates awards. Verify shifts, survivors, and summed payments: MSS `games/perseus/gameLogic.ts` `loadBaseGame`.
4. **Final-board orbs:** preserve orbs through tumbles; multiply accumulated spin wins once by their terminal sum, defaulting to one. Summing visible orbs per wave double-counts survivors. Check late arrivals, absent orbs, zero wins, and cap order: MSS `games/bloodMoonRising/math/engine/round.ts` `playRound`.
5. **Carry gates:** award-qualified carry adds terminal orbs only on positive-award spins, including scatter pay, and applies accumulated carry only when that spin has orbs: MSS `games/gates/gameLogic.ts` `loadFreeGames`. Activation carry adds only active contributions from winning waves and multiplies the spin only if carry increased: MSS `games/sweetyTreaty/gameLogic.ts` `loadFreeGames`. Check losing orb spins, orb-free wins, inactive announcements, and terminal losing waves; old carry alone never qualifies.
6. **Bombs/squares:** bombs trigger columns per wave; squares are positional overlays. Add squares before overlap checks, allowing same-wave detonation. Declare base-spin reset versus feature-wide persistence; conflating lifetimes changes triggers. Check tease events and cross-round overlays: MSS `games/metaStrike/gameLogic.ts` `applyBombsAndSquares`, `loadFreeGames`.
7. **Blasts:** band draws by unique in-bounds nonimmune blast cells; sample one replacement symbol for the entire footprint and re-evaluate. Apply the blast factor once to the whole resulting wave win, preserving base-pay descriptors; discard it afterward. Counting overlaps inflates bands; carrying factors misprices later waves. Check overlaps, edges, scatter holes, immune footprints, band boundaries, multiple clusters, and the next wave: MSS `games/metaStrike/gameLogic.ts` `detonateSquares`, `applyBlastMultiplier`.
8. **Continuation:** distinguish soft targets from quota-driven continuation; opening redraws, detonation retries, and no-win continuation have finite budgets. Targets are not guarantees. Dead starts can lapse quotas; restore rejected boards, overlays, and events. Verify mode flags and exhaustion: MSS `games/metaStrike/gameLogic.ts` `loadBaseGame`; retry math belongs to `math-volatility-tuning`.

## Correctness constraints

- Apply the path-dependent model requirements in `math-cascade-tumble`.

## Pitfalls / red flags

- Treating cosmetic values, surviving overlays, or quota names as unconditional awards.

## Verification

- Freeze pre-payment, post-payment, transition, and terminal states in deterministic fixtures; reconcile each award once.
