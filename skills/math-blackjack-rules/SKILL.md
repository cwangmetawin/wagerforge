---
name: math-blackjack-rules
description: Use when implementing or auditing blackjack rules, including hand scoring, soft and hard aces, naturals, 21, bust, settlement order and pushes, dealer soft 17 (S17 or H17), hole-card peek, natural 3:2 and insurance payouts on the wallet grid, burn cards, cut card and shoe reshuffle timing.
metadata:
  pillar: math
---

# math-blackjack-rules

> **Core insight:** Blackjack money follows declared rule order, not hand strength: scoring, naturals, settlement, dealer policy, grid rounding and shoe boundaries each need one stated policy, verified pair by pair.

## When to use / When NOT

- Use for scoring, settlement, dealer and peek policy, natural and insurance returns, burns, reshuffles.
- Not for Double, Split, insurance choice, charts, 21+3 (`math-blackjack-actions`); RTP denominators (`math-table-game-edge`); shoe proofs (`fair-shoe-draw-ledger`).

## Process

1. **Score** from the full card list after every draw: an ace counts 11 unless that busts, else 1, so at most one ace is soft. A bust ends the hand. Only an unsplit opening two-card 21 is a natural; any other 21 is ordinary and auto-stands. A hit draws one card, counts one action, then busts, stands on 21 or keeps the hand. MetaWin's production server (MSS) `games/blackjack-1000/engine.ts` `handTotal`; MSS `games/blackjack-multi-hands/index.ts` `hit`. Verify soft-to-hard changes (A+6+K), split 21, action counts, hand advancement.
2. **Settle** in order: player bust loses, even if the dealer busts; dealer natural beats all but a player natural, which pushes; player natural pays its premium; dealer bust pays; then higher total wins, equal pushes. MSS `games/blackjack-multi-hands/engine.ts` `settleOutcome`; MSS `games/blackjack-live/engine.ts` `settleMain`. Verify every pair: bust-bust, natural-natural, natural versus drawn 21, split 21 versus natural.
3. **Dealer** draws below 17. Declare soft 17 (S17 stands, H17 draws; every MSS blackjack is S17) and the draw gate: draw only while a non-bust, non-natural hand remains (MSS `games/blackjack-multi-hands/index.ts` `advanceOrSettle`), or draw once every hand resolves (MSS `games/blackjack-live/index.ts` `server.tick`). Verify A+6 fixtures; if gated, zero extra cards in all-bust, natural and surrender layouts.
4. **Peek:** declare it. With a peek on an Ace or ten-value upcard, a dealer natural ends the round before any Double or Split (MSS `games/blackjack-1000/engine.ts` `playOriginalHand`); per-player-shoe tables lock each player against that player's dealer (MSS `games/blackjack-table-live/index.ts` `server.tick`). Without one, added Double and Split stakes also lose to a later natural (MSS `games/blackjack-live/index.ts` `server.tick`). Verify liability and that no Double or Split enters after a peek.
5. **Grid:** a natural's half-stake premium and insurance's half stake must land on the wallet grid. Require grid-even stakes, rejecting odd ones (MSS `games/blackjack-1000/state.ts` `validateOpeningRun`), or floor each hand's return separately (MSS `games/blackjack-multi-hands/state.ts` `payoutAtoms`); never the aggregate. Verify odd-unit stakes: two 1-unit naturals return 2 + 2 units; flooring the aggregate returns 5.
6. **Burn:** per new shoe, reveal one burn card and discard extra cards equal to its hard value (ace 1, ten-value 10; MSS `games/blackjack-table-live/engine.ts` `Shoe`, or MSS `games/blackjack-multi-hands/engine.ts` `createFreshShoe`, which rebuilds the shoe every round), or burn exactly one when declared (MSS `games/blackjack-live/engine.ts` `Shoe`). Verify composition, cursor and ledger counts before dealing.
7. **Reshuffle:** never change shoes mid-hand. Check the cut card or threshold only between rounds, finish the round, then reshuffle from the persistent stream (never reseed) and reset the cursor. Declare when: next round (MSS `games/blackjack-live/engine.ts` `Shoe`), after one more hand (MSS `games/baccarat-live/engine.ts` `Shoe`), or before each hand at a threshold (MSS `games/baccarat-1000/engine.ts` `createShoe`). Verify cuts reached during draws, composition continuity, stream parity.

## Pitfalls / red flags

- Sticky soft flags; split 21 paid as a natural; aggregate flooring; one policy copied everywhere.

## Verification

- Drive real settlement with scripted shoes against an exhaustive oracle (`qa-regression-golden`, `qa-math-validation`).
