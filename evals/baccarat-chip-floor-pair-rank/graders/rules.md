---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Deal the hand with the tableau. Player's king and ten total 0, so Player draws the king of diamonds (value 0) and stays at 0. Banker's two and two total 4, and Banker draws on 4 only when Player's third card is 2-7, so Banker stands and the six of spades is never dealt. Banker 4 beats Player 0, so the Banker chips win.
- Pair bets compare only each side's original two cards by rank, independent of the main result and later cards. Player's king and ten are different ranks (both count 0, and the later king of diamonds does not make a pair), so the Player-pair chip loses. Banker's two and two are a pair, so the Banker-pair chip pays 11:1 and returns 12.00.
- Settle every accepted Banker chip separately: floor_cent(0.07 x 0.95) = floor_cent(0.0665) = 0.06, so each chip returns 0.07 + 0.06 = 0.13 and the three return 0.39. The merged 0.21 bet would return 0.21 + floor_cent(0.1995) = 0.21 + 0.19 = 0.40, which is wrong. Accept either this profit-floor calculation or the equivalent calculation rounding the commission UP to a cent: ceil_cent(0.07 x 0.05) = ceil_cent(0.0035) = 0.01, giving 0.07 + (0.07 - 0.01) = 0.13 per chip. Presenting both algorithms is not required.
- The round returns 0.39 + 12.00 + 0 = 12.39 on 2.21 staked, a net of +10.18.
- In the separate half-up variant, a 0.01 chip wins 0.01 profit: half_up_cent(0.0095) = 0.01. All 1-10 cent chips pay 1:1, so their RTP is 2 x 0.458597422632763 + 0.0951559680236402 = 101.2351%. A minimum applying only to the first chip leaves later positive-expectation chips admissible; require the declared 0.11 minimum on every chip. This minimum belongs to the half-up variant, not the original floor-settled round.
- Half-up RTP is pBanker x (1 + roundedProfit / stake) + pTie. The 0.11 chip wins 0.10 profit and has RTP 97.0660%; 0.20 wins 0.19 and has RTP 98.9421%; 0.30 wins 0.29 and has RTP 99.7064%. Accept figures rounded to 97.07%, 98.94% and 99.71%, respectively. Among all legal cent-sized chips from 0.11 through 100.00, 0.30 maximizes RTP at 99.7064%, so certify that maximum for the selectable sizes. The nominal 98.9421% applies at multiples of 20 cents, not all sizes; never certify it as the maximum.
- Tests cover ten-value cards of different rank versus a true initial pair, an initial pair versus a later card that repeats a rank, a pair paying when its side loses the main bet, Banker drawing and standing cells including a third card of value 0, per-chip versus merged rounding at small odd stakes, first and later chip admission at the 10/11-cent boundary, and the half-up RTP maximum across legal chip sizes.

DISQUALIFYING:
FAIL if, for the original floor-settled round, the answer endorses merging the Banker chips before the commission (0.40 for the chips, 12.40 in total), scores a pair from the final cards or from card values so the Player pair wins (24.39 in total), has Banker draw a third card on 4 against Player's third card of value 0 (the six makes a 0-0 tie and a 12.21 total), makes a pair bet depend on its side winning, or rounds profit to the nearest cent instead of the declared floor, or rounds the commission DOWN (both give 0.07 profit per chip, 0.42 for the chips and 12.42 total). Rounding commission UP is equivalent to the required profit floor and is not disqualifying.

FAIL if the answer endorses the half-up variant's first-chip-only minimum as sufficient, treats a 1-10 cent half-up chip as paying exactly 0.95:1, certifies 98.9421% as the RTP for all legal sizes or as the maximum, identifies 0.11 or 0.20 as the highest-RTP legal chip, or applies the half-up variant's minimum or rounding to the original floor-settled round. Half-up rounding is required only for the separate proposed variant and is not itself disqualifying there.
