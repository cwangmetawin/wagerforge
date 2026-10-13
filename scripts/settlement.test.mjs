import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, balanceOf, transfer } from './ledger.mjs'
import * as settlement from './settlement.mjs'

const { placeBet, settleBet, refundBet, conserved } = settlement
const bet = { betId: 'b1', player: 'player', house: 'house', stake: 10n }
const snapshot = ledger => structuredClone(ledger)
// Settlement legs are labelled for audit only; they never touch the public idempotency keys.
const legRows = (ledger, ref) => ledger.journal.filter(entry => entry.ref === ref).length

function fund(ledger, account, amount) {
  const idemKey = `seed:${account}:${amount}:${ledger.journal.length}`
  ledger.journal.push({ account: 'mint', amount: -amount, idemKey }, { account, amount, idemKey })
}

function funded(player = 100n, house = 1000n) {
  const ledger = createLedger()
  fund(ledger, 'player', player)
  fund(ledger, 'house', house)
  return ledger
}

test('ledger starts with BigInt balances and content-bound maps', () => {
  const ledger = createLedger()
  assert.equal(balanceOf(ledger, 'unknown'), 0n)
  assert.ok(ledger.applied instanceof Map)
  assert.ok(ledger.bets instanceof Map)
})

test('transfer is atomic, overdraft-safe, and balanced', () => {
  const ledger = funded()
  assert.deepEqual(transfer(ledger, 'player', 'bob', 30n, 'k1'), { ok: true, applied: true })
  assert.equal(balanceOf(ledger, 'player'), 70n)
  assert.equal(balanceOf(ledger, 'bob'), 30n)
  const before = snapshot(ledger)
  assert.deepEqual(transfer(ledger, 'bob', 'player', 1000n, 'k2'), { ok: false, applied: false, reason: 'insufficient' })
  assert.equal(balanceOf(ledger, 'bob'), 30n)
  assert.deepEqual(ledger, before)
  assert.equal(conserved(ledger, ['player', 'house', 'bob', 'mint']), true)
  assert.ok(ledger.journal.every(entry => typeof entry.amount === 'bigint'))
})

test('transfer is idempotent on identical content with no double-apply', () => {
  const ledger = funded()
  transfer(ledger, 'player', 'bob', 30n, 'dup')
  const before = snapshot(ledger)
  assert.deepEqual(transfer(ledger, 'player', 'bob', 30n, 'dup'), { ok: true, applied: false, reason: 'duplicate' })
  assert.equal(balanceOf(ledger, 'player'), 70n)
  assert.equal(balanceOf(ledger, 'bob'), 30n)
  assert.deepEqual(ledger, before)
  assert.deepEqual(ledger.applied.get('dup'), { from: 'player', to: 'bob', amount: 30n })
})

test('D1: 0.3 covers three debits of 0.1 exactly in tenths', () => {
  const ledger = funded(3n, 0n)
  for (let i = 0; i < 3; i++) assert.equal(transfer(ledger, 'player', 'house', 1n, `tenth:${i}`).ok, true)
  assert.equal(balanceOf(ledger, 'player'), 0n)
  assert.equal(balanceOf(ledger, 'house'), 3n)
})

test('D1: 0.3 covers 0.1 then 0.2 exactly in tenths', () => {
  const ledger = funded(3n, 0n)
  assert.equal(transfer(ledger, 'player', 'house', 1n, 'first').ok, true)
  assert.equal(transfer(ledger, 'player', 'house', 2n, 'second').ok, true)
  assert.equal(balanceOf(ledger, 'player'), 0n)
})

test('D2: transfer refuses string and Number money before any mutation', () => {
  for (const amount of ['10', 10, NaN, undefined, null, false, {}, []]) {
    const ledger = createLedger()
    const before = snapshot(ledger)
    assert.throws(() => transfer(ledger, 'p', 'h', amount, 'bad'), TypeError)
    assert.deepEqual(ledger, before)
  }
  for (const amount of [0n, -1n]) assert.throws(() => transfer(createLedger(), 'p', 'h', amount, 'bad'), RangeError)
})

test('transfer validates all ids and refuses a self-transfer before mutation', () => {
  for (const field of ['from', 'to', 'key']) for (const value of ['', undefined, null, 1, {}, []]) {
    const args = { from: 'player', to: 'house', key: 'valid', [field]: value }
    const ledger = funded()
    const before = snapshot(ledger)
    assert.throws(() => transfer(ledger, args.from, args.to, 1n, args.key), TypeError)
    assert.deepEqual(ledger, before)
  }
  assert.throws(() => transfer(funded(), 'player', 'player', 1n, 'same'), TypeError)
})

test('D3: idempotency conflicts bind sender, recipient, and amount without mutation', () => {
  const ledger = funded()
  transfer(ledger, 'player', 'house', 10n, 'bound')
  const before = snapshot(ledger)
  for (const [from, to, amount] of [['bob', 'house', 10n], ['player', 'bob', 10n], ['player', 'house', 11n]]) {
    assert.deepEqual(transfer(ledger, from, to, amount, 'bound'), { ok: false, applied: false, reason: 'idempotency_conflict' })
    assert.deepEqual(ledger, before)
  }
})

test('a rejected insufficient transfer records no key, so a funded retry succeeds once', () => {
  const ledger = funded(5n)
  assert.deepEqual(transfer(ledger, 'player', 'bob', 10n, 'retry-key'), { ok: false, applied: false, reason: 'insufficient' })
  assert.equal(ledger.applied.has('retry-key'), false)
  fund(ledger, 'player', 100n)
  assert.equal(transfer(ledger, 'player', 'bob', 10n, 'retry-key').ok, true)
  assert.equal(balanceOf(ledger, 'bob'), 10n)
  assert.equal(transfer(ledger, 'player', 'bob', 10n, 'retry-key').applied, false)
  assert.equal(balanceOf(ledger, 'bob'), 10n)
})

test('placeBet takes the stake before the outcome and records an open bet', () => {
  const ledger = funded()
  assert.deepEqual(placeBet(ledger, bet), { ok: true, betId: 'b1', state: 'open' })
  assert.deepEqual(ledger.bets.get('b1'), { player: 'player', house: 'house', stake: 10n, state: 'open' })
  assert.equal(balanceOf(ledger, 'player'), 90n)
  assert.equal(balanceOf(ledger, 'house'), 1010n)
  assert.equal(legRows(ledger, 'bet:b1:stake'), 2)
  assert.equal(ledger.applied.size, 0)
})

test('placeBet replays report the current open, settled, or refunded state', () => {
  for (const state of ['open', 'settled', 'refunded']) {
    const ledger = funded()
    placeBet(ledger, bet)
    if (state === 'settled') settleBet(ledger, { betId: 'b1', payout: 0n })
    if (state === 'refunded') refundBet(ledger, { betId: 'b1' })
    const before = snapshot(ledger)
    assert.deepEqual(placeBet(ledger, bet), { ok: true, duplicate: true, state })
    assert.deepEqual(ledger, before)
  }
})

test('settleBet credits the payout, conserving value; replay does not double-pay', () => {
  const ledger = funded()
  placeBet(ledger, bet)
  assert.equal(settleBet(ledger, { betId: 'b1', payout: 25n }).ok, true)
  assert.equal(balanceOf(ledger, 'player'), 115n)
  assert.equal(balanceOf(ledger, 'house'), 985n)
  assert.equal(conserved(ledger, ['player', 'house', 'mint']), true)
  assert.equal(legRows(ledger, 'bet:b1:payout'), 2)
  const before = snapshot(ledger)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 25n }), { ok: true, duplicate: true })
  assert.equal(balanceOf(ledger, 'player'), 115n)
  assert.equal(balanceOf(ledger, 'house'), 985n)
  assert.deepEqual(ledger, before)
})

test('an unrelated transfer reusing a bet leg label neither pays the bet nor stands in for its stake', () => {
  // A promotional credit that happens to use the key 'b1:payout' must not make the real payout a no-op.
  const paid = funded()
  assert.deepEqual(transfer(paid, 'house', 'player', 10n, 'b1:payout'), { ok: true, applied: true })
  assert.equal(placeBet(paid, bet).ok, true)
  const before = balanceOf(paid, 'player')
  assert.deepEqual(settleBet(paid, { betId: 'b1', payout: 10n }), { ok: true })
  assert.equal(balanceOf(paid, 'player') - before, 10n)
  // An earlier purchase keyed 'b1:stake' must not count as this bet's stake: the player has nothing left.
  const broke = funded(10n)
  assert.deepEqual(transfer(broke, 'player', 'house', 10n, 'b1:stake'), { ok: true, applied: true })
  assert.deepEqual(placeBet(broke, bet), { ok: false, reason: 'insufficient' })
  assert.equal(broke.bets.get('b1').state, 'rejected')
  assert.equal(balanceOf(broke, 'player'), 0n)
})

test('D3: losing bet records a terminal zero payout and cannot later become a win', () => {
  const ledger = funded()
  placeBet(ledger, bet)
  settleBet(ledger, { betId: 'b1', payout: 0n })
  assert.equal(balanceOf(ledger, 'player'), 90n)
  assert.equal(balanceOf(ledger, 'house'), 1010n)
  assert.deepEqual(ledger.bets.get('b1'), { player: 'player', house: 'house', stake: 10n, state: 'settled', payout: 0n })
  const before = snapshot(ledger)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 0n }), { ok: true, duplicate: true })
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 50n, player: 'bob' }), { ok: false, reason: 'idempotency_conflict' })
  assert.deepEqual(ledger, before)
})

test('D3: placement cannot change payee, house, or stake; settlement uses stored parties', () => {
  const ledger = funded()
  placeBet(ledger, bet)
  const before = snapshot(ledger)
  for (const patch of [{ player: 'bob' }, { house: 'bob' }, { stake: 11n }]) {
    assert.deepEqual(placeBet(ledger, { ...bet, ...patch }), { ok: false, reason: 'idempotency_conflict' })
    assert.deepEqual(ledger, before)
  }
  settleBet(ledger, { betId: 'b1', payout: 25n, player: 'bob', house: 'bob' })
  assert.equal(balanceOf(ledger, 'player'), 115n)
  assert.equal(balanceOf(ledger, 'bob'), 0n)
})

test('an unaffordable placeBet is a terminal rejection: a later funded retry of the same betId is not placed', () => {
  // A bet id has exactly one fate. A stuck retry must not revive a bet the player was told was rejected.
  const ledger = funded(5n)
  assert.deepEqual(placeBet(ledger, bet), { ok: false, reason: 'insufficient' })
  assert.equal(balanceOf(ledger, 'player'), 5n)
  assert.equal(ledger.bets.get('b1').state, 'rejected')
  assert.equal(legRows(ledger, 'bet:b1:stake'), 0)
  fund(ledger, 'player', 10n)
  assert.deepEqual(placeBet(ledger, bet), { ok: false, duplicate: true, state: 'rejected', reason: 'insufficient' })
  assert.equal(balanceOf(ledger, 'player'), 15n)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 20n }), { ok: false, reason: 'rejected' })
  assert.deepEqual(refundBet(ledger, { betId: 'b1' }), { ok: false, reason: 'rejected' })
  assert.equal(placeBet(ledger, { ...bet, stake: 11n }).reason, 'idempotency_conflict')
  assert.equal(balanceOf(ledger, 'player'), 15n)
})

test('house_insufficient persists the decided payout; a funded retry with that payout completes exactly once', () => {
  const ledger = funded(100n, 5n)
  placeBet(ledger, bet)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 25n }), { ok: false, reason: 'house_insufficient' })
  assert.equal(balanceOf(ledger, 'player'), 90n)
  assert.equal(balanceOf(ledger, 'house'), 15n)
  assert.deepEqual({ ...ledger.bets.get('b1') }, { player: 'player', house: 'house', stake: 10n, state: 'settling', payout: 25n })
  fund(ledger, 'house', 1000n)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 25n }), { ok: true })
  assert.equal(balanceOf(ledger, 'player'), 115n)
  assert.equal(settleBet(ledger, { betId: 'b1', payout: 25n }).duplicate, true)
  assert.equal(balanceOf(ledger, 'player'), 115n)
})

test('after house_insufficient, a retry carrying a DIFFERENT payout is a conflict and pays nothing', () => {
  const ledger = funded(100n, 5n)
  placeBet(ledger, bet)
  settleBet(ledger, { betId: 'b1', payout: 25n })
  fund(ledger, 'house', 1000n)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 100n }), { ok: false, reason: 'idempotency_conflict' })
  assert.equal(balanceOf(ledger, 'player'), 90n)
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 25n }), { ok: true })
  assert.equal(balanceOf(ledger, 'player'), 115n)
})

test('settle and refund are mutually exclusive once either decision is persisted', () => {
  const settling = funded(100n, 5n)
  placeBet(settling, bet)
  settleBet(settling, { betId: 'b1', payout: 25n })
  assert.deepEqual(refundBet(settling, { betId: 'b1' }), { ok: false, reason: 'already_settled' })

  const refunding = funded(100n, 0n)
  placeBet(refunding, bet)
  transfer(refunding, 'house', 'mint', 10n, 'drain-house')
  assert.deepEqual(refundBet(refunding, { betId: 'b1' }), { ok: false, reason: 'house_insufficient' })
  assert.equal(refunding.bets.get('b1').state, 'refunding')
  assert.deepEqual(settleBet(refunding, { betId: 'b1', payout: 0n }), { ok: false, reason: 'already_refunded' })
  fund(refunding, 'house', 10n)
  assert.deepEqual(refundBet(refunding, { betId: 'b1' }), { ok: true })
  assert.equal(balanceOf(refunding, 'player'), 100n)
  assert.deepEqual(refundBet(refunding, { betId: 'b1' }), { ok: true, duplicate: true })
  assert.equal(balanceOf(refunding, 'player'), 100n)
})

test('D4: invalid payout throws before any money or bet state changes', () => {
  for (const payout of [NaN, undefined, -1n, -1, Infinity, 1, '25', null]) {
    const ledger = funded()
    const before = snapshot(ledger)
    assert.throws(() => settleBet(ledger, { betId: 'b1', payout }), payout === -1n ? RangeError : TypeError)
    assert.deepEqual(ledger, before)
  }
})

test('D4: all bet ids, parties, and stakes are validated before mutation', () => {
  const ledger = funded()
  const before = snapshot(ledger)
  for (const field of ['betId', 'player', 'house']) for (const value of ['', undefined, null, 1]) {
    assert.throws(() => placeBet(ledger, { ...bet, [field]: value }), TypeError)
  }
  assert.throws(() => placeBet(ledger, { ...bet, house: 'player' }), TypeError)
  for (const stake of [0n, -1n, 10, '10', undefined]) assert.throws(() => placeBet(ledger, { ...bet, stake }), typeof stake === 'bigint' ? RangeError : TypeError)
  for (const betId of ['', undefined, null, 1]) {
    assert.throws(() => settleBet(ledger, { betId, payout: 0n }), TypeError)
    assert.throws(() => refundBet(ledger, { betId }), TypeError)
  }
  assert.deepEqual(ledger, before)
})

test('unknown settlement and refund are refused without mutation', () => {
  const ledger = funded()
  const before = snapshot(ledger)
  assert.deepEqual(settleBet(ledger, { betId: 'missing', payout: 0n }), { ok: false, reason: 'unknown_bet' })
  assert.deepEqual(refundBet(ledger, { betId: 'missing' }), { ok: false, reason: 'unknown_bet' })
  assert.deepEqual(ledger, before)
})

test('refundBet returns an open stake once and prevents settlement', () => {
  const ledger = funded()
  placeBet(ledger, bet)
  assert.equal(refundBet(ledger, { betId: 'b1' }).ok, true)
  assert.equal(balanceOf(ledger, 'player'), 100n)
  assert.equal(balanceOf(ledger, 'house'), 1000n)
  assert.equal(ledger.bets.get('b1').state, 'refunded')
  assert.equal(legRows(ledger, 'bet:b1:refund'), 2)
  const before = snapshot(ledger)
  assert.deepEqual(refundBet(ledger, { betId: 'b1' }), { ok: true, duplicate: true })
  assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 0n }), { ok: false, reason: 'already_refunded' })
  assert.deepEqual(ledger, before)
  assert.equal(conserved(ledger, ['player', 'house', 'mint']), true)
})

test('refundBet refuses a settled bet, including a zero-payout loss', () => {
  for (const payout of [0n, 25n]) {
    const ledger = funded()
    placeBet(ledger, bet)
    settleBet(ledger, { betId: 'b1', payout })
    const before = snapshot(ledger)
    assert.deepEqual(refundBet(ledger, { betId: 'b1' }), { ok: false, reason: 'already_settled' })
    assert.deepEqual(ledger, before)
  }
})

test('conserved compares an exact BigInt total with no epsilon', () => {
  const ledger = createLedger()
  ledger.journal.push({ account: 'p', amount: 1n })
  assert.equal(conserved(ledger, ['p']), false)
  ledger.journal.push({ account: 'h', amount: -1n })
  assert.equal(conserved(ledger, ['p', 'h']), true)
})

test('a journal reloaded with non-BigInt amounts fails closed instead of disabling the overdraft check', () => {
  const ledger = funded(100n)
  const reloaded = JSON.parse(JSON.stringify(ledger, (k, v) => (typeof v === 'bigint' ? String(v) : v)))
  reloaded.applied = new Map()
  reloaded.bets = new Map()
  assert.throws(() => balanceOf(reloaded, 'player'), TypeError)
  assert.throws(() => transfer(reloaded, 'player', 'bob', 1000n, 'k'), TypeError)
})

test('settle and refund continue only from the states they own; any other state is refused', () => {
  for (const state of ['void', 'placing', 'cancelled']) {
    const ledger = funded()
    placeBet(ledger, bet)
    ledger.bets.set('b1', Object.freeze({ ...ledger.bets.get('b1'), state }))
    const before = snapshot(ledger)
    assert.deepEqual(settleBet(ledger, { betId: 'b1', payout: 1000n }), { ok: false, reason: 'invalid_state' })
    assert.deepEqual(refundBet(ledger, { betId: 'b1' }), { ok: false, reason: 'invalid_state' })
    assert.deepEqual(ledger, before)
  }
})

test('conserved needs a real list of distinct accounts; it cannot see a double payment', () => {
  const ledger = funded()
  for (const accounts of ['player', [], ['player', 'player'], [''], [1]]) assert.throws(() => conserved(ledger, accounts), TypeError)
  placeBet(ledger, bet)
  settleBet(ledger, { betId: 'b1', payout: 25n })
  assert.equal(conserved(ledger, ['player', 'house', 'mint']), true)
})

test('conserved refuses an account list with a getter before it runs', () => {
  const ledger = createLedger()
  let reads = 0
  const accounts = ['player']
  Object.defineProperty(accounts, 0, { enumerable: true, get: () => { reads++; return 'player' } })
  assert.throws(() => conserved(ledger, accounts), /getter or setter/)
  assert.equal(reads, 0)
})

test('conserved reads the account list once and refuses a list whose length is not a valid array length', () => {
  const ledger = createLedger()
  ledger.journal.push({ account: 'funding', amount: -1n }, { account: 'player', amount: 1n })
  const withLength = (list, length) => new Proxy(list, { get: (target, key) => (key === 'length' ? length : target[key]) })
  for (const length of [-1, NaN, '1', 1.5]) assert.throws(() => conserved(ledger, withLength(['player'], length)), TypeError)
  // Even a plausible length cannot be trusted from a Proxy, so a Proxy list is refused outright.
  const shrinking = new Proxy(['player'], { get: (target, key) => (key === 'length' ? 0 : target[key]) })
  assert.throws(() => conserved(ledger, shrinking), /plain array/)
  assert.throws(() => conserved(ledger, new Proxy(['player'], {})), /plain array/)
  assert.equal(conserved(ledger, ['player']), false)
})
