// Server-side self-exclusion (GamStop-style). All times are authoritative server epoch
// MILLISECONDS (not seconds) - never device time. Block excluded players at registration, login,
// deposit, and bet. Malformed input throws so unavailable or corrupt exclusion data cannot
// authorize a bet. Player ids must be the platform's canonical id; normalize before calling.

import { plainItems, plainRecord } from './plain-data.mjs'

function assertId(id) {
  if (typeof id !== 'string' || id.length === 0) throw new TypeError('id must be a non-empty string')
}

function assertTime(value) {
  if (typeof value !== 'number') throw new TypeError('time must be a number')
  if (!Number.isSafeInteger(value)) throw new RangeError('time must be a safe integer')
}

// Lists and records are plain data (plain-data.mjs), walked by index. An overridden iterator or
// method, a getter or a Proxy could hide a record or show the check one value and the decision
// another, so none of them runs: a Proxy list or record (some ORMs and UI frameworks return them)
// is refused, so copy it to plain data first. Only own fields count.

// The register answer must say when the provider gave it (asOfMs): a failed lookup turned into an
// empty list (.catch(() => [])) or a weeks-old cache would otherwise clear an excluded player.
function assertFresh(asOfMs, maxAgeMs, nowMs) {
  assertTime(asOfMs)
  if (typeof maxAgeMs !== 'number' || !Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) {
    throw new RangeError('maxAgeMs must be a positive safe integer')
  }
  if (asOfMs > nowMs) throw new RangeError('exclusion data is dated in the future')
  if (nowMs - asOfMs > maxAgeMs) throw new RangeError('exclusion data is stale: refuse until a fresh answer arrives')
}

const QUERY = ['playerId', 'exclusions', 'asOfMs', 'maxAgeMs', 'nowMs']

export function isSelfExcluded(input) {
  const { playerId, exclusions, asOfMs, maxAgeMs, nowMs } = plainRecord(input, 'input', QUERY)
  assertId(playerId)
  assertTime(nowMs)
  if (nowMs < 0) throw new RangeError('nowMs must be non-negative')
  assertFresh(asOfMs, maxAgeMs, nowMs)
  const records = plainItems(exclusions, 'exclusions')
  let excluded = false
  for (let i = 0; i < records.length; i++) {
    const { playerId: excludedId, untilMs } = plainRecord(records[i], `exclusions[${i}]`, ['playerId', 'untilMs'])
    assertId(excludedId)
    if (untilMs !== null) assertTime(untilMs)
    // Validate the whole list, even if an earlier record already excluded this player.
    if (excludedId === playerId && (untilMs === null || nowMs < untilMs)) excluded = true
  }
  return excluded
}

export function shouldBlockBet(input) {
  return isSelfExcluded(input)
}

// The exclusion provider whitelists your cloud egress (NAT/proxy) IPs; scans must originate
// from a whitelisted IP or they silently fail.
export function egressIpWhitelisted(input) {
  const { ip, whitelist } = plainRecord(input, 'input', ['ip', 'whitelist'])
  assertId(ip)
  let listed = false
  for (const entry of plainItems(whitelist, 'whitelist')) {
    if (typeof entry !== 'string') throw new TypeError('whitelist entries must be strings')
    if (entry === ip) listed = true
  }
  return listed
}
