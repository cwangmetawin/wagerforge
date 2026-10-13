---
name: math-plinko-lottery
description: Use when pricing Plinko buckets and ball multipliers, unique-card Blitz, keno matches, replacement-draw occupancy, or weighted wheel, case, and pack returns. Keywords binomial, hypergeometric, birthday probability, occupancy, cumulative probability, lottery.
---

# math-plinko-lottery

> **Core insight:** Price the actual winning event, draw contract, and complete paid return; jackpots consume EV budget, and multiplied expectations require proven independence without binding caps.

## When to use / When NOT
- Use for discrete draw distributions, weighted lotteries, and compound Plinko returns.
- Not for reel slots (`math-rtp-modeling`) or continuous crash targets (`math-crash-family`).

## Process
1. **Fix the contract.** State replacement versus nonreplacement, draw count, winning event, resolved variant, and whether multipliers are per item or entire purchase. Normalize gross return by actual charged stake. Settle money with exact integer atoms and an explicit quantization rule; audit production rounding separately.
2. **Plinko.** A specified fair independent peg-walk has `P(bucket=k)=C(rows,k)/2^rows`; solve `sum(p_k*m_k)` against the budget. MetaWin's production server (MSS) `games/plinko100k/index.ts` `rollBucket` implements its binomial CDF. Increasing payout by `delta` at probability `p` increases EV by `p*delta`; a jackpot is never free. MSS `games/plinko100k/myRtp98MathConfig.ts` `winMultipliers`, `ballWeights`, and `maxWinCap` produce the 1000x bucket times 100x ball headline: a maximum multiplier, distinct from a slot's absolute currency floor (`math-guaranteed-payout-floor`).
3. **Compound draws.** `E[bucket*ball]=E[bucket]*E[ball]` only with proven independence and no binding cap/rounding. Otherwise sum the joint distribution of settled returns. MSS `games/plinko100k/index.ts` `settle` draws separate bucket/ball values and caps their product. MSS `games/tarot/index.ts` `playTarot` multiplies three card draws; verify independence before factorizing.
4. **Without-replacement matches.** For population `N`, player picks `p`, and uniform distinct draw count `d`, `P(k)=C(p,k)*C(N-p,d-k)/C(N,d)`. Include zero-match losses and every feasible match count. This hypergeometric keno model does not describe replacement draws.
5. **Unique wins.** For independent replacement draws from 52 cards, `q_n=product((52-i)/52, i=0..n-1)`. Price an all-unique win as `multiplier=targetRTP/q_n`; use `1-q_n` only for an explicitly duplicate-wins product. MSS `games/blitz/index.ts` `drawAllCards` and `main` pay zero on duplicates; recalculate actual RTP after multiplier quantization.
6. **Occupancy.** Track the joint lit-cell state for row/column completion; repeated hits do not add cells. MSS `games/deck52/gameLogic.ts` `playDeck52` uses 60 replacement draws and `countCompletedRows`/`countCompletedColumns`, not hypergeometric matches. Include overlapping completions and caps.
7. **Weighted/additive returns.** For CDF entries use `p_i=F_i-F_(i-1)`, with `F_(-1)=0`. Case RTP is `sum(p_i*m_i)`; a five-item pack pays `5*sum(p_i*m_i)` before settlement transforms. MSS `games/cases/index.ts` `openCase` uses weights; MSS `games/packs/index.ts` `openPack` draws five and `main` adds their multipliers. Probabilities can change by variant. MSS `games/ringOfFortune/index.ts` `drawColor` is weighted; uniform-wheel math requires equiprobable slots.

## Pitfalls / red flags
- Fixed-probability claims across variants; independence assumed from separate animations.
- Omitting loss mass, draw multiplicity, stake allocation, or cap effects.

## Verification
- Assert normalized probabilities; deterministic duplicate/unique, CDF-boundary, occupancy, and cap fixtures.
- Recompute shipped paytable EV per variant/risk/draw-count/stake; compare production-settled simulations and confidence intervals using `math-montecarlo-simulation`.
