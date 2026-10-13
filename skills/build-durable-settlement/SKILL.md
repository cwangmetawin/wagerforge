---
name: build-durable-settlement
description: Use when implementing bet placement, immutable settlement or refund decisions, crash recovery, concurrent retries, duplicate webhooks, or external payout reconciliation.
metadata:
  constraints: C2
---

# build-durable-settlement

> **Core insight:** A bet has one immutable decision and one terminal fate; place it before deriving the outcome, then resume only the persisted decision's unfinished money legs.

## When to use / When NOT

- Use for bet→outcome→settlement orchestration and external payouts.
- Wallet primitives belong in `build-wallet-and-money`; tests in `qa-settlement-integrity`.

## Default stack + escape hatch

TypeScript + PixiJS/Phaser presentation + Node, exact atoms, ACID bet/journal storage and a durable outbox. Other stacks must preserve transaction boundaries, immutable decisions and reconciliation.

## Process

1. Validate IDs/accounts and positive atom stake. Before outcome derivation/reveal, atomically reserve UNIQUE betId, guarded debit, OPEN row, journal and applicable fairness nonce; bind player/house/stake. Insufficient funds permanently REJECT that betId without nonce/outcome; deposits cannot revive it.
2. Persist authoritative outcome and settlement/refund decision before money legs. Require explicit non-negative atom payout; invalid payout leaves settlement unchanged, never a loss. Identical replay resumes; changed parties/stake/payout conflict. Zero payout ends SETTLED. Errors require separate audited adjustments linked to the decision; SETTLED/REFUNDED/REJECTED are mutually exclusive, prohibiting re-settlement/refund.
3. Conditionally guard OPEN→SETTLING/REFUNDING; retries finish only that decision to SETTLED/REFUNDED. UNIQUE step keys with `INSERT ... ON CONFLICT` bind each leg's immutable `{from,to,amount}`; changed-content replay conflicts. Co-commit leg key, guarded balance update, journal and status transition. Never check-then-write deduplication.
4. **Copy the reference scripts only together with these database rules.** Grant the journal and idempotency-key tables INSERT only; never delete bet rows; move status forward only; keep player, house, stake and the decided payout immutable; post deposits and withdrawals as balanced pairs against a clearing account. The in-memory reference `scripts/settlement.mjs` exports `placeBet(ledger,{betId,player,house,stake})`, then `settleBet(ledger,{betId,payout})` or `refundBet(ledger,{betId})`. It records `settling`/`refunding` before credit; insufficient house funds retain that decision for retry. Each leg's idempotency is the bet's state, not a shared transfer key; an unknown state returns `invalid_state` instead of paying. Its maps vanish on restart, and direct writes bypass every check.
5. External exactly-once effects require receiver-enforced deduplication and durable reconciliation: persist request intent/receipt, reconcile ambiguous timeouts, replay only unfinished legs, never reroll persisted outcomes. For prizes, sign purpose-separated canonical claims binding environment/attempt/quote/price-lock/stake/result; gate evidence capability before RNG, recover signing/delivery failures from the recorded result. Verify bindings/recovery; signing proves neither fulfillment nor receiver deduplication. MetaWin's production server (MSS) `games/hitDraw/physicalAcceptor.ts` `openPhysicalPackForRoom`.
6. Track cash exposure, reference-value liability and physical quantity separately; zero cash payout can still owe prizes. Before RNG verify monetary/quantity reservation maxima across all outcomes at the accepted price: MSS `games/hitDraw/physicalGameLogic.ts` `validatePhysicalOpeningQuoteForActivation`. Recover remaining game-specific liabilities: MSS `games/sicbo/index.ts` `server.tick` refunds unresolved accepted stakes without also cancelling refunded commands; MSS `games/snakes-pro/index.ts` `server.tick` refunds remaining pools plus earned pending payouts once, never original gross stakes after realization.
7. Signed realtime results follow `build-signed-realtime-settlement`: bind verified results to persisted rounds before paying; failed checks keep rounds open/unpaid.

## Correctness constraints

- **C2:** Each money leg is an atomic, overdraft-safe, idempotent guarded write under serializable isolation, co-committed with the append-only ledger. Cache updates share that ACID transaction; never authorize spend from a cache/replica.

## Pitfalls / red flags

Debit after outcome; zero-loss without terminal record; mutable retry payout; settle/refund races; blanket gross-stake refunds; treating an outbox send as payment proof.

## Verification

Require concurrent duplicates, decision/credit crash recovery, zero-loss replay, real database restart and external receiver/reconciliation evidence. Run reference `scripts/settlement.test.mjs`.
