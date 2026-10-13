---
name: math-plinko-lottery
description: Use when pricing Plinko buckets and ball multipliers, card draws with replacement where only all-distinct cards win (unique-card Blitz) and the multiplier for a target RTP, keno matches, replacement-draw occupancy, or weighted wheel, case, and pack returns. Keywords binomial, hypergeometric, birthday or collision probability, occupancy, cumulative probability, lottery.
---

# math-plinko-lottery

> **Core insight:** Price the actual winning event, draw contract, and complete paid return; jackpots consume EV budget, and multiplied expectations require proven independence without binding caps.

## When to use / When NOT
- Use for discrete/weighted draws and compound Plinko returns.
- Reel slots: `math-rtp-modeling`; continuous targets: `math-crash-family`.

## Process
1. **Contract.** Fix replacement/nonreplacement, draw count, winning event, variant and per-item/purchase multipliers. Normalize gross return by charged stake; settle exact atoms with explicit quantization and audit production rounding.
2. **Plinko.** Independent fair pegs give `P(k)=C(rows,k)/2^rows`; budget `sum(p_k*m_k)`. MetaWin's production server (MSS) `games/plinko100k/index.ts` `rollBucket` uses its binomial CDF. A jackpot increment costs EV `p*delta`. MSS `games/plinko100k/myRtp98MathConfig.ts` `winMultipliers`, `ballWeights`, `maxWinCap` combine 1000x bucket and 100x ball: maximum multiplier, unlike absolute currency floors (`math-guaranteed-payout-floor`).
3. **Compound draws.** Factor expectations only with independence and nonbinding caps/rounding; otherwise sum settled joint returns. MSS `games/plinko100k/index.ts` `settle` separately draws bucket/ball then caps their product; MSS `games/tarot/index.ts` `playTarot` multiplies three draws. For uniform mutually-exclusive lanes independent of shared M, `EV=sum(stakes)*base*E[M]/lanes`; payouts remain correlated. Verify allocations/rounding (MSS `games/regattaRivals/index.ts` `main`). Independent landing reward L and scoring-gated coin sum C give `E[L]+P(score)*E[C]`, not unconditional coin EV; retain miss draws, test landing tables/boosted charged stake (MSS `games/flockShot/gameLogic.ts` `totalMultiplierOf`). Rung features require `P(rung)*P(feature|rung)`: distinguish multiplication, saturated shifts, capped boosts and replacement jackpots; test zero/positive/top rungs and conditional tier-draw counts (MSS `games/captainCannonCashFlight/resolver.ts` `resolveRound`).
4. **Nonreplacement matches.** Uniform distinct d from N, p player picks: `P(k)=C(p,k)*C(N-p,d-k)/C(N,d)`. Include zero losses/all feasible counts; this hypergeometric model excludes replacement.
5. **Unique wins.** Independent 52-card replacement draws give `q_n=product((52-i)/52,i=0..n-1)`; price all-unique at `targetRTP/q_n`; use `1-q_n` only for contracted duplicate-wins. MSS `games/blitz/index.ts` `drawAllCards`/`main` pay duplicates zero; recalculate quantized RTP.
6. **Occupancy.** Track joint lit cells; repeats add none. MSS `games/deck52/gameLogic.ts` `playDeck52` uses 60 replacement draws, `countCompletedRows`/`countCompletedColumns`, not hypergeometric matches. Include overlaps/caps.
7. **Weighted/additive.** CDF mass `p_i=F_i-F_(i-1)`, `F_(-1)=0`; case EV `sum(p_i*m_i)`, five-item pack `5*sum(p_i*m_i)` before settlement transforms. MSS `games/cases/index.ts` `openCase`; MSS `games/packs/index.ts` `openPack`/`main`. Variant probabilities differ; MSS `games/ringOfFortune/index.ts` `drawColor` is weighted, uniform wheels require equiprobable slots. Value-blind selections from iid rewards pay `stake*sum(rewards)/count`, aggregate rounding only; distinct locations cannot prove independence. Test counts/order/indivisible stakes (MSS `games/bomberRun/gameLogic.ts` `playMain`). Symbol-then-uniform-position wheels need conditional mean position multipliers plus complete bonuses; calibrate/test every wagerable symbol and integer-weight residual before claiming allocation invariance (MSS `games/fruitMachine/gameLogic.ts` `pickLampOfType`; retriggers: `math-cascade-tumble`).

## Pitfalls / red flags
- Fixed variant probabilities, animation-based independence, omitted loss mass/multiplicity/stake allocation/caps.

## Verification
- Normalize probabilities; fixture duplicates/uniques, CDF boundaries, occupancy and caps.
- Recompute shipped EV per variant/risk/draw-count/stake; compare production-settled simulations/CIs via `math-montecarlo-simulation`.
