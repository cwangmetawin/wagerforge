// Append-only double-entry ledger. Past journal entries are IMMUTABLE; balance is the sum
// of entries (the correctness ideal). A cached balance is acceptable ONLY if updated in the
// SAME atomic transaction as the append, with an overdraft CHECK constraint (see C2).

export function createLedger() {
  return { journal: [], applied: new Set() }
}

export function balanceOf(ledger, account) {
  let b = 0
  for (const e of ledger.journal) if (e.account === account) b += e.amount
  return b
}

export function transfer(ledger, from, to, amount, idemKey) {
  if (!idemKey) throw new Error('idemKey required')
  if (!(amount > 0)) throw new Error('amount must be > 0')
  if (ledger.applied.has(idemKey)) return { ok: true, applied: false, reason: 'duplicate' }
  if (balanceOf(ledger, from) < amount) return { ok: false, applied: false, reason: 'insufficient' }
  ledger.journal.push({ account: from, amount: -amount, idemKey })
  ledger.journal.push({ account: to, amount, idemKey })
  ledger.applied.add(idemKey)
  return { ok: true, applied: true }
}
