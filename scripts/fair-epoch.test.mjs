import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { byteStream, nextFloat, hashServerSeed, fairFloat, verify } from './fair-rng.mjs'
import { verifyEpoch } from './fair-epoch.mjs'

const SERVER = 'epoch-server-seed-0001'
const CLIENT = 'player-browser-seed-01'
const COMMIT = hashServerSeed(SERVER)
// 1 = player wins a 50/50 coin flip, 0 = loses.
const derive = (stream) => Number(nextFloat(stream) < 0.5)
const outcome = (nonce, clientSeed = CLIENT, serverSeed = SERVER) => derive(byteStream(serverSeed, clientSeed, nonce))
const round = (nonce, clientSeed = CLIENT, serverSeed = SERVER) => ({ nonce, clientSeed, outcome: outcome(nonce, clientSeed, serverSeed) })
const honest = (n) => Array.from({ length: n }, (_, nonce) => round(nonce))
// The player's own log, in the order the client wrote it: commitment first, then a fresh seed, then
// one receipt per accepted bet exactly as the server answered at bet time.
const logFor = (rounds, { commitment = COMMIT, clientSeed = CLIENT } = {}) => [
  { type: 'commitment', value: commitment },
  { type: 'clientSeed', value: clientSeed },
  ...rounds.map((r) => ({ type: 'bet', nonce: r.nonce, outcome: r.outcome })),
]
const epoch = (rounds, playerLog = logFor(rounds), serverSeed = SERVER) => verifyEpoch({ serverSeed, playerLog, rounds, deriveFn: derive })

test('an honest epoch passes, with or without nonces in the receipts', () => {
  assert.deepEqual(epoch(honest(12)), { status: 'PASS', rounds: 12 })
  const withoutNonces = logFor(honest(12)).map(({ nonce, ...entry }) => entry)
  assert.deepEqual(epoch(honest(12), withoutNonces), { status: 'PASS', rounds: 12 })
})

test('skipping the nonces that would make the player win: every round verifies, the epoch fails', () => {
  const losers = []
  for (let n = 0; losers.length < 8; n++) if (outcome(n) === 0) losers.push(round(n))
  assert.ok(losers.some((r, i) => r.nonce !== i), 'the attack must actually skip at least one nonce')
  for (const r of losers) assert.equal(verify(SERVER, COMMIT, CLIENT, r.nonce, derive, r.outcome).ok, true)
  assert.equal(epoch(losers).reason, 'nonce_sequence')
})

test('reused and reordered nonces fail the epoch', () => {
  assert.deepEqual(epoch([0, 0, 0].map((n) => round(n))), { status: 'FAIL', reason: 'nonce_sequence', index: 1 })
  assert.deepEqual(epoch([1, 0, 2].map((n) => round(n))), { status: 'FAIL', reason: 'nonce_sequence', index: 0 })
})

test('a history re-sorted after play cannot hide the order the player actually saw', () => {
  const played = [1, 0, 2].map((n) => round(n))
  const sortedExport = [0, 1, 2].map((n) => round(n))
  assert.deepEqual(epoch(sortedExport, logFor(played)), { status: 'FAIL', reason: 'receipt', index: 0 })
})

test('a client seed the server chose (not the one the player generated) fails, even though each round verifies', () => {
  const swapped = honest(4).map((r) => round(r.nonce, 'server-picked-seed'))
  for (const r of swapped) assert.equal(verify(SERVER, COMMIT, 'server-picked-seed', r.nonce, derive, r.outcome).ok, true)
  assert.deepEqual(epoch(swapped, logFor(honest(4))), { status: 'FAIL', reason: 'client_seed', index: 0 })
})

test('a substituted server seed fails against the commitment the PLAYER saved', () => {
  const other = 'substituted-server-seed'
  const rounds = honest(3).map((r) => round(r.nonce, CLIENT, other))
  assert.equal(verify(other, hashServerSeed(other), CLIENT, 0, derive, rounds[0].outcome).ok, true)
  assert.deepEqual(epoch(rounds, logFor(rounds), other), { status: 'FAIL', reason: 'commitment' })
})

test('a tampered outcome fails at its index; a receipt that disagrees with the history fails too', () => {
  const rounds = honest(5)
  const tampered = rounds.map((r, i) => (i === 3 ? { ...r, outcome: 1 - r.outcome } : r))
  assert.deepEqual(epoch(tampered, logFor(tampered)), { status: 'FAIL', reason: 'outcome', index: 3 })
  const log = logFor(rounds)
  log[2 + 3] = { ...log[2 + 3], outcome: 1 - rounds[3].outcome }
  assert.deepEqual(epoch(rounds, log), { status: 'FAIL', reason: 'receipt', index: 3 })
})

test('a history shorter or longer than the player\'s own receipts fails (hidden or invented bets)', () => {
  assert.deepEqual(epoch(honest(5), logFor(honest(6))), { status: 'FAIL', reason: 'history_incomplete' })
  assert.deepEqual(epoch(honest(6), logFor(honest(5))), { status: 'FAIL', reason: 'history_incomplete' })
})

test('a client seed recorded before the commitment fails: the operator could have ground the server seed', () => {
  const rounds = honest(4)
  const [commitment, seed, ...bets] = logFor(rounds)
  assert.deepEqual(epoch(rounds, [seed, commitment, ...bets]), { status: 'FAIL', reason: 'seed_order' })
})

test('missing evidence is UNVERIFIABLE, never PASS', () => {
  const rounds = honest(3)
  const [commitment, seed, ...bets] = logFor(rounds)
  assert.deepEqual(epoch(rounds, [seed, ...bets]), { status: 'UNVERIFIABLE', missing: ['commitment'] })
  assert.deepEqual(epoch(rounds, [commitment, ...bets]), { status: 'UNVERIFIABLE', missing: ['clientSeed'] })
  const unrevealed = verifyEpoch({ serverSeed: undefined, playerLog: logFor(rounds), rounds, deriveFn: derive })
  assert.deepEqual(unrevealed, { status: 'UNVERIFIABLE', missing: ['serverSeed'] })
  const noLog = verifyEpoch({ serverSeed: SERVER, playerLog: undefined, rounds, deriveFn: derive })
  assert.deepEqual(noLog, { status: 'UNVERIFIABLE', missing: ['playerLog'] })
})

test('invalid evidence throws instead of passing, even for an empty epoch', () => {
  assert.throws(() => epoch([], logFor([], { clientSeed: 'a:b' })), TypeError)
  assert.throws(() => epoch([], logFor([], { commitment: 'not-a-sha256' })), TypeError)
  assert.throws(() => epoch([], logFor([], { commitment: '' })), TypeError)
  assert.throws(() => epoch([], [...logFor([]), { type: 'commitment', value: COMMIT }]), TypeError)
  assert.throws(() => epoch([], [...logFor([]), { type: 'note', value: 'x' }]), TypeError)
})

test('input arrays that carry their own methods cannot skip verification', () => {
  const bad = [{ nonce: 99, clientSeed: 'operator-substituted', outcome: 1 }]
  bad.entries = () => [].entries()
  bad.forEach = () => {}
  bad[Symbol.iterator] = function* () {}
  bad.map = () => []
  const log = logFor(honest(1))
  log.filter = () => []
  log[Symbol.iterator] = function* () {}
  const result = epoch(bad, log)
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason, 'client_seed')
})

test('a getter in the evidence is refused before it runs', () => {
  let reads = 0
  const flaky = { clientSeed: CLIENT, outcome: outcome(0) }
  Object.defineProperty(flaky, 'nonce', { enumerable: true, get: () => (reads++ < 1 ? 0 : 7) })
  assert.throws(() => epoch([flaky], logFor(honest(1))), /getter or setter/)
  assert.equal(reads, 0)
})

// A getter is code, and code can do more than return two values: this one makes every later write
// to index 10 of any array store 8, so the derived outcome, the history and the receipt would agree.
test('evidence with a getter cannot rewrite built-ins mid-check and pass a history that does not match', () => {
  const derived = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
  const claimed = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 99]
  const store8 = { configurable: true, set() { Object.defineProperty(this, 10, { value: 8, writable: true, enumerable: true, configurable: true }) } }
  let ran = false
  const tampered = { clientSeed: CLIENT, outcome: claimed }
  Object.defineProperty(tampered, 'nonce', { enumerable: true, get: () => { ran = true; Object.defineProperty(Array.prototype, 10, store8); return 0 } })
  const playerLog = [...logFor([]), { type: 'bet', nonce: 0, outcome: claimed }]
  let result
  try {
    result = verifyEpoch({ serverSeed: SERVER, playerLog, rounds: [tampered], deriveFn: derived })
  } catch (error) {
    result = error
  } finally {
    delete Array.prototype[10]
  }
  assert.ok(result instanceof TypeError && /getter or setter/.test(result.message), JSON.stringify(result))
  assert.equal(ran, false)
})

test('only own fields count: an inherited outcome or state never fills a missing field', () => {
  // Object.prototype is given the fields the record lacks, as a merge of untrusted JSON could do.
  // Every fixture is built first; the fields are removed in finally, so they cannot reach other tests.
  const rounds = [{ nonce: 0, clientSeed: CLIENT }]
  const playerLog = logFor(honest(1))
  const inheritedOutcome = outcome(0)
  let result
  try {
    Object.prototype.outcome = inheritedOutcome
    Object.prototype.state = 'voided'
    result = epoch(rounds, playerLog)
  } catch (error) {
    result = error
  } finally {
    delete Object.prototype.outcome
    delete Object.prototype.state
  }
  assert.deepEqual([Object.hasOwn(Object.prototype, 'outcome'), Object.hasOwn(Object.prototype, 'state')], [false, false])
  assert.ok(result instanceof TypeError && /needs the outcome/.test(result.message), JSON.stringify(result))
  assert.throws(() => epoch([Object.assign(Object.create({ outcome: outcome(0) }), { nonce: 0, clientSeed: CLIENT })], logFor(honest(1))), /plain object/)
})

test('a Proxy record is refused without running any of its traps', () => {
  let traps = 0
  const spy = new Proxy({}, { get: () => { traps++; return undefined } })
  assert.throws(() => epoch([new Proxy(round(0), spy)], logFor(honest(1))), /Proxy/)
  assert.throws(() => epoch(honest(1), [...logFor([]), new Proxy({ type: 'bet', nonce: 0, outcome: outcome(0) }, spy)]), /Proxy/)
  assert.equal(traps, 0)
})

test('an over-long serverSeed throws even when other evidence is missing', () => {
  const long = '\u00e9'.repeat(33) // 66 UTF-8 bytes
  assert.throws(() => verifyEpoch({ serverSeed: long, rounds: [], deriveFn: derive }), RangeError)
  assert.throws(() => verifyEpoch({ serverSeed: long, playerLog: [], rounds: [], deriveFn: derive }), RangeError)
})

// Gross payout of the coin flip: a win returns twice the stake.
const payoutFn = (o, stake) => (o === 1 ? 2n * stake : 0n)
const paidLog = (rounds, stake = 10n) => logFor(rounds).map((e) => (e.type === 'bet' ? { ...e, stake, payout: payoutFn(e.outcome, stake) } : e))
const withPayouts = (rounds, playerLog) => verifyEpoch({ serverSeed: SERVER, playerLog, rounds, deriveFn: derive, payoutFn })

test('receipts with stakes and payouts are checked against the game\'s own payout rule', () => {
  const rounds = honest(6)
  assert.deepEqual(withPayouts(rounds, paidLog(rounds)), { status: 'PASS', rounds: 6 })
  const win = rounds.findIndex((r) => r.outcome === 1)
  const underpaid = paidLog(rounds)
  underpaid[2 + win] = { ...underpaid[2 + win], payout: 15n }
  assert.deepEqual(withPayouts(rounds, underpaid), { status: 'FAIL', reason: 'payout', index: win })
  assert.deepEqual(epoch(rounds, paidLog(rounds)), { status: 'UNVERIFIABLE', missing: ['payoutFn'] })
})

test('a voided round that would have won fails the epoch; a voided loser does not', () => {
  const rounds = honest(8)
  const voidAt = (i) => {
    const history = rounds.map((r, j) => (j === i ? { nonce: r.nonce, clientSeed: r.clientSeed, state: 'voided' } : r))
    const log = paidLog(rounds).map((e, j) => (j === 2 + i ? { type: 'bet', nonce: rounds[i].nonce, state: 'voided', stake: 10n } : e))
    return withPayouts(history, log)
  }
  const win = rounds.findIndex((r) => r.outcome === 1)
  const loss = rounds.findIndex((r) => r.outcome === 0)
  assert.deepEqual(voidAt(win), { status: 'FAIL', reason: 'voided_win', index: win })
  assert.deepEqual(voidAt(loss), { status: 'PASS', rounds: 8 })
  const log = paidLog(rounds).map((e, j) => (j === 2 + loss ? { type: 'bet', state: 'voided', stake: 10n } : e))
  assert.deepEqual(epoch(rounds.map((r, j) => (j === loss ? { ...r, state: 'voided' } : r)), log), { status: 'UNVERIFIABLE', missing: ['payoutFn'] })
})

test('the server history and the player receipt must agree on whether a round was voided', () => {
  const rounds = honest(3)
  const log = paidLog(rounds).map((e, j) => (j === 3 ? { ...e, state: 'voided' } : e))
  assert.deepEqual(withPayouts(rounds, log), { status: 'FAIL', reason: 'receipt', index: 1 })
})

test('malformed receipts throw: a payout or a void without its stake, or an unknown state', () => {
  const rounds = honest(1)
  const [c, seed, bet] = paidLog(rounds)
  assert.throws(() => withPayouts(rounds, [c, seed, { ...bet, stake: undefined }]), TypeError)
  assert.throws(() => withPayouts(rounds, [c, seed, { ...bet, state: 'lost' }]), TypeError)
  assert.throws(() => withPayouts([{ ...rounds[0], state: 'paused' }], [c, seed, bet]), TypeError)
  assert.throws(() => verifyEpoch({ serverSeed: SERVER, playerLog: [c, seed, bet], rounds, deriveFn: derive, payoutFn: 'x' }), TypeError)
})

test('single-float games verify per epoch through the ctx argument', () => {
  const crash = (stream, ctx) => Math.max(1, Math.floor((100 * 0.99) / (1 - fairFloat(ctx.serverSeed, ctx.clientSeed, ctx.nonce))) / 100)
  const rounds = Array.from({ length: 4 }, (_, nonce) => ({ nonce, clientSeed: CLIENT, outcome: crash(null, { serverSeed: SERVER, clientSeed: CLIENT, nonce }) }))
  assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog: logFor(rounds), rounds, deriveFn: crash }), { status: 'PASS', rounds: 4 })
})

test('malformed history throws instead of passing', () => {
  assert.throws(() => epoch('not an array', logFor([])), TypeError)
  assert.throws(() => epoch([{ nonce: 0, clientSeed: CLIENT }], logFor(honest(1))), TypeError)
  assert.throws(() => epoch([, round(1)], logFor(honest(2))), TypeError)
  assert.throws(() => verifyEpoch({ serverSeed: SERVER, playerLog: logFor([]), rounds: [], deriveFn: 'nope' }), TypeError)
})

// A Proxy can report any length for a real array; a loop bounded by it would see an empty list.
const withLength = (list, length) => new Proxy(list, { get: (target, key) => (key === 'length' ? length : target[key]) })

test('a list whose length is not a valid array length throws instead of looking empty', () => {
  const hidden = [{ nonce: 99, clientSeed: 'operator-substituted', outcome: 999 }]
  for (const length of [-1, NaN, 'not-a-length']) {
    assert.throws(() => epoch(withLength(hidden, length), logFor([])), TypeError)
    assert.throws(() => epoch(honest(1), withLength(logFor(honest(1)), length)), TypeError)
  }
})

test('each round is derived once, so a receipt cannot match a different derivation than its round', () => {
  let calls = 0
  const counting = () => ++calls
  const playerLog = [...logFor([]), { type: 'bet', nonce: 0, outcome: 2 }]
  const result = verifyEpoch({ serverSeed: SERVER, playerLog, rounds: [{ nonce: 0, clientSeed: CLIENT, outcome: 1 }], deriveFn: counting })
  assert.deepEqual(result, { status: 'FAIL', reason: 'receipt', index: 0 })
  assert.equal(calls, 1)
})

test('values outside the protocol throw: an invalid round client seed or an outcome that is not finite numbers', () => {
  const one = logFor(honest(1))
  assert.throws(() => epoch([{ ...round(0), clientSeed: '' }], one), TypeError)
  assert.throws(() => epoch([{ ...round(0), clientSeed: 'a:b' }], one), TypeError)
  for (const bad of [NaN, Infinity, 'win', { win: 1 }, [1, NaN]]) {
    assert.throws(() => epoch([{ ...round(0), outcome: bad }], one), TypeError)
    assert.throws(() => epoch(honest(1), [...logFor([]), { type: 'bet', nonce: 0, outcome: bad }]), TypeError)
  }
})

test('a derived outcome with a getter is refused before the getter runs', () => {
  let reads = 0
  const shifting = () => {
    const outcome = []
    Object.defineProperty(outcome, 0, { enumerable: true, get: () => (++reads < 3 ? 1 : 2) })
    return outcome
  }
  const playerLog = [...logFor([]), { type: 'bet', nonce: 0, outcome: [2] }]
  assert.throws(() => verifyEpoch({ serverSeed: SERVER, playerLog, rounds: [{ nonce: 0, clientSeed: CLIENT, outcome: [1] }], deriveFn: shifting }), /deriveFn must return/)
  assert.equal(reads, 0)
})

test('an outcome hole stays a hole even when Array.prototype supplies the index', () => {
  const had = Object.hasOwn(Array.prototype, 0)
  Array.prototype[0] = 7
  try {
    const holey = new Array(1)
    assert.throws(() => epoch([{ nonce: 0, clientSeed: CLIENT, outcome: holey }], [...logFor([]), { type: 'bet', nonce: 0, outcome: [7] }]), TypeError)
  } finally {
    if (!had) delete Array.prototype[0]
  }
})

test('every protocol-valid outcome is accepted: deep nesting and non-enumerable own indices', () => {
  let deep = 1
  for (let i = 0; i < 10000; i++) deep = [deep]
  const hidden = [1]
  Object.defineProperty(hidden, 0, { enumerable: false, value: 1 })
  for (const value of [deep, hidden]) {
    const derive = () => value
    const rounds = [{ nonce: 0, clientSeed: CLIENT, outcome: value }]
    assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog: logFor(rounds), rounds, deriveFn: derive }), { status: 'PASS', rounds: 1 })
  }
})

test('a payout rule that returns no valid amount throws instead of passing a voided round', () => {
  const rounds = honest(1).map((r) => ({ ...r, state: 'voided' }))
  const playerLog = logFor(rounds).map((e) => (e.type === 'bet' ? { ...e, state: 'voided', stake: 10 } : e))
  for (const due of [NaN, -Infinity, -1, Infinity]) {
    assert.throws(() => verifyEpoch({ serverSeed: SERVER, playerLog, rounds, deriveFn: derive, payoutFn: () => due }), TypeError)
  }
})

test('a proven mismatch is FAIL even when payouts could not be checked', () => {
  const rounds = honest(1)
  const tampered = [{ ...rounds[0], outcome: 1 - rounds[0].outcome }]
  const playerLog = logFor(tampered).map((e) => (e.type === 'bet' ? { ...e, stake: 10n, payout: 0n } : e))
  assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog, rounds: tampered, deriveFn: derive }), { status: 'FAIL', reason: 'outcome', index: 0 })
})

test('a Proxy list is refused even when it reports a plausible length: it could hide rounds or receipts', () => {
  const rounds = honest(3)
  const shortened = new Proxy(rounds, { get: (target, key) => (key === 'length' ? 2 : target[key]) })
  assert.throws(() => epoch(shortened, logFor(honest(2))), /plain array/)
  assert.throws(() => epoch(honest(1), new Proxy(logFor(honest(1)), {})), /plain array/)
})

test('the options object is plain data too: a getter, a Proxy or an inherited field is refused before anything runs', () => {
  const rounds = honest(1)
  let calls = 0
  const getterOptions = { serverSeed: SERVER, playerLog: logFor(rounds), deriveFn: derive }
  Object.defineProperty(getterOptions, 'rounds', { enumerable: true, get: () => { calls++; return rounds } })
  assert.throws(() => verifyEpoch(getterOptions), /getter or setter/)
  let traps = 0
  const spy = new Proxy({}, { get: () => { traps++; return undefined } })
  assert.throws(() => verifyEpoch(new Proxy({ serverSeed: SERVER, playerLog: logFor(rounds), rounds, deriveFn: derive }, spy)), /Proxy/)
  const inherited = Object.assign(Object.create({ rounds }), { serverSeed: SERVER, playerLog: logFor(rounds), deriveFn: derive })
  assert.throws(() => verifyEpoch(inherited), TypeError)
  assert.deepEqual([calls, traps], [0, 0])
})

test('a record that is a vm context global is refused before its sandbox can run code', () => {
  let traps = 0
  const sandbox = new Proxy(round(0), { getOwnPropertyDescriptor: (target, key) => { traps++; return Reflect.getOwnPropertyDescriptor(target, key) } })
  const contextGlobal = vm.runInContext('this', vm.createContext(sandbox))
  assert.throws(() => epoch([contextGlobal], logFor(honest(1))), /plain object/)
  assert.equal(traps, 0)
})

