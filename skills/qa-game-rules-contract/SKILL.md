---
name: qa-game-rules-contract
description: Use when engineers audit player-facing game rules before launch or after math changes, resolve multiplier/cap/tie disputes, check active RTP variants, or gate live RNG and future-outcome privacy.
metadata:
  constraints: C9, C14
---

# qa-game-rules-contract

> **Core insight:** Player rules are payout contracts: every applicable resolution rule must match the shipped behavioral variant, and missing or stale rules block launch.

## When to use / When NOT

- Use for new-game rules, disputed resolution behavior and behavior-changing math edits.
- Use `qa-math-validation` for RTP estimation and `qa-settlement-integrity` for wallet atomicity. Live tables and bankroll-run games: `build-live-table-games`, `build-bankroll-run-games`.

## Process

1. Pin registration, behavioral config, action/variant/strategy, stake basis, grid and payout/termination code. Trace private selectors; maintain a claim/code/fixture matrix. MetaWin's production server (MSS) `docs/BEST_PRACTICES.md` section "Player-Facing Game Rules Doc" requires code-checked rules updated with behavior-changing math.
2. Answer every applicable resolution question explicitly or mark N/A: highest/sum/product multipliers; direction; longest win; shared symbol positions; scatter addition; wild substitutions/exclusions; update order; persistent multipliers; trigger/retrigger limits. MSS `games/sheriffNudge/gameLogic.ts` `detectPaylineWins` uses highest wild multiplier; `games/riseOfTheWolf/gameLogic.ts` `detectClusterWin` sums current eligible marks with base-pay fallback; `games/coinUp/gameLogic.ts` `playBonus` applies collectors before additive UP effects. Their GAME_RULES.md files are comparison inputs, not authority over code.
3. Specify each action's charge, gross/pending/credited returns, tie/loss/refund/replay, natural/bought caps/floors, whole-round scope, rounding, termination and forfeiture. Positive displayed wins do not prove credit or completion. Check rejected bets, zero-payout settlement and one terminal fate through `qa-settlement-integrity`.
4. Derive disconnect/abandonment, timeout, recovery and stopping rules from the server contract. State whether choices change RTP, only volatility, or the attainable ceiling. MSS `games/highLowHit/gameLogic.ts` `decisionRatio` distinguishes first risk from guaranteed moves; its GAME_RULES.md describes stochastic rounding and forced cashout. Prove neutrality/ceiling via `math-conditional-value-games`.
5. Write player language and bind displayed paytables/RTP/caps to the active behavioral variant. Update rules and their fixtures in the same change as payment-affecting weights, mechanics, rounding, caps or route selection. Audit actual served help/paytable text; a repository file alone cannot prove client display. Record inaccessible client/host checks as unverified.
6. Gate launch on current math evidence, all action paths and privacy. Inspect actual response/data/feed/proof/reconnect projections for live RNG traces, unrevealed randomness, hidden choices and future outcomes; disable debug/forced-outcome paths in live execution. MSS `.claude/skills/launch-checklist/SKILL.md` sections "Cheat & debug hygiene" and "Docs" specify these checks. An underscore name or dev flag alone is not privacy evidence.

## Correctness constraints

- C9: Certified slots require server-determined, audit-logged outcomes; cryptographic commitment before animation is specific to provably-fair models, not universal.
- C14: Pre-certified variants may switch with active RTP displayed; RNG-external promotions do not change certified math. A math-model change requires re-certification even when mean RTP stays constant.

## Pitfalls / red flags

- An absent multiplier rule leaves a dispute even when the engine is correct.
- Copying parent rules after a fork retune misstates the shipped contract.
- Treating debug replay as player fairness verification creates unsupported PASS claims.

## Verification

- Use independent fixtures for competing multiplier policies, no-active-mark fallback, direction/length, wild exclusions, tie/refund, retrigger/cap forfeiture, rounding and each buy/variant.
- Exercise disconnect/abandonment and all public projections during active rounds; fail future-outcome/debug leakage.
- Require same-change rules/evidence. Fairness PASS needs player-saved pre-bet commitment, player-generated client seed and contiguous nonces; missing evidence is UNVERIFIABLE.
