---
name: using-wagerforge
description: Use when starting any iGaming, slot, or crypto-minigame task (RTP/house-edge math, provable fairness/RNG, RGS or wallet settlement, game economy, math/RNG QA, or gambling compliance) — routes to the right wagerforge domain skill.
---

# using-wagerforge

> **Core insight:** The prefix router is the only path that loads the law-bound (C1–C14, server-authoritative) corrections; "just coding the payout/RNG" while skipping it is precisely how refuted folk-math ships.

wagerforge is a domain-only skill library for real-money slot and crypto-minigame software, for Claude Code and Codex alike. It ships no generic process skills: design, plan, test and review with the process your setup already has; wagerforge supplies the iGaming WHAT inside that process.

## Routing — pick the task, open the named skill

| Task | Start with |
|---|---|
| RTP, house edge, paytables, reels, volatility | `math-rtp-modeling`, `math-paytable-config`, `math-volatility-tuning` |
| One mechanic's math | `math-lines-ways-cluster`, `math-cascade-tumble`, `math-hold-and-win`, `math-guaranteed-payout-floor`, `math-crash-family`, `math-ladder-and-progression`, `math-conditional-value-games`, `math-plinko-lottery`, `math-table-game-edge`, `math-fixed-odds-event-markets`, `math-feature-buy-and-jackpot` |
| How many simulated rounds | `math-montecarlo-simulation` |
| Provable fairness, RNG, seeds, verifiers | `fair-rng-core`, then `fair-outcome-mappers`, `fair-commit-reveal`, `fair-hash-chain`, `fair-shoe-draw-ledger`, `fair-verify`, `fair-verification-ui` |
| Server, round state, settlement, money | `build-game-server-rgs`, `build-instant-crash-games`, `build-durable-settlement`, `build-wallet-and-money`, `build-signed-realtime-settlement`, `build-live-table-games`, `build-bankroll-run-games`, `build-skill-wager-games`, `build-prediction-market-games` |
| Scaffold, client, shipping | `build-minigame-from-scratch`, `build-slot-reels-symbols`, `build-win-presentation`, `build-game-flow`, `build-asset-pipeline`, `build-mobile-performance`, `build-host-bridge`, `build-deploy-and-rtp-variant` |
| Bonus, jackpot, A/B, LTV, economy, tournaments | `econ-*` |
| Proving it works | `qa-math-validation`, `qa-monte-carlo-cert`, `qa-game-fingerprints`, `qa-regression-golden`, `qa-game-rules-contract`, `qa-fairness-verification`, `qa-rng-statistical`, `qa-settlement-integrity`, `qa-cosmetic-sim-guard`, `qa-load-and-observability` |
| Responsible gaming, certification, audit, privacy | `comp-*` |

## Route by mechanism, not by name or renderer

A game's name, theme or renderer never decides its money or fairness model; find the mechanism first.

| Mechanism | Skill |
|---|---|
| Paylines, ways, connected ways, clusters, count-anywhere | `math-lines-ways-cluster` (tumbles: `math-cascade-tumble`) |
| Retained cells and respins | `math-hold-and-win` |
| Moving wild, sticky wild, nudge, jumping wild, collector | `math-moving-wild-collection` |
| Orb multiplier, tumble multiplier, wild tiers, bomb, blast, chest | `math-cascade-modifiers` |
| "100k" currency floor vs headline max multiplier | `math-guaranteed-payout-floor` vs `math-plinko-lottery` |
| Hi-Lo, offers, dig-or-bank, fair continuations | `math-conditional-value-games` |
| Fixed-odds quotes vs pooled markets | `math-fixed-odds-event-markets` vs `build-prediction-market-games` |
| One buy-in, many internal hands | `build-bankroll-run-games` |
| Card shoes, hole cards, timed shared tables | `fair-shoe-draw-ledger`, `build-live-table-games` |
| Blackjack: scoring, naturals, dealer and peek rules, shoes; insurance, Double, Split, charts, 21+3 | `math-blackjack-rules`, `math-blackjack-actions` |
| Player skill decides the result | `build-skill-wager-games` |
| An external server reports the result | `build-signed-realtime-settlement` |
| Table bets: baccarat, roulette, Sic Bo settlement; progressions and stop lines | `math-table-bet-rules`, `math-betting-progressions` |

## Order

Specimens cited as `MSS <path>` point at MetaWin's production game server (metawin-slot-server), the read-only reference these skills are calibrated against; the rule stated first is the portable one.

Design and plan first; implement with the domain skills open; prove it with the matching `qa-*` skill before calling anything done. The server decides every outcome and payout; the client only renders. User instructions (CLAUDE.md / AGENTS.md) outrank skills.
