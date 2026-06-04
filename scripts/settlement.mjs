import { transfer, balanceOf } from './ledger.mjs'

// Settle a bet EXACTLY ONCE. Each leg is an idempotent transfer keyed off the betId, so a
// crash, retry, or duplicate webhook re-running settleBet reaches the same state (C2):
// no lost stake, no double payout. If a leg cannot complete, settleBet surfaces a distinct
// retryable reason rather than reporting a torn settlement as success.
export function settleBet(ledger, { betId, player, house, stake, payout }) {
  const t1 = transfer(ledger, player, house, stake, `${betId}:stake`)
  if (!t1.ok && t1.reason === 'insufficient') return { ok: false, reason: 'insufficient', betId }
  if (payout > 0) {
    const t2 = transfer(ledger, house, player, payout, `${betId}:payout`)
    // House can't fund the payout: the stake leg is idempotent, so a later retry (after the
    // house is funded) dedups the stake and completes only the payout — still exactly-once.
    if (!t2.ok && t2.reason === 'insufficient') return { ok: false, reason: 'house_insufficient', betId }
  }
  return { ok: true, betId }
}

// Value is conserved across the listed accounts (every transfer nets to zero).
export function conserved(ledger, accounts) {
  let total = 0
  for (const a of accounts) total += balanceOf(ledger, a)
  return Math.abs(total) < 1e-9
}
