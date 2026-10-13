// Responsible-gaming limits. ALL enforced against an authoritative, monotonic SERVER clock
// (nowMs) — never device/client time (C13). The root cause of limit bypasses is trusting
// client-supplied values; server authority neutralizes clock manipulation by construction.
// Invalid input THROWS so the bet pipeline aborts: fail closed.

import { assertAtoms } from './money.mjs'

function assertTime(value, name, allowZero = true) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new RangeError(`${name} must be a safe ${allowZero ? 'non-negative' : 'positive'} integer`)
  }
}

export function sessionExceeded({ sessionStartMs, nowMs, limitMs }) {
  assertTime(sessionStartMs, 'sessionStartMs')
  assertTime(nowMs, 'nowMs')
  assertTime(limitMs, 'limitMs', false)
  if (nowMs < sessionStartMs) throw new RangeError('server clock must be monotonic (now < start)')
  return nowMs - sessionStartMs >= limitMs
}

// These are SNAPSHOT predicates: they enforce nothing on their own. Run the check and reserve the
// allowance in ONE serialized step (lock the player's limit row, or UPDATE limits SET used = used +
// :amt WHERE player = :p AND used + :amt <= cap): two requests that each read 90 of a 100 cap pass
// a bare predicate and commit 110. Count unsettled stakes against a loss limit until they settle.
// sessionExceeded trusts the caller's clock to be monotonic across calls; it cannot check that.
//
// NOTE: loss/deposit limits use strict `>` (a bet landing EXACTLY on the cap is allowed;
// only one that would EXCEED it blocks) — the standard RG convention. This is deliberately
// different from sessionExceeded's `>=` (elapsed time reaching the cap ends the session).
// lossSoFar is max(0, settled stakes - settled returns) plus unsettled stakes: a net winner passes 0.
export function lossLimitBlocks({ lossSoFar, betAmount, lossLimit }) {
  for (const amount of [lossSoFar, betAmount, lossLimit]) assertAtoms(amount, { allowZero: true })
  return lossSoFar + betAmount > lossLimit
}

export function depositLimitBlocks({ depositedSoFar, amount, depositLimit }) {
  for (const atoms of [depositedSoFar, amount, depositLimit]) assertAtoms(atoms, { allowZero: true })
  return depositedSoFar + amount > depositLimit
}
