---
name: math-slot-evaluation-rules
description: Use when agents specify or audit slot evaluation policies. Keywords wild run, all-wild prefix, wild multiplier, scatter pay, connected ways, dead-end pruning, free spins trigger, retrigger count, expanding symbol, continuation response, bought entry, bonus buy, cumulative versus incremental win, gamble, double-up.
metadata:
  pillar: math
---

# math-slot-evaluation-rules
> **Core insight:** Declare symbol roles, counting boundaries and payment contracts; inherited defaults change payouts or duplicate credits.

## When to use / When NOT

Use for payout, trigger, continuation and gamble contracts. Evaluators: `math-lines-ways-cluster`; loops: `math-cascade-tumble`; sampling: `math-slot-board-state-rules`.

## Process

1. **Wild policy:** declare leading-wild eligibility per mode. MetaWin's production server (MSS) `games/bookOfDead/gameLogic.ts` `detectPaylineWins` counts leading wilds; the first ordinary symbol sets payment. MSS `games/tothetop/gameSet.ts` `winDetection` (base) pays nothing on wild/scatter/coin starts. Compare prefixes only under an explicitly declared larger-pays policy; never add them. All-wild runs pay the wild table or each otherwise-unpaid ordinary symbol; ways multiply reel wild counts. Declare minima/two-reel eligibility; MSS `games/tothetop/gameSet.ts` `loadFreeGames`, `checkExclusiveWild` restricts enabled two-reel awards to one designated top symbol. Connected all-wild groups may pay every ordinary table; flags add nothing. Collector-only ways pay no cash. Verify exclusions, multi-symbol payments, no double-counting.
2. **Scatter policy:** scatter-only symbols interrupt, never substitute; dual wild/scatters retain line-wild behavior. Count original-board scatters before substitution/expansion; add cash to lines and evaluate entry/retrigger independently, or declare cash-only/no-feature. MSS `games/bookOfDead/gameLogic.ts` `getGameView`. Verify interruption, additivity, trigger counts.
3. **Connected policy:** offsets −1,0,+1. MSS `games/barValhalla/gameLogic.ts` `detectConnectedBetwayWins` requires R1 right neighbor, R2 connected left plus R3 right neighbor, R3+ connected left; retains forward dead ends. Split only when connected rows 1/3 exist on both R1/R2 and row 2 is absent on R1–R3 (zero-based); sum groups even with shared later cells. Declare pruning/multiplier order: MSS `games/piggyBank/gameLogic.ts` `detectConnectedBetwayWins` reads maximum before backward-pruning counts. Verify high-tier dead ends, splits/shared cells.
4. **Entry policy:** declare initial/terminal board, at-least/exact threshold, phase strips/tables, award limits, priority/additivity. Accepted-initial policies exclude continuation cash/triggers and keep scatter cash unmultiplied; initial rounds may be weighted draws conditioned on action/scatter count: MSS `games/perseus/gameLogic.ts` `loadFreeGames`. Moving mode retriggers from each trigger-spin table; random-jump keeps entry rounds; nested moving/jumping respin scatters award no free spins: MSS `games/barValhalla/gameLogic.ts` `loadMultiplierFreeGames`, `loadRandomJumpFreeGames`. Collection-priority policy suppresses scatter entry/retrigger; additive policy evaluates coin and exact-scatter triggers independently. Per-scatter free-game policy adds one per initial scatter without grouped threshold/base Bernoulli gate. Terminal examples: MSS `games/sugarRush/gameLogic.ts` `loadBaseGame` has zero scatter cash; below-threshold awards are zero. MSS `games/metaStrike/gameLogic.ts` `loadFreeGames` activates by threshold without random meter, awards from final count. Both count losing terminals/reset each spin. Retriggers extend the same group using feature strips. Verify modes, competing features, thresholds.
5. **Expansion policy:** draw one weighted ordinary symbol at entry, unchanged through retriggers; only actual occurrences expand reels. Count expanded reels regardless of gaps; lookup/pay once per line, add separately. MSS `games/bookOfDead/gameLogic.ts` `calculateExpandingWin`, `loadFreeGame`. Verify identity/separated-reel counts.
6. **Response contract:** declare cumulative/incremental; credit amounts once; reconcile aggregate liability and natural/bought totals. Legacy MSS `games/barValhalla/gamePlay.ts` `playFreeGames` repeats base, caps segments separately, only flags aggregate; truncation leaves top-level win. MSS `games/cetusOnly/gamePlay.ts` `playFreeGames` double-includes bought scatter, natural once; MSS `games/tartarusStream/gamePlay.ts` `playMain` stores capped base+feature. Wallet credit semantics unverified; never copy double-inclusion unaudited. Verify deltas/aggregate caps.
7. **Gamble policy:** declare eligibility/payment/horizon. MSS `games/fruitMachine/index.ts` `spin`, `gamble` admit only positive ordinary wins; bonuses settle immediately. Success updates pending; pay at bank or auto-bank on configured last gamble. Round-count horizon is stake-independent, without currency-ceiling gating. Verify zero/bonus/direct routes, one credit.

## Pitfalls / red flags

Substituting scatter-only symbols; copying legacy accounting unaudited.

## Verification

Replay declared policies and reconcile settled money.
