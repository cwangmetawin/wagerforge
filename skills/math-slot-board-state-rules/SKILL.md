---
name: math-slot-board-state-rules
description: Use when agents specify or audit how a slot board is sampled and carried across spins, waves and respins. Keywords reel strip, stop index, circular window, cascade refill cursor, tumble refill, landing odds, conditional table, latent tier, hidden option, multiplier floor, start offset, wild injection, scatter injection.
metadata:
  pillar: math
---

# math-slot-board-state-rules
> **Core insight:** Sampling dependencies, reference boards and state lifetimes determine the paid distribution; temporary offsets never become persistent floors.

## When to use / When NOT

Use for board sampling/state. Payouts: `math-slot-evaluation-rules`; loops: `math-cascade-tumble`; modifiers: `math-cascade-modifiers`; respins: `math-hold-and-win`.

## Process

1. **Stops/refills:** for strip sampling, draw one independent uniform stop per reel; read consecutive positions with wraparound. Strips and normal/special value tables follow action/phase, including respin strips. MetaWin's production server (MSS) `games/tothetop/gameSet.ts` `gameView`; MSS `games/fruitNudge/gameLogic.ts` `getGameView`; MSS `games/coins/gameLogic.ts` `getGameView`. Declare cursor refill or weighted redraw: MSS `games/tartarus/gameLogic.ts` `getNextWave`; MSS `games/metaStrike/gameLogic.ts` `getNextWaveWeighted`. Verify joint windows, retained cursors/vacancy order/wraparound and no independent redraws under cursor policy; weighted policy verifies configured stacking, correlations and redraw law.
2. **Reference board:** declare pre-overlay/original versus live conditioning: freeze landing odds at pre-respin occupancy (MSS `games/tothetop/gameSet.ts` `loadCoinGame`) or recompute before each empty cell (MSS `games/goldDiggers/gameLogic.ts` `loadCoinGame`). MSS `games/goldDiggers/gameLogic.ts` `runNuggetCollect` retains original regular/special coins, clears others, tests each blank once using original regular-Nugget count (specials excluded), last-entry saturation; landings never update that index. Singleton/stack value tables use original strip-window coin count; covered coins affect sampling, not collection. MSS `games/barValhalla/gameLogic.ts` `getGameView`, `loadBaseGame`: at each new-wild draw, a reel already holding a multiplier wild (survivor or earlier arrival this spin) forces normal (1x); otherwise action/spin type tables saturate at last row. Arrivals use pre-respin future tier; any new-gold spin advances it once for future arrivals only. Verify several same-reel landings, covered cells, unchanged survivors.
3. **Latent state:** declare lifetime; freeze entry layout/tier/option/model throughout that feature; decisions/respins never redraw it. Spin-scoped escalation models follow step 4. MSS `games/deepDelve/gameLogic.ts` `dealShaft` samples each cell independently/uniformly from row-allowed kinds and each column chest independently/uniformly once from its value set; MSS `games/deepDelve/index.ts` `open` resolves opening digs atomically with first reveal. Already-public state stays public. MSS `games/allaboutthefish/gamePlay.ts` `playMain`: natural-round option jointly selects value/entry-odds tables through free games; original visible value-symbol count selects singleton/stack. MSS `games/coinUp/gameLogic.ts` `playBonus`: bonus-entry tier selects landing/UP tables throughout, never per-cell/per-respin. Verify pinned draw order, joint dependence, no rerolls.
4. **Escalation modes:** declare start/floor/wave caps. MSS `games/tartarus/gameLogic.ts` `loadFreeGames`: resample model each spin, offset in selected jump model; start=min(floor+offset,configured start cap), winning waves climb to ladder top. Terminal scatters (2+) raise floor by one step per spin, capped at configured floor cap; it persists from next spin through feature end. Retriggers are separate. Its inspected 16-rung variant caps start/floor at 11. MSS `games/tartarus/gameLogic.ts` `loadUpgradingFreeGames`: likewise resamples model/offset per spin; start/floor cap is last rung; pay each winning wave, then any qualifying wild increments persistent index once per wave; recompute min(floor+offset,last). No wave-count/scatter upgrades. Discard offsets in both modes. Verify multi-spin floor persistence, one-step scatter leveling, per-wave wild upgrades, pay-before-upgrade, mode-specific caps.
5. **Injection law:** declare per-reel limit (e.g. one wild/scatter), uniform initial eligible-cell selection, mode/action/wave tiers and cutoff. Cascades inject uniformly only into new vacancies on reels without retained specials. MSS `games/tartarus/gameLogic.ts` `getNewGameView`, `getNextWave`; MSS `games/metaStrike/gameLogic.ts` `getNextWaveWeighted`, `loadBaseGame` disables injection beyond `scatterMaxWave`. Declare inter-reel dependence before multiplying no-hit probabilities. Verify gravity retention, cutoff boundary, base/free eligibility.

## Pitfalls / red flags

Redrawn tiers; offsets persisted as floors; conflated modes.

## Verification

Replay draws and reference-state snapshots.
