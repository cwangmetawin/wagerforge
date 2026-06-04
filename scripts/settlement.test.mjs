import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, balanceOf, transfer } from './ledger.mjs'
import { settleBet, conserved } from './settlement.mjs'

function fund(ledger, account, amount) {
  ledger.journal.push({ account: 'mint', amount: -amount, idemKey: `seed:${account}:${amount}:${ledger.journal.length}` })
  ledger.journal.push({ account, amount, idemKey: `seed:${account}:${amount}:${ledger.journal.length}` })
}

test('transfer is atomic, overdraft-safe, and balanced', () => {
  const L = createLedger(); fund(L, 'alice', 100)
  const r = transfer(L, 'alice', 'bob', 30, 'k1')
  assert.equal(r.ok, true)
  assert.equal(balanceOf(L, 'alice'), 70)
  assert.equal(balanceOf(L, 'bob'), 30)
  const r2 = transfer(L, 'bob', 'alice', 1000, 'k2')
  assert.equal(r2.ok, false)
  assert.equal(r2.reason, 'insufficient')
  assert.equal(balanceOf(L, 'bob'), 30)
})

test('transfer is idempotent on idemKey (no double-apply)', () => {
  const L = createLedger(); fund(L, 'alice', 100)
  transfer(L, 'alice', 'bob', 30, 'dup')
  const again = transfer(L, 'alice', 'bob', 30, 'dup')
  assert.equal(again.applied, false)
  assert.equal(balanceOf(L, 'alice'), 70)
  assert.equal(balanceOf(L, 'bob'), 30)
})

test('settleBet moves stake and payout, conserving value', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  const r = settleBet(L, { betId: 'b1', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r.ok, true)
  assert.equal(balanceOf(L, 'player'), 115)
  assert.equal(balanceOf(L, 'house'), 985)
  assert.equal(conserved(L, ['player', 'house', 'mint']), true)
})

test('settleBet is idempotent — replay does not double-pay', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  settleBet(L, { betId: 'b2', player: 'player', house: 'house', stake: 10, payout: 25 })
  settleBet(L, { betId: 'b2', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(balanceOf(L, 'player'), 115)
  assert.equal(balanceOf(L, 'house'), 985)
})

test('crash between legs then replay completes exactly once', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  transfer(L, 'player', 'house', 10, 'b3:stake')
  assert.equal(balanceOf(L, 'player'), 90)
  settleBet(L, { betId: 'b3', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(balanceOf(L, 'player'), 115)
  assert.equal(balanceOf(L, 'house'), 985)
})

test('losing bet (payout 0) only takes stake', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 1000)
  settleBet(L, { betId: 'b4', player: 'player', house: 'house', stake: 10, payout: 0 })
  assert.equal(balanceOf(L, 'player'), 90)
  assert.equal(balanceOf(L, 'house'), 1010)
})

test('settleBet refuses when the player cannot cover the stake', () => {
  const L = createLedger(); fund(L, 'player', 5); fund(L, 'house', 1000)
  const r = settleBet(L, { betId: 'b5', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'insufficient')
  assert.equal(balanceOf(L, 'player'), 5)
})

test('settleBet surfaces house_insufficient, then retry completes exactly once after funding', () => {
  const L = createLedger(); fund(L, 'player', 100); fund(L, 'house', 5)
  const r = settleBet(L, { betId: 'b6', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'house_insufficient')
  assert.equal(balanceOf(L, 'player'), 90) // stake taken, payout pending
  assert.equal(balanceOf(L, 'house'), 15)  // 5 + 10
  fund(L, 'house', 1000)
  const r2 = settleBet(L, { betId: 'b6', player: 'player', house: 'house', stake: 10, payout: 25 })
  assert.equal(r2.ok, true)
  assert.equal(balanceOf(L, 'player'), 115) // 90 + 25, exactly once
  settleBet(L, { betId: 'b6', player: 'player', house: 'house', stake: 10, payout: 25 }) // duplicate
  assert.equal(balanceOf(L, 'player'), 115) // no double pay
})

test('a rejected (insufficient) transfer does not record its idemKey, so a funded retry succeeds once', () => {
  const L = createLedger(); fund(L, 'alice', 5)
  const r = transfer(L, 'alice', 'bob', 10, 'retry-key')
  assert.equal(r.ok, false)
  fund(L, 'alice', 100)
  const r2 = transfer(L, 'alice', 'bob', 10, 'retry-key')
  assert.equal(r2.ok, true)
  assert.equal(balanceOf(L, 'bob'), 10)
  const r3 = transfer(L, 'alice', 'bob', 10, 'retry-key') // now a dup
  assert.equal(r3.applied, false)
  assert.equal(balanceOf(L, 'bob'), 10)
})
