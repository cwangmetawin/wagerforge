---
name: build-prediction-market-games
description: Use when building pooled prediction-market engines with outcome shares, resale orders, pool-derived quotes, cash-out, parimutuel settlement, or fault recovery. Keywords prediction market, order book, shares, rake, horse-pro, football-pro, snakes-pro.
metadata:
  constraints: C2, C14
---

# build-prediction-market-games

> **Core insight:** Quotes, execution prices and redemption values are distinct contracts; proportional settlement needs scaled precision, explicit remainder ownership and recovery of remaining liabilities.

## When to use / When NOT
- Use for: multiplayer pooled markets with tradable outcome shares.
- NOT for: fixed-odds crash games (`math-crash-family`) or wallet implementation (`build-wallet-and-money`, `build-durable-settlement`).

## Default stack (+ escape hatch)
TS + PixiJS/Phaser + Node; exact integer-atom/decimal money. Other stacks map command/tick/replay, pool liabilities and atomic ledger writes. Clients render server-resolved outcomes.

## Process
1. **Specify each market.** MetaWin's production server (MSS) `games/horse-pro/types/game.types.ts` `calculatePrices` clamps quotes to `[.02,.90]`, then renormalizes; empty pools quote `1/10`. MSS `games/football-pro/types/game.types.ts` `calculatePrices` uses net+phantom pools; empty effective pools quote `.40/.25/.35`. MSS `games/snakes-pro/index.ts` `server.tick` uses `[.10,.90]`, empty `.5/.5`. Renormalization can break original bounds.
2. **Separate execution.** Fill eligible resale orders before minting remaining-budget shares. MSS `games/football-pro/index.ts` `server.tick` charges fees on matched payments and remaining pool investment; pool minting uses post-trade real net pools, with empty mint price `1/3`. Specify eligibility, fee routing and execution separately from displayed quotes.
3. **Define redemption.** Proportional value is `shares/totalSideShares*sidePool`. MSS `games/snakes-pro/index.ts` `server.tick` pays `min(proportionalValue,max(0,originalInvestment*(1-fee)-alreadyRealized))`. Track sells/cash-outs per source bet; capped residual remains pooled.
4. **Lock final holdings.** Bind command ids to players and immutable content; reject conflicting reuse. Guard settlement by phase, authoritative winner and once-per-round completion. MSS `games/snakes-pro/index.ts` `server.tick` checks winner mismatch only when an authoritative winner exists; require an authoritative result before settlement. Reject trading once results are determined; redact future results from public projections.
5. **Preserve proportions.** MSS `games/snakes-pro/index.ts` `computePayouts`: `P=10**12`, `vps=Math.round((pot/winningShares)*P)/P`; if `vps*winningShares>pot`, use `Math.floor((pot/winningShares)*P)/P`. Pay `shares*vps`; only `abs(dust)>1e-8` goes to the last winning bet's player. Never floor to whole currency units. Exact atom allocation ends with `potAtoms-sum(previousPayoutAtoms)`. With zero winning shares nothing is divided: apply the declared unbacked-winner policy (step 6).
6. **Derive EV.** For fixed holdings without early proceeds, `EV=p*winningShareFraction*netPot-s`. Fixed stake-proportional pools with `q=outcomeGross/totalGross>0` and fee `0<=r<1` give `EV=s[p(1-r)/q-1]`; positive EV requires `p>q/(1-r)`. Include realized proceeds when auditing exits. Specify unbacked-winner policy: MSS `games/horse-pro/index.ts` `settleMarket` can pay zero; MSS `games/football-pro/index.ts` `server.tick` refunds residual net.
7. **Recover liabilities.** Refund remaining pooled holdings and merge earned `pendingPayouts` once; never refund original gross stakes after realization. MSS `games/snakes-pro/index.ts` `server.tick` fatal recovery supplies this pattern.

## Correctness constraints
- **C2:** Use serializable, atomic, overdraft-safe, idempotent guarded writes with the ledger; caches update in that transaction. Never authorize spend from caches/replicas.
- **C14:** Select pre-certified variants, display active RTP; recertify math-model changes. External promotions do not alter certified RNG RTP. Rake alone does not establish RTP.

## Pitfalls / red flags
Stale quotes; duplicate realization; treating float tolerance as exact conservation.

## Verification
Prove `100` pot/two `100`-share winners pays `[50,50]`. Test per-game empty pools, resale-first execution, partial-sell/cash-out caps, unbacked winners, settlement replay and crash recovery. Legacy float conservation uses documented tolerance; atom conservation uses strict equality.
