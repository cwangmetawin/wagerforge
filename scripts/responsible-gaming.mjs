// Responsible-gaming limits. ALL enforced against an authoritative, monotonic SERVER clock
// (nowMs) — never device/client time (C13). The root cause of limit bypasses is trusting
// client-supplied values; server authority neutralizes clock manipulation by construction.

export function sessionExceeded({ sessionStartMs, nowMs, limitMs }) {
  if (nowMs < sessionStartMs) throw new Error('server clock must be monotonic (now < start)')
  return nowMs - sessionStartMs >= limitMs
}

// NOTE: loss/deposit limits use strict `>` (a bet landing EXACTLY on the cap is allowed;
// only one that would EXCEED it blocks) — the standard RG convention. This is deliberately
// different from sessionExceeded's `>=` (elapsed time reaching the cap ends the session).
export function lossLimitBlocks({ lossSoFar, betAmount, lossLimit }) {
  return lossSoFar + betAmount > lossLimit
}

export function depositLimitBlocks({ depositedSoFar, amount, depositLimit }) {
  return depositedSoFar + amount > depositLimit
}
