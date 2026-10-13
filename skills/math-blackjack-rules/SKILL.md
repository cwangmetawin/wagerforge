---
name: math-blackjack-rules
description: Use when implementing or auditing blackjack rules, including hand scoring, soft and hard aces, naturals, 21, bust, settlement order and pushes, dealer soft 17 (S17 or H17), hole-card peek and added-stake liability, natural 3:2 or 6:5 and insurance payouts on the wallet grid, burn cards, cut card and shoe reshuffle timing.
metadata:
  pillar: math
---

# math-blackjack-rules

> **Core insight:** Declare scoring, liability, grid and stream lifetimes independently; actions and settlement must share accepted policies.

## When to use / When NOT

- Use for scoring, settlement, dealer/peek, payouts, burns and reshuffles.
- Actions: `math-blackjack-actions`; RTP: `math-table-game-edge`; shoe proofs: `fair-shoe-draw-ledger`.

## Process

1. **Score** after each draw: flexible aces count 11 unless busting, otherwise 1. Only unsplit opening two-card 21 is natural; other 21s auto-stand ordinarily; bust ends the hand. MetaWin's production server (MSS) `games/blackjack-1000/engine.ts` `handTotal`. Preserve declared Double scoring: MSS `games/blackjack-multi-hands/engine.ts` `handValueWithInitialAcesLow` fixes initial aces at 1; later aces remain flexible. Verify soft/hard transitions and A+8+2=11 under that policy.
2. **Settle** using that scoring policy: player bust loses; dealer natural beats all except player natural pushes; player natural gets declared premium; dealer bust pays; higher total wins, equal pushes. MSS `games/blackjack-multi-hands/engine.ts` `settleOutcome`. Verify every precedence pair, including split 21 against natural.
3. **Dealer** draws below 17 after players finish; declare S17 (stands soft 17), H17 (hits) and draw gate. Strict gating requires a non-bust, non-natural, non-surrendered hand; ungated tables always play the dealer. MSS `games/blackjack-multi-hands/index.ts` `advanceOrSettle` checks stood: an even-money-eligible natural followed by Stand can trigger draws. Verify soft-17 and strict-gate all-bust/natural/surrender zero-draw layouts.
4. **Peek/liability:** declare separately. After initial dealing and any insurance offer/debit, Ace/ten peek finding dealer natural blocks Hit/Stand/Double/Split. MSS `games/blackjack-1000/engine.ts` `playOriginalHand` immediately pays player naturals without further draws when dealer natural is ruled out; even-money variants can defer. Without peek, defer the player-natural premium against Ace/ten until hole-card reveal. Per-player shoes lock against each player's dealer. No-peek/all-bets loses added Double/Split stakes (MSS `games/blackjack-live/index.ts` `server.tick`); original-bet policies protect specified extras. Verify liability, natural cursor and that no Double/Split follows a peeked natural; negative peeks preserve eligibility.
5. **Grid:** declare odds. For 3:2 require even-unit stakes (MSS `games/blackjack-1000/state.ts` `validateOpeningRun`), or floor each hand's gross return before summing (MSS `games/blackjack-multi-hands/state.ts` `payoutAtoms`). Flooring retains half a unit per winning odd-unit natural: 1-unit stakes pay 1:1, costing about 2.3 opening-stake RTP points with eight decks. State minimum-stake RTP with its denominator (`math-table-game-edge`). Even stakes impose a two-unit grid minimum; 6:5 needs multiples of five for exact payouts. Declare insurance admission/rounding separately; exact-half requires even-unit opening stakes. Verify two 1-unit naturals return 2+2, not aggregate 5; 0.03/2=0.015 fails a 0.01 grid.
6. **Burn:** a new shoe reveals one card then removes hard-value extras (Ace 1, tens 10; MSS `games/blackjack-table-live/engine.ts` `Shoe.reset`), or burns exactly one (MSS `games/blackjack-live/engine.ts` `Shoe.reset`). Verify composition, cursor and ledger before dealing.
7. **Shoes:** never change mid-hand; finish the round, then apply cut/threshold reshuffles between rounds. Declare next-round (MSS `games/blackjack-live/engine.ts` `Shoe.roundComplete`), one-extra-hand timing (MSS `games/baccarat-live/engine.ts` `Shoe.handComplete`), or remaining≤reshuffleAt checked before each hand (MSS `games/baccarat-1000/engine.ts` `createShoe`). Reserve cards for admitted bettors before dealing (MSS `games/blackjack-live/state.ts` `buildShoe`); reset shoe cursor on reshuffle. Bankroll runs resume persistent streams without chunk reseeding; live epochs can rotate per shoe or per round. Replay committed streams under declared contracts (`build-bankroll-run-games`, `fair-shoe-draw-ledger`). Verify budget boundaries, midround cuts, composition continuity and resumed stream parity.

## Pitfalls / red flags

- Sticky soft flags; split-natural premiums; aggregate flooring; copied policies.

## Verification

- Reconcile scripted-shoe settlement against an exhaustive oracle (`qa-regression-golden`, `qa-math-validation`).
