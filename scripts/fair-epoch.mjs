// Epoch-level verification (C12). verify() proves that ONE round matches the inputs it was handed;
// it cannot prove the operator did not choose those inputs. An operator can skip, reuse or reorder
// nonces, re-sort its export, swap in a client seed it picked, reveal a different seed under a
// matching commitment, or grind its seed after learning the player's, and every single round still
// verifies. So the verifier checks the whole epoch against the PLAYER's own log, written by the
// client in this order: the commitment when the server published it, then a client seed generated
// AFTER that, then one receipt per accepted bet exactly as the server answered at bet time.
// Receipts may also carry the stake, the payout and whether the round was voided: with the game's
// payoutFn the verifier then catches an underpaid win and a winning round voided after the fact.
// A settled receipt without a payout leaves that payment unchecked: PASS then covers its outcome only.
// For a voided round the verifier checks only that the void did not cancel a win (voided_win); the
// refund amount is not compared.
// Missing evidence (or a payout it cannot check) is UNVERIFIABLE, never PASS; invalid evidence or
// history (a value the protocol cannot produce) throws. A proven mismatch is FAIL even when payouts
// could not be checked: UNVERIFIABLE means every check that could run passed.
//
// Trust boundary: deriveFn and payoutFn are the verifier's own code (the published game rules);
// serverSeed, playerLog and rounds are untrusted data, normally parsed from JSON. They must be plain
// data (plain-data.mjs): a Proxy or a getter is refused instead of run, only own fields count, and
// outcomes are copied, so no code from the evidence runs and the checks see exactly the data that is
// then compared. The process must be trusted too: run the verifier in a fresh process that loads
// only these modules and the game's rules, from an empty environment, since Node reads startup code
// and libraries from NODE_OPTIONS, NODE_COMPILE_CACHE, OPENSSL_CONF and NODE_PATH; for example
// `env -i PATH="$PATH" node verify.mjs evidence.json`, with no --import or --require. Code that ran
// in the process earlier can change built-ins and so any result, which no check inside it can detect.
import { copyOutcome, hashServerSeed, sameOutcome, verify } from './fair-rng.mjs'
import { plainItems, plainRecord } from './plain-data.mjs'

const HEX64 = /^[0-9a-f]{64}$/

// Each list is copied by index and each record becomes a snapshot of its own data fields, so the
// input's own methods, iterators and getters never run. Outcomes become plain copies in the
// protocol's domain (fair-rng copyOutcome).
const ROUND_FIELDS = ['nonce', 'clientSeed', 'state', 'outcome']
const LOG_FIELDS = ['type', 'value', 'nonce', 'stake', 'payout', 'state', 'outcome']

function recordsOf(list, name, keys) {
  return plainItems(list, name).map((item, i) => plainRecord(item, `${name}[${i}]`, keys))
}

function outcomeOf(fields, name) {
  if (!('outcome' in fields)) throw new TypeError(`${name} needs the outcome`)
  const outcome = copyOutcome(fields.outcome)
  if (outcome === undefined) throw new TypeError(`${name} outcome must be a finite number or a dense nested array of them`)
  return outcome
}

function clientSeedOf(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.includes(':')) {
    throw new TypeError(`${name} must be a non-empty string with no ":"`)
  }
  return value
}

function isNonce(value) {
  return Number.isSafeInteger(value) && value >= 0
}

const STATES = new Set(['settled', 'voided'])

function stateOf(fields, name) {
  const { state = 'settled' } = fields
  if (!STATES.has(state)) throw new TypeError(`${name} state must be 'settled' or 'voided'`)
  return state
}

// A voided round may have no outcome: the player may never have seen it.
function maybeOutcome(fields, state, name) {
  const hasOutcome = 'outcome' in fields
  if (!hasOutcome && state !== 'voided') throw new TypeError(`${name} needs the outcome`)
  return { hasOutcome, outcome: hasOutcome ? outcomeOf(fields, name) : undefined }
}

function amountOf(value, name) {
  if (typeof value === 'bigint' ? value < 0n : !(typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
    throw new TypeError(`${name} must be a non-negative amount`)
  }
  return value
}

function historyOf(rounds) {
  return recordsOf(rounds, 'rounds', ROUND_FIELDS).map((item, i) => {
    const { nonce, clientSeed } = item
    if (!isNonce(nonce)) throw new TypeError(`rounds[${i}] needs a non-negative safe-integer nonce`)
    clientSeedOf(clientSeed, `rounds[${i}] clientSeed`)
    const state = stateOf(item, `rounds[${i}]`)
    return { nonce, clientSeed, state, ...maybeOutcome(item, state, `rounds[${i}]`) }
  })
}

function logOf(playerLog) {
  return recordsOf(playerLog, 'playerLog', LOG_FIELDS).map((item, i) => {
    const { type } = item
    if (type === 'commitment' || type === 'clientSeed') {
      const { value } = item
      if (typeof value !== 'string') throw new TypeError(`playerLog[${i}] needs a string value`)
      return { type, value }
    }
    if (type === 'bet') {
      const name = `playerLog[${i}]`
      const { nonce, stake, payout } = item
      if (nonce !== undefined && !isNonce(nonce)) throw new TypeError(`${name} nonce must be a non-negative safe integer`)
      const state = stateOf(item, name)
      if (payout !== undefined) amountOf(payout, `${name} payout`)
      if (payout !== undefined || state === 'voided') amountOf(stake, `${name} stake`)
      return { type, nonce, state, stake, payout, ...maybeOutcome(item, state, name) }
    }
    throw new TypeError(`playerLog[${i}] has an unknown type`)
  })
}

// One epoch has exactly one commitment and one client seed; both are validated when present,
// including for an empty epoch.
function evidenceOf(log) {
  const at = (type) => log.flatMap((entry, i) => (entry.type === type ? [i] : []))
  const [commitments, seeds] = [at('commitment'), at('clientSeed')]
  if (commitments.length > 1 || seeds.length > 1) throw new TypeError('one epoch has one commitment and one client seed: split the log per epoch')
  const [ci, si] = [commitments[0], seeds[0]]
  if (ci !== undefined && !HEX64.test(log[ci].value)) throw new TypeError('commitment must be 64 lowercase hex characters')
  if (si !== undefined) clientSeedOf(log[si].value, 'clientSeed')
  return { ci, si, firstBet: log.findIndex((entry) => entry.type === 'bet') }
}

const OPTIONS = ['serverSeed', 'playerLog', 'rounds', 'deriveFn', 'payoutFn']

export function verifyEpoch(options) {
  const { serverSeed, playerLog, rounds, deriveFn, payoutFn } = plainRecord(options, 'options', OPTIONS)
  if (typeof deriveFn !== 'function') throw new TypeError('deriveFn must be a function')
  if (payoutFn !== undefined && typeof payoutFn !== 'function') throw new TypeError('payoutFn must be a function')
  const history = historyOf(rounds)
  const missing = []
  // A seed that was given is checked in full (non-empty, at most 64 UTF-8 bytes) before any
  // missing evidence can end the run. Absent or null (as JSON writes it) means not yet revealed.
  const seedHash = serverSeed === undefined || serverSeed === null ? undefined : hashServerSeed(serverSeed)
  if (seedHash === undefined) missing.push('serverSeed')
  if (playerLog === undefined || playerLog === null) return { status: 'UNVERIFIABLE', missing: [...missing, 'playerLog'] }
  const log = logOf(playerLog)
  const { ci, si, firstBet } = evidenceOf(log)
  if (ci === undefined) missing.push('commitment')
  if (si === undefined) missing.push('clientSeed')
  if (missing.length > 0) return { status: 'UNVERIFIABLE', missing }
  // A seed (or a bet) logged before the commitment means the operator could know the player's
  // entropy before fixing its own seed, and so could choose it.
  if (si < ci || (firstBet !== -1 && firstBet < si)) return { status: 'FAIL', reason: 'seed_order' }
  const commitment = log[ci].value
  const clientSeed = log[si].value
  if (seedHash !== commitment) return { status: 'FAIL', reason: 'commitment' }
  const receipts = log.filter((entry) => entry.type === 'bet')
  if (receipts.length !== history.length) return { status: 'FAIL', reason: 'history_incomplete' }
  let payoutsUnchecked = false
  for (let index = 0; index < history.length; index++) {
    const round = history[index]
    const receipt = receipts[index]
    if (round.clientSeed !== clientSeed) return { status: 'FAIL', reason: 'client_seed', index }
    if (round.nonce !== index) return { status: 'FAIL', reason: 'nonce_sequence', index }
    // Derive each round ONCE and compare the history and the receipt with that same value: two
    // derivations could disagree, and each record would then match its own.
    const { recomputed, match } = verify(serverSeed, commitment, clientSeed, index, deriveFn, round.outcome)
    if (round.hasOutcome && !match) return { status: 'FAIL', reason: 'outcome', index }
    const receiptOk = receipt.state === round.state &&
      (receipt.nonce === undefined || receipt.nonce === round.nonce) &&
      (!receipt.hasOutcome || sameOutcome(recomputed, receipt.outcome))
    if (!receiptOk) return { status: 'FAIL', reason: 'receipt', index }
    if (receipt.payout === undefined && receipt.state !== 'voided') continue
    if (payoutFn === undefined) {
      payoutsUnchecked = true
      continue
    }
    const due = payoutFn(recomputed, receipt.stake)
    if (typeof due !== typeof receipt.stake) throw new TypeError('payoutFn must return the same amount type as the stake')
    amountOf(due, 'payoutFn result')
    // Voiding a round the player would have won is the selective abort an operator can afford,
    // because it knows every outcome in advance.
    if (receipt.state === 'voided' && due > receipt.stake) return { status: 'FAIL', reason: 'voided_win', index }
    if (receipt.state === 'settled' && due !== receipt.payout) return { status: 'FAIL', reason: 'payout', index }
  }
  if (payoutsUnchecked) return { status: 'UNVERIFIABLE', missing: ['payoutFn'] }
  return { status: 'PASS', rounds: history.length }
}
