---
name: comp-geo-edge-security
description: Use when implementing geo-blocking and edge security - route allowlist, geo-block, and rate-limiting that exempts wallet/settlement paths. Keywords geo-block, route allowlist, rate limit, edge security, Cloud Armor, OWASP.
---

# comp-geo-edge-security

## When to use / When NOT
- Use when: configuring the CDN/load-balancer edge — route allowlist, OWASP/Cloud-Armor rules, country/state geo-block, IP rate-limit.
- NOT for: in-app authz/session limits (→ `comp-responsible-gaming`); provable fairness (→ `fair-verify`).

## Default stack (+ escape hatch)
Default: Terraform + a managed L7 WAF (Cloud Armor preconfigured rules) in front of the API. Other stacks: same four layers map to AWS WAF + ALB rules, Cloudflare Rulesets, or an nginx/Envoy edge — order and exemptions are identical.

## Process
1. **Route allowlist (default-deny).** Match only the known path prefixes; any unknown path returns 404 (not 403 — do not advertise that a route exists). New endpoints must be added explicitly.
2. **OWASP/managed rules.** Enable preconfigured rule sets (SQLi, XSS, LFI/RFI, scanner-detection). Start in preview/log-only, tune false positives against real traffic, then enforce.
3. **Geo-block by injected region.** The edge resolves client geo and injects a trusted `region_code` header (country + state where required); a rule blocks disallowed regions. Strip any client-supplied `region_code` first so it cannot be spoofed.
4. **IP rate-limit with money-path exemptions.** Throttle by client IP on general/public paths, but EXEMPT money and critical paths — `wallet`, `rgs`, `settlement`, `feed` (and `graphql` if it carries them) — so legitimate play and settlement are never throttled mid-session. Exemption is a higher-priority allow rule evaluated before the rate-limit rule.

## Pitfalls / red flags
- Rate-limiting wallet/settlement/rgs/feed — a burst of legit bets or a payout retry gets a 429 and money state desyncs.
- Trusting a client-supplied region/geo header instead of an edge-injected one (spoofable).
- Unknown route returning 403/500 instead of 404 (route enumeration).
- Shipping managed WAF rules straight to enforce without a log-only tuning pass (blocks real players).
- Allowlist as default-allow with a denylist — new/forgotten paths leak through.

## Verification
- Curl an unlisted path → 404; a disallowed region (spoofed `region_code` + real geo) → blocked.
- Hammer a public path → 429; hammer `wallet`/`settlement`/`rgs`/`feed` at the same rate → never 429.
- WAF logs show OWASP rules matching attack payloads; injected `region_code` present, client-sent one dropped.
