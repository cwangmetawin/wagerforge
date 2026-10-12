---
name: math-table-game-edge
description: Use when agents derive table-game RTP or house edge from fixed odds, payout tables, profit versus gross returns, pushes, ties, commissions, caps, or strategy-dependent Blackjack stakes.
metadata:
  constraints: C4, C14
---

# math-table-game-edge

> **Core insight:** House edge is computed from gross return per actual stake: pushes return principal, commissions alter winning return, and strategy or bankroll accounting can change the relevant denominator.

## When to use / When NOT
- Use for discrete payout EV, per-bet-type edge and declared stake-weighted blends.
- Not for cash-out targets (`math-crash-family`) or slot encoding (`math-paytable-config`). Bankroll-run and live-table action lifecycles use `build-bankroll-run-games` and `build-live-table-games`.

## Process
1. Define gross return `X = returnedAmount / actualStake`, including returned principal; loss is 0 and push is 1. Profit odds `a:1` imply winning gross return `a+1`. MetaWin's production server (MSS) `games/sicbo/gameLogic.ts` `settleBet` returns profit/loss; MSS `games/sicbo/index.ts` `server.tick` converts winning profit into stake-plus-profit credit.
2. Enumerate outcomes for each bet type: `RTP = Σ pᵢXᵢ`, `edge = 1-RTP`. For a binary loss/win bet, gross multiplier `M=T/p` targets RTP `T`; with push probability `q`, use `M=(T-q)/p`. Additional return atoms require the full sum. MSS `games/sicbo/rtp98.ts` `config` uses profit odds: small/big RTP is `105/216 × 2`, not `105/216 × 1`.
3. Include ties and commission in each affected bet's outcomes. MSS `games/baccarat-live/engine.ts` `settle` pushes player/banker bets on ties and returns principal plus commission-adjusted winnings on banker wins. Banker RTP is `pBanker×grossBankerReturn + pTie`; the separately wagered tie bet has its own paytable.
4. Compute caps, commission and rounding using exact integer money atoms and declared rational factors. Measure at minimum and representative stakes; winning return can depend on the wallet grid. Apply gross caps before normalizing returned atoms to `X`. Blend bet types using actual stake shares, not equal weights or a marketing headline; shared outcomes affect variance even when EV sums.
5. Pin Blackjack rules and player policy: RTP is strategy-dependent. Count Double/Split as additional paid stakes. Variable-cost strategy RTP is `Σ returns / Σ stakes`, with a ratio-estimator CI (`math-montecarlo-simulation`), not mean per-hand ratios. MSS `games/blackjack-multi-hands/index.ts` `server.play` routes these actions to `doubleDown`/`splitHand`; debit encodings and legality belong to the dedicated table-game skill.
6. Separate per-stake return `Σ internalReturns / Σ internalStakes` from surviving-bankroll/committed-bankroll return. Returning unspent bankroll is not game return. MSS `games/baccarat-1000/index.ts` `PerStakeReturn` tracks the former separately; bankroll-run games use `build-bankroll-run-games`.

## Correctness constraints
- **C4:** Sample size must meet confidence/tolerance requirements. Validate each bet type and declared blend against theory with the appropriate mean or ratio CI; acceptance requires `abs(estimate-target)+CIhalfWidth<=tolerance` and `n>=requiredN`, not merely target inside CI.
- **C14:** Bind results to the resolved behavioral variant; switch only among pre-certified variants and display active economics. New payout, probability or rule changes require math-model change review.

## Pitfalls / red flags
- Mixing profit with gross credit, omitting pushes, or counting commission as a separate wager.
- Adding an undeclared post-outcome rejection gate to an already edged paytable.

## Verification
- Retain exact win/loss/push, commission, cap and paid-action fixtures with source/config/strategy provenance.
- Compare exhaustive EV with actual server settlement and `qa-math-validation`; report per-type, stake-weighted and bankroll metrics separately.
