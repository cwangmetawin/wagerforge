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

1. Validate IDs/accounts and positive atom stake. Place before deriving/revealing any outcome: atomically reserve the UNIQUE betId, guarded debit, OPEN row, journal and applicable fairness nonce. Bind the bet to player, house and stake. Insufficient funds permanently REJECT that betId without nonce/outcome; a later deposit cannot revive it.
2. Persist the authoritative outcome and settlement/refund decision before executing its legs. Validate payout as explicit non-negative atoms; invalid payout changes nothing at settlement, never becomes a loss. Identical replay resumes the stored decision; changed parties, stake or payout conflict. Zero payout still ends SETTLED. Correct an error with a separate audited adjustment linked to the decision; SETTLED, REFUNDED and REJECTED are mutually exclusive, so a settled bet is never re-settled or refunded.
3. Guard OPEN→SETTLING or OPEN→REFUNDING conditionally; retries finish only that decision to SETTLED or REFUNDED. Use UNIQUE step keys plus `INSERT ... ON CONFLICT`, each bound to its leg's immutable `{from,to,amount}`; a replay with other content conflicts. Co-commit each leg's key, guarded balance update, journal and status transition. Never use check-then-write deduplication.
4. **Copy the reference scripts only together with these database rules.** Grant the journal and idempotency-key tables INSERT only; never delete bet rows; move status forward only; keep player, house, stake and the decided payout immutable; post deposits and withdrawals as balanced pairs against a clearing account. The in-memory reference `scripts/settlement.mjs` exports `placeBet(ledger,{betId,player,house,stake})`, then `settleBet(ledger,{betId,payout})` or `refundBet(ledger,{betId})`. It records `settling`/`refunding` before credit; insufficient house funds retain that decision for retry. Each leg's idempotency is the bet's state, not a shared transfer key; an unknown state returns `invalid_state` instead of paying. Its maps vanish on restart, and direct writes bypass every check.
5. External exactly-once effects require receiver-enforced deduplication plus durable reconciliation. Persist request intent/receipt, reconcile ambiguous timeouts, and replay only unfinished legs. Never reroll a persisted outcome on retry.
6. Recover by game-specific liability. MetaWin's production server (MSS) `games/sicbo/index.ts` `server.tick` refunds unresolved accepted stakes and avoids also cancelling refunded commands. MSS `games/snakes-pro/index.ts` `server.tick` refunds remaining pool liabilities plus earned pending payouts once, never original gross stakes after realization.
7. Signed realtime results follow `build-signed-realtime-settlement`: verify and bind them to the persisted round before paying; a failed check keeps the round open and unpaid.

## Correctness constraints

- **C2:** Each money leg is an atomic, overdraft-safe, idempotent guarded write under serializable isolation, co-committed with the append-only ledger. Cache updates share that ACID transaction; never authorize spend from a cache/replica.

## Pitfalls / red flags

Debit after outcome; zero-loss without terminal record; mutable retry payout; settle/refund races; blanket gross-stake refunds; treating an outbox send as payment proof.

## Verification

Require concurrent duplicates, decision/credit crash recovery, zero-loss replay and real database restart evidence. Run reference `scripts/settlement.test.mjs`; external effects also need receiver/reconciliation evidence.
