---
name: math-fixed-odds-event-markets
description: Use when engineers quote simulated-event fixed odds, lock accepted prices, reject stale markets, bound estimated probabilities, price correlated parlays, or audit overround and wallet-unit settlement.
metadata:
  constraints: C4
---

# math-fixed-odds-event-markets

> **Core insight:** A fixed-odds ticket buys an accepted event and price; quote overround describes the book, while true RTP depends on event probabilities, correlations and exact settlement rounding.

## When to use / When NOT

- Use for quoted bets on simulated battles, races, weighted strikes and correlated event legs.
- Use `build-prediction-market-games` for pooled/parimutuel settlement; pool conservation is a different proof.

## Process

1. Freeze the priced event, outcome kernel, information set, ties/voids and betting cutoff. Enumerate finite outcomes/DP, or report sampling and model-error bounds for estimates. MetaWin's production server (MSS) `games/hit-ai-wars/prob.ts` `captureProb` prices battles; `games/hit-ai-wars/outright.ts` `rolloutWinner` estimates war winners. Its `docs/SIM_RESULTS.md` section "The outright book" separates book arithmetic from realized calibration.
2. For gross multiplier m and true probability p, unrounded ticket RTP is p*m. Overround `sum(1/m_i)` applies to an exhaustive mutually exclusive book; it does not establish each ticket's true RTP. Check priceability and error bounds on every side. Refuse impossible quotes or explicitly change the contracted handicap/event. MSS `games/hit-ai-wars/pricing.ts` `priceE4` and `isPriceableTwoWay` expose these checks.
3. Version quotes by event context, model/config revision, selection, tier and price; validate currency grid, expiry and current availability again at execution. Persist the executed price on the receipt. Specify immutable-quote acceptance versus current-price tolerance explicitly. MSS `games/hit-ai-wars/bets.ts` `resolveMarket` checks context/tier/epoch; `games/snakes-hit/index.ts` `wagerPayout` rejects stale fixed quotes but executes current in-play prices within the accepted tolerance.
4. Model joint events rather than multiplying marginal odds. For d independent replacement draws and disjoint leg probabilities q_i, `P(all hit)=sum_S((-1)^|S|*(1-sum_(i in S)(q_i))^d)`. Normalize duplicate/nested implications; reject unsupported partial overlap and zero-probability combinations. Use exact integer/rational arithmetic. MSS `games/world-spin/index.ts` `normalizeCitySets` and `parlayQuote` implement these steps.
5. Lock rational prices and declared rounding per money path. For a wallet-unit floor with stake B atoms, multiplier n/d and unit u atoms, return `u*floor(B*n/(d*u))`; recompute actual RTP at minimum stakes. MSS `games/world-spin/index.ts` `fullReturn` floors to wallet units. MSS `games/hit-ai-wars/docs/GAME_RULES.md` sections "Outright" and "Cash out" specify different held-ticket/cashout rounding; never settle from display odds.
6. Bound worst-case liability before acceptance, including correlated tickets and rounding. For cashout, locked/current executable E4 odds L4/C4 and retention `T6=Math.round(targetRtp*10**6)` give `floor(stakeAtoms*L4*T6/(C4*10**6))`. MSS `games/hit-ai-wars/outright.ts` `outrightCashOutAtoms` applies this to outright tickets; battle/pooled exits need separate contracts. Declare margin `f=1-T6/10**6`; unchanged odds return `floor(stakeAtoms*T6/10**6)`. Verify ratio direction, unavailable quotes and small stakes; no strategy-neutral RTP follows. Use `build-durable-settlement`: debit before the outcome exists, persist one content-bound terminal decision before its money leg, replay identical receipts and conflict on changed content.

## Correctness constraints

- C4: Sample sufficiency requires CI half-width below tolerance at chosen confidence. Bets sharing one event are dependent; use independent event samples or an appropriate clustered analysis.

## Pitfalls / red flags

- Repricing accepted tickets changes promised money.
- Projected probabilities, overround and liability caps do not prove estimator accuracy or true RTP.
- An estimation simulator using a different policy/kernel prices a different event distribution.

## Verification

- Reject stale context/tier/epoch, eliminated selections, expired quotes and unquotable bounds; preserve accepted receipts across repricing/restart.
- Enumerate correlated parlays, nested/overlapping legs, impossible events and wallet-floor boundaries.
- Test concurrent identical/conflicting commands, cashout-versus-settlement races and changed runtime policies; keep probability evidence separate from book arithmetic.
