// Server-side self-exclusion (GamStop-style). All times are authoritative server ms - never
// device time. Block excluded players at registration, login, deposit, and bet.

export function isSelfExcluded({ playerId, exclusions, nowMs }) {
  for (const e of exclusions) {
    if (e.playerId === playerId && nowMs < e.untilMs) return true
  }
  return false
}

export function shouldBlockBet({ playerId, exclusions, nowMs }) {
  return isSelfExcluded({ playerId, exclusions, nowMs })
}

// The exclusion provider whitelists your cloud egress (NAT/proxy) IPs; scans must originate
// from a whitelisted IP or they silently fail.
export function egressIpWhitelisted({ ip, whitelist }) {
  return whitelist.includes(ip)
}
