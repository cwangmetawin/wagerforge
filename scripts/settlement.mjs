// Exactly-once settlement (C2). Every bet id has exactly one fate: rejected, settled or refunded.
// Decide → persist the decision → execute the money legs. A decision (the payout, or a refund) is
// recorded BEFORE its leg runs, so a retry can only finish that same decision: a retry carrying a
// different payout is a conflict, and settle/refund can never both happen.
//
// The bet's state is the legs' idempotency. Each leg (stake, payout, refund) posts its journal
// rows and moves the bet to its next state in ONE transaction, so a leg either ran with its state
// change or did not run at all; no key shared with other transfers can make a leg look done.
// In a database every decision is a compare-and-set on the bet row — UPDATE bets SET state =
// 'settling', payout = :p WHERE id = :id AND state = 'open' (or SELECT … FOR UPDATE, then re-read)
// — and 0 rows updated means re-read and replay or refuse. Two transactions that both read 'open'
// and blindly UPDATE the state can each commit a different decision and both pay; ACID alone does
// not stop that under READ COMMITTED. With a remote wallet (no shared transaction), persist a
// 'placing' intent before the debit and reconcile it; see the build-durable-settlement skill.
// These guarantees cover calls through this API; the ledger's fields are storage (see ledger.mjs).
import { post, balanceOf } from './ledger.mjs'
import { assertAtoms } from './money.mjs'
import { plainItems } from './plain-data.mjs'

function assertId(id) {
  if (typeof id !== 'string' || id.length === 0) throw new TypeError('ids must be non-empty strings')
}

const record = (ledger, betId, bet) => { ledger.bets.set(betId, Object.freeze(bet)); return bet }

// Stake is taken BEFORE the outcome exists; an unaffordable bet is rejected for good.
export function placeBet(ledger, { betId, player, house, stake }) {
  for (const id of [betId, player, house]) assertId(id)
  if (player === house) throw new TypeError('player and house must differ')
  assertAtoms(stake)
  const previous = ledger.bets.get(betId)
  if (previous) {
    if (previous.player !== player || previous.house !== house || previous.stake !== stake) {
      return { ok: false, reason: 'idempotency_conflict' }
    }
    if (previous.state === 'rejected') return { ok: false, duplicate: true, state: 'rejected', reason: 'insufficient' }
    return { ok: true, duplicate: true, state: previous.state }
  }
  if (!post(ledger, player, house, stake, `bet:${betId}:stake`).ok) {
    record(ledger, betId, { player, house, stake, state: 'rejected' })
    return { ok: false, reason: 'insufficient' }
  }
  record(ledger, betId, { player, house, stake, state: 'open' })
  return { ok: true, betId, state: 'open' }
}

function credit(ledger, bet, amount, ref) {
  return post(ledger, bet.house, bet.player, amount, ref).ok ? { ok: true } : { ok: false, reason: 'house_insufficient' }
}

export function settleBet(ledger, { betId, payout }) {
  assertId(betId)
  assertAtoms(payout, { allowZero: true })
  let bet = ledger.bets.get(betId)
  if (!bet) return { ok: false, reason: 'unknown_bet' }
  if (bet.state === 'rejected') return { ok: false, reason: 'rejected' }
  if (bet.state === 'refunding' || bet.state === 'refunded') return { ok: false, reason: 'already_refunded' }
  if (bet.state === 'settled') {
    return bet.payout === payout ? { ok: true, duplicate: true } : { ok: false, reason: 'idempotency_conflict' }
  }
  // Continue only from the states settlement owns: an unknown state must never fall through to paying.
  if (bet.state !== 'open' && bet.state !== 'settling') return { ok: false, reason: 'invalid_state' }
  if (bet.state === 'settling' && bet.payout !== payout) return { ok: false, reason: 'idempotency_conflict' }
  if (bet.state === 'open') bet = record(ledger, betId, { ...bet, state: 'settling', payout })
  if (payout > 0n) {
    const result = credit(ledger, bet, payout, `bet:${betId}:payout`)
    if (!result.ok) return result // stays 'settling': only this payout can finish it
  }
  record(ledger, betId, { ...bet, state: 'settled' })
  return { ok: true }
}

export function refundBet(ledger, { betId }) {
  assertId(betId)
  let bet = ledger.bets.get(betId)
  if (!bet) return { ok: false, reason: 'unknown_bet' }
  if (bet.state === 'rejected') return { ok: false, reason: 'rejected' }
  if (bet.state === 'settling' || bet.state === 'settled') return { ok: false, reason: 'already_settled' }
  if (bet.state === 'refunded') return { ok: true, duplicate: true }
  if (bet.state !== 'open' && bet.state !== 'refunding') return { ok: false, reason: 'invalid_state' }
  if (bet.state === 'open') bet = record(ledger, betId, { ...bet, state: 'refunding' })
  const result = credit(ledger, bet, bet.stake, `bet:${betId}:refund`)
  if (!result.ok) return result // stays 'refunding': settlement is now refused
  record(ledger, betId, { ...bet, state: 'refunded' })
  return { ok: true }
}

// Value is conserved across the listed accounts (every transfer nets to zero). This catches money
// created or destroyed; it cannot see a double payment, which still nets to zero.
export function conserved(ledger, accounts) {
  // Plain data (plain-data.mjs): a Proxy or a getter could skip accounts, so neither runs.
  const list = plainItems(accounts, 'accounts')
  if (list.length === 0) throw new TypeError('accounts must be a non-empty array')
  const seen = new Set()
  for (const account of list) {
    if (typeof account !== 'string' || account.length === 0 || seen.has(account)) {
      throw new TypeError('accounts must be distinct non-empty strings')
    }
    seen.add(account)
  }
  let total = 0n
  for (const a of seen) total += balanceOf(ledger, a)
  return total === 0n
}
