import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as selfExclusion from './self-exclusion.mjs'

// Most tests are about the records; give them a register answer fresh as of the server's now.
const fresh = (args) => ({ maxAgeMs: 60_000, asOfMs: Number.isSafeInteger(args?.nowMs) ? args.nowMs : 0, ...args })
const isSelfExcluded = (args) => selfExclusion.isSelfExcluded(fresh(args))
const shouldBlockBet = (args) => selfExclusion.shouldBlockBet(fresh(args))
const { egressIpWhitelisted } = selfExclusion

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

test('null untilMs excludes indefinitely, including at the largest server timestamp', () => {
  const exclusions = [{ playerId: 'p1', untilMs: null }]
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions, nowMs: 0 }), true)
  assert.equal(shouldBlockBet({ playerId: 'p1', exclusions, nowMs: Number.MAX_SAFE_INTEGER }), true)
  assert.equal(isSelfExcluded({ playerId: 'p2', exclusions, nowMs: 0 }), false)
})

test('D6: missing untilMs throws instead of allowing an excluded player', () => {
  for (const check of [isSelfExcluded, shouldBlockBet]) {
    assert.throws(() => check({ playerId: 'p1', exclusions: [{ playerId: 'p1' }], nowMs: 1000 }))
  }
})

test('D6: NaN or invalid server timestamps throw instead of allowing play', () => {
  for (const check of [isSelfExcluded, shouldBlockBet]) for (const nowMs of [NaN, undefined, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, null, '1000', 1000n]) {
    assert.throws(() => check({ playerId: 'p1', exclusions: ex, nowMs }))
  }
})

test('self-exclusion validates playerId and the exclusions container', () => {
  for (const playerId of ['', undefined, null, 1, {}, []]) {
    assert.throws(() => isSelfExcluded({ playerId, exclusions: ex, nowMs: 1000 }), TypeError)
  }
  for (const exclusions of [undefined, null, {}, 'p1', new Set()]) {
    assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions, nowMs: 1000 }), TypeError)
  }
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions: [], nowMs: 0 }), false)
})

test('every record is validated even after a match or for a different player', () => {
  const invalid = [null, undefined, 1, 'p1', {}, [], { playerId: '', untilMs: 2000 }, { playerId: 1, untilMs: 2000 }, { playerId: 'other' }]
  for (const record of invalid) for (const playerId of ['p1', 'unknown']) {
    assert.throws(() => isSelfExcluded({ playerId, exclusions: [...ex, record], nowMs: 1000 }))
  }
  assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions: new Array(1), nowMs: 0 }))
})

test('untilMs must be a safe integer or explicit null; expired negative deadlines are valid', () => {
  for (const untilMs of [undefined, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, '2000', 2000n, false]) {
    assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions: [{ playerId: 'p1', untilMs }], nowMs: 1000 }))
  }
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions: [{ playerId: 'p1', untilMs: -1 }], nowMs: 0 }), false)
  assert.equal(isSelfExcluded({ playerId: 'p1', exclusions: [{ playerId: 'p1', untilMs: Number.MAX_SAFE_INTEGER }], nowMs: Number.MAX_SAFE_INTEGER - 1 }), true)
})

test('egress whitelist uses exact matches without prefix or whitespace normalization', () => {
  for (const whitelist of [[], [''], ['1.2.3.4/32'], ['1.2.3.40'], [' 1.2.3.4']]) {
    assert.equal(egressIpWhitelisted({ ip: '1.2.3.4', whitelist }), false)
  }
})

test('egress whitelist rejects malformed input and validates the entire array', () => {
  for (const ip of ['', undefined, null, 1, {}, []]) {
    assert.throws(() => egressIpWhitelisted({ ip, whitelist: ['1.2.3.4'] }), TypeError)
  }
  for (const whitelist of [undefined, null, '1.2.3.4', {}, [1], [null], ['1.2.3.4', {}], new Array(1)]) {
    assert.throws(() => egressIpWhitelisted({ ip: '1.2.3.4', whitelist }), TypeError)
  }
})

test('exclusion data is plain data walked by index: a getter is refused before it runs, an inherited field never counts, and no record can hide', () => {
  let reads = 0
  const flaky = { playerId: 'p1' }
  Object.defineProperty(flaky, 'untilMs', { enumerable: true, get: () => (reads++ < 2 ? 2000 : undefined) })
  assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions: [flaky], nowMs: 1000 }), /getter or setter/)
  const ip = ['10.0.0.1']
  Object.defineProperty(ip, 0, { enumerable: true, get: () => { reads++; return '10.0.0.1' } })
  assert.throws(() => egressIpWhitelisted({ ip: '10.0.0.1', whitelist: ip }), /getter or setter/)
  assert.equal(reads, 0)
  const inherited = Object.create({ untilMs: null })
  inherited.playerId = 'p1'
  assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions: [inherited], nowMs: 1000 }), TypeError)
  const hidden = [{ playerId: 'p1', untilMs: null }]
  hidden[Symbol.iterator] = function* () {}
  hidden.forEach = () => {}
  assert.equal(shouldBlockBet({ playerId: 'p1', exclusions: hidden, nowMs: 1000 }), true)
  const list = ['10.0.0.1']
  list.includes = () => true
  list[Symbol.iterator] = function* () {}
  assert.equal(egressIpWhitelisted({ ip: '10.9.9.9', whitelist: list }), false)
})

test('the register answer must say when it was given: missing, future-dated or stale data refuses play', () => {
  const records = [{ playerId: 'p1', untilMs: null }]
  for (const check of [selfExclusion.isSelfExcluded, selfExclusion.shouldBlockBet]) {
    // A failed lookup turned into an empty list must not clear the player.
    assert.throws(() => check({ playerId: 'p1', exclusions: [], nowMs: 10_000, maxAgeMs: 60_000 }), TypeError)
    assert.throws(() => check({ playerId: 'p1', exclusions: records, nowMs: 10_000, asOfMs: 10_000 }), RangeError)
    assert.throws(() => check({ playerId: 'p1', exclusions: records, nowMs: 10_000, asOfMs: 10_001, maxAgeMs: 60_000 }), /future/)
    assert.throws(() => check({ playerId: 'p1', exclusions: [], nowMs: 100_000, asOfMs: 39_999, maxAgeMs: 60_000 }), /stale/)
    assert.equal(check({ playerId: 'p1', exclusions: [], nowMs: 100_000, asOfMs: 40_000, maxAgeMs: 60_000 }), false)
  }
})

test('a list whose length is not a valid array length throws instead of looking empty', () => {
  // A Proxy can report any length for a real array; a loop bounded by it would see no records.
  const withLength = (list, length) => new Proxy(list, { get: (target, key) => (key === 'length' ? length : target[key]) })
  for (const length of [-1, NaN, 'not-a-length']) {
    const exclusions = withLength([{ playerId: 'p1', untilMs: null }], length)
    assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions, nowMs: 1000 }), TypeError)
    assert.throws(() => shouldBlockBet({ playerId: 'p1', exclusions, nowMs: 1000 }), TypeError)
    assert.throws(() => egressIpWhitelisted({ ip: '1.2.3.4', whitelist: withLength(['1.2.3.4'], length) }), TypeError)
  }
})

test('a Proxy list is refused even when it reports a plausible length: it could hide an exclusion', () => {
  const hiding = new Proxy([{ playerId: 'p1', untilMs: null }], { get: (target, key) => (key === 'length' ? 0 : target[key]) })
  assert.throws(() => isSelfExcluded({ playerId: 'p1', exclusions: hiding, nowMs: 1000 }), /plain array/)
  assert.throws(() => egressIpWhitelisted({ ip: '1.2.3.4', whitelist: new Proxy(['1.2.3.4'], {}) }), /plain array/)
})

test('the arguments object is plain data too: a getter, a Proxy or an inherited field is refused before anything runs', () => {
  let calls = 0
  const args = fresh({ playerId: 'p1', nowMs: 1000 })
  Object.defineProperty(args, 'exclusions', { enumerable: true, get: () => { calls++; return [] } })
  assert.throws(() => selfExclusion.isSelfExcluded(args), /getter or setter/)
  assert.throws(() => selfExclusion.shouldBlockBet(args), /getter or setter/)
  let traps = 0
  const spy = new Proxy({}, { get: () => { traps++; return undefined } })
  assert.throws(() => selfExclusion.isSelfExcluded(new Proxy(fresh({ playerId: 'p1', exclusions: ex, nowMs: 1000 }), spy)), /Proxy/)
  assert.throws(() => egressIpWhitelisted(new Proxy({ ip: '1.2.3.4', whitelist: ['1.2.3.4'] }, spy)), /Proxy/)
  assert.throws(() => selfExclusion.isSelfExcluded(Object.create(fresh({ playerId: 'p1', exclusions: ex, nowMs: 1000 }))), TypeError)
  assert.deepEqual([calls, traps], [0, 0])
})
