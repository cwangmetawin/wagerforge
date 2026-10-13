---
name: math-blackjack-actions
description: Use when implementing or auditing blackjack player actions, including insurance amounts, Double, double-for-less, double after split (DAS), Split, split aces and re-splits, hand caps, autoplay strategy charts with fallbacks, custom chart validation, and the 21+3 side bet (suited trips, straight flush, three of a kind, straight, flush).
metadata:
  pillar: math
---

# math-blackjack-actions

> **Core insight:** Eligibility, declared stake policies, funding and fallback determine which money is paid and which cards are drawn.

## When to use / When NOT

- Use for insurance, Double, Split, split aces, charts and 21+3.
- Scoring/settlement/grid: `math-blackjack-rules`; paid commands: `build-live-table-games`; run funding: `build-bankroll-run-games`; RTP: `math-table-game-edge`.

## Process

1. **Insurance:** declare amount and odds. Offer only against a dealer Ace if affordable; otherwise skip without error. MSS chooses exactly half the opening stake, paying principal plus 2:1 profit only on dealer natural, independently of the main hand; otherwise insurance loses. MetaWin's production server (MSS) `games/blackjack-1000/engine.ts` `playOriginalHand`. Offer/debit before peek; settle at peek or hole-card reveal without peek. Require even-unit opening stakes for exact-half insurance (`math-blackjack-rules`). Debit before Double/Split funding tests; include insurance in wagered totals. Verify unaffordable insurance and both settlements: stake 20, cost 10, winning return 30.
2. **Double:** declare allowed totals, DAS (double after split), double-for-less and ace scoring. Require an untouched, non-natural two-card hand with an allowed total; permitted split hands qualify. MSS examples permit DAS and add the full current stake (no double-for-less) before drawing exactly one card, then force stand/bust: hard totals 9–11 with initial aces fixed at 1 (MSS `games/blackjack-multi-hands/index.ts` `doubleDown`), or any two cards with flexible aces (MSS `games/blackjack-1000/engine.ts` `playOriginalHand`). Preserve scoring through settlement. Verify funding, eligibility, aces (A+8 plus 2: 11 fixed, 21 flexible) and doubled 21 paying ordinary 1:1 profit on the final stake.
3. **Split:** require an additional stake equal to the hand's, funding and declared hand cap. Declare value-equal pairs, including mixed ten ranks (MSS `games/blackjack-multi-hands/index.ts` `splitHand`), or exact rank (MSS `games/blackjack-live/commands.ts` `validateCommand`). Seat sibling beside current hand. Declare second-card order: both children immediately (MSS `games/blackjack-multi-hands/index.ts` `splitHand`) or each at its turn (MSS `games/blackjack-1000/engine.ts` `playOriginalHand`). Split 21 auto-stands and pays ordinary 1:1, never as natural. Verify pair test, order, sibling placement, caps and funding.
4. **Split aces:** declare the one-card policy and re-split permission. Each ace child gets exactly one additional card, with no Hit/Double; only an eligible new ace pair, funded below the cap, may re-split. At the cap automatically finish pending ace hands (MSS `games/blackjack-live/index.ts` `server.tick`). A no-resplit example is MSS `games/blackjack-multi-hands/index.ts` `splitHand`. Verify cap transitions and re-split funding.
5. **Charts:** look up pair first, otherwise soft or hard total. Each Double/Split cell declares Hit/Stand fallback (D/H, D/S, P/H, P/S) when rules/funds forbid it. Require exact own keys/rows/cells and legal actions, including the insurance choice (TAKE/DECLINE). Reject missing, inherited, extra or invalid cells before opening; never fill holes. Reject altered named presets. MSS `games/blackjack-1000/strategy.ts` `decide`, `validateStrategy`. Verify lookup priority, legal custom changes, missing rows/insurance and unfunded fallbacks.
6. **21+3:** use only the player's two opening cards plus dealer upcard. First match wins: suited trips→straight flush→trips→straight→flush. A-2-3/Q-K-A count; K-A-2 does not. MSS `games/blackjack-table-live/engine.ts` `classifyTwentyOnePlusThree`. Verify exclusive categories and independence from later cards.

## Pitfalls / red flags

- Free paid actions; unaffordable insurance debits; hole-filled charts; split-natural premiums.

## Verification

- Script real action paths; reconcile debits, draws and gross returns (`qa-settlement-integrity`).
