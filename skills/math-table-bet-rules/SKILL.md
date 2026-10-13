---
name: math-table-bet-rules
description: Use when implementing or auditing table-bet rules, including baccarat card values, naturals and the Player/Banker third-card tableau, Banker 0.95 commission rounding per chip and minimum stake, Player/Banker pair side bets, roulette split, street, corner and six-line adjacency, zero splits, Voisins, Tiers and Orphelins announced bets, la partage or en prison, and Sic Bo small, big, odd, even, triple, pair, total, combo and number bets.
metadata:
  pillar: math
---

# math-table-bet-rules

> **Core insight:** Winning predicates, rounding boundaries and declared policies determine each chip's gross return.

## When to use / When NOT

Use for table-bet settlement; for edge see `math-table-game-edge`, lifecycle `build-live-table-games`, progressions `math-betting-progressions`.

## Process

1. **Card tableau:** ace=1, ten/faces=0, total modulo 10; deal Player/Banker/Player/Banker. Either side's two-card 8/9 stops drawing; Player draws on 0–5. Banker draws on 0–2; on 3 unless Player's third-card value is 8; on 4 if 2–7; on 5 if 4–7; on 6 if 6–7; never on 7; if Player stood, draw on 0–5. Higher final total wins; ties push Player/Banker bets. MetaWin's production server (MSS) `games/baccarat-1000/engine.ts` `dealHand`, `bankerDraws`, `settleHand`. Verify every tableau cell.
2. **Chip rounding:** declare engine precision, wallet grid and direction; round each accepted chip's profit, add principal, then sum. On Banker wins, commission=stake−profit; flooring profit ceils commission. MSS `games/baccarat-1000/engine.ts` `bankerNetUnits` uses half-up(95×units/100), paying 1:1 through 10 units. For half-up, bind a minimum to every chip; MSS `games/baccarat-1000/state.ts` `validateOpeningRun`, `normalizeRoundState` require each selection's base≥11 at admission/restoration. Certify the best legal chip size: MSS's eight-deck benchmark peaks at 99.7064% for 30 units, versus nominal 98.9421%. MSS `games/baccarat-live/index.ts` `server.tick` loops chips; `games/baccarat-live/engine.ts` `settle` floors 8dp then wallet-grid. MSS `games/blackjack-live/engine.ts` `settleMain` floors 3:2 natural profits only to 8dp (0.07 returns 0.175); a per-chip wallet floor is a declared policy. Verify per-chip minimums, progression exactness, conversion and separate/merged half-unit boundaries.
3. **Pairs:** compare only that side's original two ranks, independent of main result/later cards: MSS `games/baccarat-live/engine.ts` `dealHand`. Verify different ten-value ranks, initial pairs and misleading later pairs.
4. **Inside adjacency:** declare legal splits, streets, corners, six-lines and zero splits/trios/first-four; settle by membership. MSS `games/roulette-live/engine.ts` `insideCombinations` permits manual zero only in 0–1, 0–2, 0–3 splits. Verify accepted/rejected canonical sets.
5. **Announced layouts:** expand declared constituents. MSS `games/roulette-live/engine.ts` `settleCallBet`: Voisins/Tiers/Orphelins use 9/6/5 units; Orphelins' 14–17 and 17–20 splits both cover 17. Sum winning constituents' exact gross fractions of total stake, then floor once. Verify every pocket, constituent weight and odds type.
6. **Shared pocket:** one single-zero pocket pays principal plus profit on every covering spot, including overlaps. Manual run mode repeats the declared layout each spin: MSS `games/roulette-1000/index.ts` `planNext`; `games/roulette-1000/roulette.ts` `settleSpin` loses outside bets on zero. Declare zero loss, or eligible even-money (1:1) bets only: la partage refunds half principal; en prison locks it, later nonzero hits release principal only, nonzero misses lose it. Declare repeated-zero/run-end treatment for locked stakes. Verify coverage, multiple returns and repeated layouts.
7. **Dice predicates:** declare this rule set: small wins sums 4–10, big 11–17, odd/even follow sum parity; triples lose all four. Total requires exact sum, including triples. Any triple=three equal; specific triple=all three on the selected face; pair=at least two on that face, triples included; combo=both distinct selected faces present, ascending selection. Number pays only its matching occurrence tier, never lower tiers; zero matches lose principal. MSS `games/sicbo/gameLogic.ts` `settleBet`, `validateBet`. Verify all 216 ordered outcomes and counts 0–3.

## Pitfalls / red flags

Merged-chip rounding; value-based pairs; undeclared zero policies.

## Verification

Under uniform single-zero, standard odds and full zero loss on ordinary outside bets, ordinary bets' pre-rounding RTP=36/37. Exact la partage half-refunds give even-money RTP=73/74. Enumerate actual RTP separately for announced bets, wallet rounding and other zero policies (`qa-math-validation`).
