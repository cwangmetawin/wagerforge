---
name: math-forced-outcome-shaping
description: Use when a feature or round is forced by replay, including regenerate-until-accepted bonuses (guaranteed zero win, minimum pay, special symbol), bounded retry budgets and fallbacks, dead-board refills, state aliasing or snapshot bugs in retries, and per-wave forcing probability schedules. Keywords reject, replay, force dead spin, guaranteed gold, attempt budget, exhaustion, acceptance test.
metadata:
  pillar: math
---

# math-forced-outcome-shaping

> **Core insight:** Forcing defines a law through fixed state, acceptance, budget, fallback and decision schedule; its RTP must be recomputed.

## When to use / When NOT

- Use for conditioned features, bounded forcing, retry isolation and forcing schedules.
- Retry algebra: `math-volatility-tuning`; cascades: `math-cascade-tumble`; buy pricing: `math-feature-buy-and-jackpot`.

## Process

1. **Regenerate until accepted.** Fix conditioning state (route, model/action, entry, hidden state, sampled entry values); redraw the whole feature/round, including sub-features, without extra stake until zero win, minimum pay or special-symbol acceptance. Sample forcing-entry decisions and threshold uplifts once; draw candidate-specific upper-band rejection afresh per attempt. MetaWin's production server (MSS) `games/tothetop/index.ts` `server.play` samples forced-zero entry once, replays complete main rounds until zero; MSS `games/maneater/index.ts` `tweakFreeGameCap` samples uplift once; MSS `games/maneater/gamePlay.ts` `playMain` redraws features and upper-band tests. MSS `games/discodazzle/gamePlay.ts` `playCoinGame` fixes entry count, stops and values before gold-conditioned bonus replays; ordinary buys do not condition. MSS `games/tartarus/gameLogic.ts` `loadBaseGame` fixes model/action, redraws opening boards until OAK cash is zero, retains accepted scatters, unbudgeted. Verify positive acceptance for every reachable fixed state, termination and conditioned RTP; independent attempts average 1/acceptance.
2. **Bounded search.** Declare budget and fallback: last candidate or normal draw. Exhaustion can retain real wins; a finite budget alone guarantees nothing. MSS `games/goldDiggers/gamePlay.ts` `playBuyBonus` deep-clones entry per attempt, returns the last after 10,000 attempts. MSS `games/perseus/gameLogic.ts` `loadBaseGame` restricts forced non-win openings to two reels and the regular feature, skips forcing when both retained reels hold wilds, searches bounded legal windows, then spins normally; earlier restrictions persist. MSS `games/zeus/gameLogic.ts` `applyForcedStop` draws armed guards only on winning refills, short-circuits at first hit, advances cursors from accepted gravity and retains real wins after 50 retries; never erase visible wins. Verify exclusions, guard order, exhaustion, continuation rate and RTP.
3. **Immutable snapshot.** For independent rejection, deep-clone entry per attempt and restore rejected state; production retries consume fresh RNG. MSS `games/sweetyCluster/gameLogic.ts` `loadFreeGames` fills normally if survivors win; otherwise retries single-cell refills from one accepted gravity snapshot, falling back to normal stacks after 20 attempts. MSS `games/riseOfTheWolf/gameLogic.ts` `loadFreeGames` also restores rejected surge state. Shared mutations can inflate later payouts: MSS `games/discodazzle96/gamePlay.ts` `playCoinGame` shares entry coins mutated by bonus multipliers; reproduce this dependency for legacy RTP audits, then verify isolation before adopting independent rejection. Chained rejection changes the law: MSS `games/sugarRush/gameLogic.ts` `loadFreeGames` carries post-removal gravity forward, unpaid, without adopting rejected multiplier upgrades, unbudgeted. Measure its termination separately. Verify entry immutability and identical results from the same snapshot plus explicit RNG tape; independent formulas do not price unspecified mutation transitions.
4. **Schedule.** Declare a gate per decision point after a winning wave, never before the first win. Combine wave-indexed base probability (waves paid, clamped to last entry) and last satisfied maximum-grid threshold bonus, replacing lower bonuses; cap then sample once: MSS `games/sweetyCluster/gameLogic.ts` `loadFreeGames` caps at 0.98. Verify thresholds, saturation and pre-win silence.

## Pitfalls / red flags

Resampling forcing-entry gates; mutable production entries; assuming forced RTP equals unforced RTP.

## Verification

Enumerate acceptance, exhaustion, accepted scatters and conditioned RTP; mutation-test isolation and rollback.
