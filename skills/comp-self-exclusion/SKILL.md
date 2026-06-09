---
name: comp-self-exclusion
description: Use when integrating self-exclusion - GamStop, static-IP whitelisting, real-time plus periodic scans. Keywords self-exclusion, GamStop, IP whitelist, exclusion scan.
---

# comp-self-exclusion

## When to use / When NOT
- Use when: integrating a national self-exclusion register (e.g. GamStop) so excluded players are blocked across the platform.
- NOT for: operator-internal limits, reality checks, or cool-offs (→ `comp-responsible-gaming`); certification paperwork (→ `comp-rtp-certification`, out of MVP scope).

## Default stack (+ escape hatch)
`scripts/self-exclusion.mjs` — `isSelfExcluded`, `shouldBlockBet` (server-clock window checks), and `egressIpWhitelisted` (egress-IP gate) — plus a static egress IP and a scheduler. Other stacks: any server-side HTTP client over TLS with mutual-auth credentials, plus a durable scan log. Route every register call through a fixed-IP proxy/NAT so the operator IP can be whitelisted.

## Process
1. Reserve a static egress IP (proxy or NAT gateway) for all register traffic; register it with the scheme so requests are allowlisted. Cloud auto-scaling and ephemeral IPs break the allowlist — pin egress. Pattern: a single manually-allocated reserved IP backing one NAT for all outbound (GCP `google_compute_router_nat` with `nat_ip_allocate_option = "MANUAL_ONLY"`, `nat_ips = [<reserved-address>]`; AWS Elastic IP on a single NAT gateway). Multi-AZ NATs / per-instance public IPs each present a different source IP and fall off the allowlist.
2. Call the register over TLS only (verify cert + hostname), with the scheme's auth credentials pulled from a secret manager, never on disk.
3. Real-time check at every gate: block at registration, login, deposit, and bet. A player can be excluded mid-session, so re-check on each money/entry action, not just once at signup.
4. Periodic re-scan (24h) of the active player base to catch newly-excluded players between their real-time touchpoints; record each scan result with a timestamp for audit.
5. On a match, enforce server-side: deny the action, suspend the account, and surface a neutral exclusion message — never a re-marketing prompt.
6. Fail closed on register unavailability for new registrations and deposits; queue and retry, and alert if the scheme is unreachable beyond a threshold.

## Pitfalls / red flags
- GamStop in the cloud without a static-IP proxy/NAT — ephemeral egress IPs fall off the allowlist and silently fail.
- Checking only at registration, so a player excluded after signup keeps playing until the next scan.
- Treating a register timeout as "not excluded" (failing open) instead of failing closed on money paths.
- Plaintext or unauthenticated calls; cert/hostname not verified; credentials committed to disk instead of a secret manager.
- No durable scan log, so you cannot prove to a regulator that periodic scans ran.
- Client-side enforcement — the block must live at the server transaction layer.

## Verification
- `scripts/self-exclusion.test.mjs` covers `scripts/self-exclusion.mjs`: `isSelfExcluded`/`shouldBlockBet` block only inside the active server-clock window (excluded at registration, login, deposit, bet); `egressIpWhitelisted` gates the cloud egress IP so non-whitelisted scans are rejected.
- Confirm all register traffic exits from the `egressIpWhitelisted` static IP and uses TLS with verified certs.
- Inspect the scan log: each periodic run is timestamped and queryable for audit.
