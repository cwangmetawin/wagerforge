import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSelfExcluded, shouldBlockBet, egressIpWhitelisted } from './self-exclusion.mjs'

const ex = [{ playerId: 'p1', untilMs: 2000 }]

test('isSelfExcluded is true only within an active window on the server clock', () => {
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions: ex, nowMs: 1000 }), true)  // before until
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions: ex, nowMs: 2000 }), false) // at/after until
  assert.equal(isSelfExcluded({ playerId: 'p2', exclusions: ex, nowMs: 1000 }), false) // not excluded
})

test('shouldBlockBet blocks an actively-excluded player', () => {
  assert.equal(shouldBlockBet({ playerId: 'p1', exclusions: ex, nowMs: 1500 }), true)
  assert.equal(shouldBlockBet({ playerId: 'p1', exclusions: ex, nowMs: 9999 }), false)
})

test('egressIpWhitelisted gates the cloud egress IP', () => {
  assert.equal(egressIpWhitelisted({ ip: '1.2.3.4', whitelist: ['1.2.3.4'] }), true)
  assert.equal(egressIpWhitelisted({ ip: '9.9.9.9', whitelist: ['1.2.3.4'] }), false)
})
