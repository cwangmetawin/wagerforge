import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { byteStream, nextFloat, hashServerSeed, fairFloat, sameOutcome, verify } from './fair-rng.mjs'
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

const missingSeedEvidence = Array.from({ length: 7 }, (_, i) =>
  ['serverSeed', 'commitment', 'clientSeed'].filter((_, bit) => (i + 1) & (1 << bit)))
const withoutEvidence = (rounds, playerLog, missing) => verifyEpoch({
  serverSeed: missing.includes('serverSeed') ? undefined : SERVER,
  playerLog: playerLog.filter((entry) => !missing.includes(entry.type)),
  rounds,
  deriveFn: missing.includes('serverSeed') ? () => assert.fail('an unrevealed server seed derives nothing') : derive,
})

test('missing seed evidence does not hide an incomplete history', () => {
  for (const missing of missingSeedEvidence) {
    for (const [historyCount, receiptCount] of [[2, 3], [3, 2]]) {
      assert.deepEqual(withoutEvidence(honest(historyCount), logFor(honest(receiptCount)), missing),
        { status: 'FAIL', reason: 'history_incomplete' }, missing.join(','))
    }
  }
})

test('missing seed evidence does not hide skipped, reused or reordered nonces', () => {
  for (const missing of missingSeedEvidence) {
    for (const [nonces, index] of [[[0, 2], 1], [[0, 0], 1], [[1, 0], 0]]) {
      const rounds = nonces.map((nonce) => round(nonce))
      assert.deepEqual(withoutEvidence(rounds, logFor(rounds), missing),
        { status: 'FAIL', reason: 'nonce_sequence', index }, missing.join(','))
    }
  }
})

test('missing seed evidence does not hide receipt state or nonce mismatches', () => {
  const rounds = honest(3)
  for (const missing of missingSeedEvidence) {
    for (const change of [{ nonce: 99 }, { state: 'voided', stake: 10n }]) {
      const playerLog = logFor(rounds)
      playerLog[3] = { ...playerLog[3], ...change }
      assert.deepEqual(withoutEvidence(rounds, playerLog, missing),
        { status: 'FAIL', reason: 'receipt', index: 1 }, missing.join(','))
    }
  }
})

test('a logged client seed is checked even without a server seed or commitment', () => {
  const rounds = honest(3).map((r, i) => (i === 1 ? round(r.nonce, 'operator-seed') : r))
  for (const missing of missingSeedEvidence.filter((items) => !items.includes('clientSeed'))) {
    assert.deepEqual(withoutEvidence(rounds, logFor(rounds), missing),
      { status: 'FAIL', reason: 'client_seed', index: 1 }, missing.join(','))
  }
})

test('seed order is checked before an unrevealed server seed ends verification', () => {
  const rounds = honest(1)
  const [commitment, seed, bet] = logFor(rounds)
  for (const playerLog of [[seed, commitment, bet], [commitment, bet, seed]]) {
    assert.deepEqual(withoutEvidence(rounds, playerLog, ['serverSeed']), { status: 'FAIL', reason: 'seed_order' })
  }
})

test('a revealed server seed is checked against the commitment even without a client seed', () => {
  const rounds = honest(1)
  const playerLog = logFor(rounds, { commitment: hashServerSeed('another-server-seed') })
  assert.deepEqual(withoutEvidence(rounds, playerLog, ['clientSeed']), { status: 'FAIL', reason: 'commitment' })
})

test('consistent partial evidence stays UNVERIFIABLE', () => {
  const rounds = honest(3)
  for (const missing of missingSeedEvidence) {
    assert.deepEqual(withoutEvidence(rounds, logFor(rounds), missing), { status: 'UNVERIFIABLE', missing })
  }
  assert.deepEqual(verifyEpoch({ serverSeed: null, playerLog: logFor(rounds), rounds, deriveFn: () => assert.fail('unrevealed seed') }),
    { status: 'UNVERIFIABLE', missing: ['serverSeed'] })
  const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state: 'voided', stake: 10n, payout: 10n }]
  assert.deepEqual(withoutEvidence([{ nonce: 0, clientSeed: CLIENT, state: 'voided' }], playerLog, ['serverSeed']),
    { status: 'UNVERIFIABLE', missing: ['serverSeed'] })
})

test('nonces are checked even when the entire player log is missing', () => {
  for (const serverSeed of [SERVER, undefined, null]) {
    for (const playerLog of [undefined, null]) {
      assert.deepEqual(verifyEpoch({ serverSeed, playerLog, rounds: [round(0), round(2)], deriveFn: derive }),
        { status: 'FAIL', reason: 'nonce_sequence', index: 1 })
    }
  }
})

test('missing seed evidence does not hide an incorrect voided refund', () => {
  const rounds = [{ nonce: 0, clientSeed: CLIENT, state: 'voided' }]
  const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state: 'voided', stake: 10n, payout: 9n }]
  for (const missing of missingSeedEvidence) {
    assert.deepEqual(withoutEvidence(rounds, playerLog, missing), { status: 'FAIL', reason: 'refund', index: 0 })
  }
})

test('each order check runs when the two entries it compares are logged', () => {
  const rounds = honest(1)
  const [commitment, seed, bet] = logFor(rounds)
  for (const serverSeed of [SERVER, undefined]) {
    for (const playerLog of [[bet, seed], [bet, commitment]]) {
      assert.deepEqual(verifyEpoch({ serverSeed, playerLog, rounds, deriveFn: () => assert.fail('no derivation') }),
        { status: 'FAIL', reason: 'seed_order' })
    }
  }
})

test('the rounds of one epoch share one client seed, even when the player log lacks it', () => {
  const rounds = honest(3).map((r, i) => (i === 2 ? round(r.nonce, 'operator-seed') : r))
  const noSeed = logFor(rounds).filter((entry) => entry.type !== 'clientSeed')
  for (const serverSeed of [SERVER, undefined]) {
    for (const playerLog of [noSeed, undefined, null]) {
      assert.deepEqual(verifyEpoch({ serverSeed, playerLog, rounds, deriveFn: derive }),
        { status: 'FAIL', reason: 'client_seed', index: 2 })
    }
  }
})

test('without the seeds, a history outcome that contradicts the receipt still fails', () => {
  for (const state of ['settled', 'voided']) {
    const rounds = [{ nonce: 0, clientSeed: CLIENT, state, outcome: 0 }]
    const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state, outcome: 1, ...(state === 'voided' ? { stake: 10n, payout: 10n } : {}) }]
    for (const missing of missingSeedEvidence.filter((items) => items.includes('serverSeed'))) {
      assert.deepEqual(withoutEvidence(rounds, playerLog, missing), { status: 'FAIL', reason: 'receipt', index: 0 }, state + ' ' + missing.join(','))
    }
  }
})

test('a revealed server seed checks the history outcomes before the commitment or the logged seed', () => {
  const rounds = honest(2).map((r, i) => (i === 1 ? { ...r, outcome: 1 - r.outcome } : r))
  const log = logFor(rounds)
  for (const playerLog of [log.filter((e) => e.type !== 'commitment'), log.filter((e) => e.type !== 'clientSeed'), undefined, null]) {
    assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog, rounds, deriveFn: derive }), { status: 'FAIL', reason: 'outcome', index: 1 })
  }
})

test('without the seeds, a payment that contradicts the recorded outcome still fails', () => {
  for (const stake of [10n, 10]) {
    const double = (_outcome, amount) => amount + amount
    for (const [state, payout, reason] of [['settled', stake - stake, 'payout'], ['voided', stake, 'voided_win']]) {
      const rounds = [{ nonce: 0, clientSeed: CLIENT, state, outcome: 1 }]
      const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state, outcome: 1, stake, payout }]
      assert.deepEqual(verifyEpoch({ serverSeed: undefined, playerLog, rounds, deriveFn: () => assert.fail('unrevealed'), payoutFn: double }),
        { status: 'FAIL', reason, index: 0 }, `${state} ${typeof stake}`)
    }
  }
})

test('a stake that is given is a valid amount even when the receipt has no payout', () => {
  const rounds = honest(1)
  for (const stake of [-1, -1n, NaN, Infinity, '10', null, {}]) {
    const playerLog = logFor(rounds).map((e) => (e.type === 'bet' ? { ...e, stake } : e))
    assert.throws(() => epoch(rounds, playerLog), TypeError, String(stake))
  }
})

test('shared arrays in a derived outcome are compared in polynomial time', () => {
  let shared = [1]
  for (let depth = 0; depth < 26; depth++) shared = [shared, shared]
  const started = performance.now()
  assert.equal(sameOutcome(shared, shared), true)
  assert.equal(verify(SERVER, COMMIT, CLIENT, 0, () => shared, shared).ok, true)
  const rounds = [{ nonce: 0, clientSeed: CLIENT, outcome: shared }]
  assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog: logFor(rounds), rounds, deriveFn: () => shared }), { status: 'PASS', rounds: 1 })
  assert.ok(performance.now() - started < 500, 'each comparison must not walk all 2^26 paths')
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

test('voided receipts must refund exactly their stake even after an unchecked payout', () => {
  const rounds = [{ nonce: 0, clientSeed: CLIENT, outcome: 0 }, { nonce: 1, clientSeed: CLIENT, state: 'voided' }]
  for (const [stake, payout] of [[10n, 0n], [10n, 9n], [10n, 11n], [10, 0], [10, 9], [10, 11]]) {
    const playerLog = [
      ...logFor(rounds.slice(0, 1)).map((entry) => (entry.type === 'bet' ? { ...entry, stake, payout: typeof stake === 'bigint' ? 0n : 0 } : entry)),
      { type: 'bet', nonce: 1, state: 'voided', stake, payout },
    ]
    for (const payoutFn of [undefined, (_outcome, stake) => (typeof stake === 'bigint' ? 0n : 0)]) {
      assert.deepEqual(verifyEpoch({ serverSeed: SERVER, playerLog, rounds, deriveFn: () => 0, payoutFn }),
        { status: 'FAIL', reason: 'refund', index: 1 })
    }
  }
})

test('exact voided refunds still need the payout rule to check for a voided win', () => {
  const rounds = [{ nonce: 0, clientSeed: CLIENT, state: 'voided' }]
  for (const stake of [10n, 10]) {
    const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state: 'voided', stake, payout: stake }]
    const options = { serverSeed: SERVER, playerLog, rounds, deriveFn: () => 0 }
    assert.deepEqual(verifyEpoch(options), { status: 'UNVERIFIABLE', missing: ['payoutFn'] })
    assert.deepEqual(verifyEpoch({ ...options, payoutFn: () => (typeof stake === 'bigint' ? 0n : 0) }), { status: 'PASS', rounds: 1 })
    assert.deepEqual(verifyEpoch({ ...options, payoutFn: () => stake + stake }), { status: 'FAIL', reason: 'voided_win', index: 0 })
  }
})

test('a receipt states its payout in the same amount type as its stake', () => {
  const rounds = [{ nonce: 0, clientSeed: CLIENT, state: 'voided' }]
  for (const [stake, payout] of [[10n, 10], [10, 10n], [10n, 0], [10, 0n]]) {
    const playerLog = [...logFor([]), { type: 'bet', nonce: 0, state: 'voided', stake, payout }]
    assert.throws(() => verifyEpoch({ serverSeed: SERVER, playerLog, rounds, deriveFn: () => 0 }), TypeError)
  }
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
