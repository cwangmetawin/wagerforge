// Append-only double-entry ledger. Past journal entries are IMMUTABLE; balance is the sum
// of entries (the correctness ideal). A cached balance is acceptable ONLY if updated in the
// SAME atomic transaction as the append, with an overdraft CHECK constraint (see C2).
//
// In a database, "same transaction" is not enough on its own. The overdraft check must be a
// guarded write (UPDATE … SET balance = balance - :amt WHERE account = :a AND balance >= :amt,
// or SERIALIZABLE isolation): under READ COMMITTED two transactions can both read a balance
// that covers them and both commit. An idempotency key is a UNIQUE column inserted with
// INSERT … ON CONFLICT DO NOTHING in that same transaction; on conflict, re-read the stored
// row and compare its content (same content = duplicate, different content = conflict).
//
// The ledger object stands in for the database, and its fields are storage, not API: code that
// writes journal, applied or bets directly bypasses every check here, as a direct UPDATE would.
// Enforce that boundary in the database too: the application role may only INSERT into the journal
// and the idempotency-key table (no UPDATE or DELETE grant); bet rows are never deleted, their state
// only moves forward, and player, house, stake and a decided payout never change once written (a
// BEFORE UPDATE trigger that compares OLD and NEW: a row CHECK sees only the new row, so it cannot
// keep history). Deposits and withdrawals are balanced INSERT pairs against an
// external clearing account that may go negative. Otherwise restoring an older row, deleting a key or
// a bet, or rewriting a payout in place can pay a bet twice or change what it pays.

import { assertAtoms } from './money.mjs'

export function createLedger() {
  return { journal: [], applied: new Map(), bets: new Map() }
}

// Every amount must still be a BigInt: a journal reloaded from JSON holds strings, and
// `0n + '100'` concatenates, which would silently disable the overdraft check.
export function balanceOf(ledger, account) {
  let b = 0n
  for (const e of ledger.journal) {
    if (typeof e.amount !== 'bigint') throw new TypeError('journal amounts must be BigInt: convert them when loading')
    if (e.account === account) b += e.amount
  }
  return b
}

function assertMove(from, to, amount, label) {
  for (const id of [from, to, label]) {
    if (typeof id !== 'string' || id.length === 0) throw new TypeError('accounts and the key or ref must be non-empty strings')
  }
  if (from === to) throw new TypeError('from and to must differ')
  assertAtoms(amount)
}

// A raw, overdraft-safe posting with NO idempotency of its own: the caller's own state machine
// must guarantee it runs once (settlement uses the bet's state). ref is an audit label only, so
// no other caller's key can make this posting look "already done".
export function post(ledger, from, to, amount, ref) {
  assertMove(from, to, amount, ref)
  if (balanceOf(ledger, from) < amount) return { ok: false, reason: 'insufficient' }
  ledger.journal.push(
    Object.freeze({ account: from, amount: -amount, ref }),
    Object.freeze({ account: to, amount, ref })
  )
  return { ok: true }
}

// An idempotent transfer for callers WITHOUT their own state machine. The key is bound to its
// content: same key + same {from,to,amount} = duplicate no-op; same key + different content =
// conflict, and no money moves. An insufficient transfer records no key, so it can be retried.
export function transfer(ledger, from, to, amount, idemKey) {
  assertMove(from, to, amount, idemKey)
  const previous = ledger.applied.get(idemKey)
  if (previous) {
    if (previous.from === from && previous.to === to && previous.amount === amount) {
      return { ok: true, applied: false, reason: 'duplicate' }
    }
    return { ok: false, applied: false, reason: 'idempotency_conflict' }
  }
  const result = post(ledger, from, to, amount, idemKey)
  if (!result.ok) return { ok: false, applied: false, reason: result.reason }
  ledger.applied.set(idemKey, Object.freeze({ from, to, amount }))
  return { ok: true, applied: true }
}
