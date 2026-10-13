---
name: math-blackjack-actions
description: Use when implementing or auditing blackjack player actions, including insurance, Double, Split, split aces and re-splits, hand caps, autoplay strategy charts with fallbacks, custom chart validation, and the 21+3 side bet (suited trips, straight flush, straight, flush).
metadata:
  pillar: math
---

# math-blackjack-actions

> **Core insight:** A blackjack action is defined by its gate: eligibility, funding and fallback decide which stake is paid and which cards are drawn.

## When to use / When NOT

- Use for insurance, Double, Split, split aces, strategy charts, 21+3.
- Not for scoring, settlement order, dealer or peek policy, natural payouts, burns, reshuffles (`math-blackjack-rules`); paid-command debits (`build-live-table-games`, `build-instant-crash-games`); run funding (`build-bankroll-run-games`); RTP denominators (`math-table-game-edge`).

## Process

1. **Insurance:** offer it only against a dealer Ace, for half the opening stake, and only if affordable; otherwise skip it without error. Debit it before any Double or Split funding test and count it as a stake. It returns principal plus 2:1 only on a dealer natural, whatever the main hand did, else is lost. MetaWin's production server (MSS) `games/blackjack-1000/engine.ts` `playOriginalHand`. Verify unaffordable stakes and both settlements (stake 20: cost 10, natural returns 30).
2. **Double** only an untouched two-card hand that is not a natural and has an allowed total, split hands included. Debit the hand's full current stake before the card, draw exactly one, then force stand or bust. A three-card 21 is no natural. Declare totals and ace scoring: hard totals 9-11 with initial aces fixed at one (MSS `games/blackjack-multi-hands/index.ts` `doubleDown`), or any two cards with flexible aces (MSS `games/blackjack-1000/engine.ts` `playOriginalHand`). Verify funding, eligibility, aces (A+8 plus 2 is 11 fixed, 21 flexible), doubled 21 paying 1:1.
3. **Split** a pair for a stake equal to the hand's, within funding and the declared hand cap. Declare the pair test: equal value, so K+10 pairs (MSS `games/blackjack-1000/engine.ts` `cardsSameValue`), or exact rank (MSS `games/blackjack-live/commands.ts` `validateCommand`). Seat the sibling beside the current hand. Declare second-card order: both children at once (MSS `games/blackjack-multi-hands/index.ts` `splitHand`) or each at its own turn (MSS `games/blackjack-1000/engine.ts` `playOriginalHand`). A split 21 pays 1:1. Verify pair test, order, sibling seat, cap boundary, funding.
4. **Split aces** take exactly one card each and cannot Hit or Double. The only continuation is an eligible re-split (a new ace pair, below the hand cap, funded); at the cap, finish pending ace hands automatically (MSS `games/blackjack-live/index.ts` `server.tick`). Declare whether aces re-split (MSS `games/blackjack-multi-hands/index.ts` `splitHand` never re-splits). Verify cap transitions and re-split funding.
5. **Charts:** look up pair, then soft, then hard total. Each Double or Split cell names a hit-or-stand fallback (D/H, D/S, P/H, P/S) for when rules or funds forbid it; never guess one. Require complete custom charts holding exactly their own rows and cells, reject missing, inherited or altered cells, and named presets that differ from canonical. MSS `games/blackjack-1000/strategy.ts` `decide`, `validateStrategy`. Verify lookup priority (8+8, A+A, A+6) and unfunded decisions.
6. **21+3:** use only the player's two opening cards plus the dealer upcard, whatever follows. Take the first match: suited trips, straight flush, trips, straight, flush. A-2-3 and Q-K-A are straights; K-A-2 is not. MSS `games/blackjack-table-live/engine.ts` `classifyTwentyOnePlusThree`. Verify categories are exclusive (8 decks, in that order: 2,912; 24,576; 61,568; 368,640; 700,928 of 11,912,160 triples).

## Pitfalls / red flags

- Free Double or Split; unaffordable insurance debited; hole-filled chart cells; split 21 paid as a natural.

## Verification

- Drive scripted shoes through the real action path; assert debit before draw and exact wagered and returned totals (`qa-settlement-integrity`).
