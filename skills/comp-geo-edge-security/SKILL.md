---
name: comp-geo-edge-security
description: Use when implementing geo-blocking and edge security - route allowlist, geo-block, and rate-limiting that exempts wallet/rgs/graphql/feed paths. Keywords geo-block, route allowlist, rate limit, edge security, Cloud Armor, OWASP.
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
3. **Geo-block by the edge's trusted geo attribute.** Block on the WAF's own server-computed region (e.g. Cloud Armor `origin.region_code`), NEVER a client-supplied header — the trusted attribute is non-spoofable, so there is nothing to "strip". The edge does country-level only and injects a trusted `ip-blocked-country` marker header for downstream; finer state/region geo-blocking is enforced in the application/adapter layer, not the edge.
4. **IP rate-limit with money-path exemptions.** Throttle by client IP on general/public paths, but EXEMPT money and critical paths — `graphql`, `feed`, `wallet`, `rgs` — so legitimate play and settlement are never throttled mid-session. The exemption is a negated path regex INSIDE the throttle rule's own match (`!request.path.matches('/graphql|/feed|/wallet|/rgs')`), not a separate higher-priority allow rule.

## Pitfalls / red flags
- Rate-limiting wallet/rgs/graphql/feed — a burst of legit bets or a payout retry gets a 429 and money state desyncs.
- Trusting a client-supplied region/geo header instead of the edge's trusted geo attribute (spoofable).
- Unknown route returning 403/500 instead of 404 (route enumeration).
- Shipping managed WAF rules straight to enforce without a log-only tuning pass (blocks real players).
- Allowlist as default-allow with a denylist — new/forgotten paths leak through.

## Verification
- Curl an unlisted path → 404; a request from a blocked country → carries the injected block marker / is denied.
- Hammer a public path → 429; hammer `wallet`/`rgs`/`graphql`/`feed` at the same rate → never 429.
- WAF logs show OWASP rules matching attack payloads; geo decision uses the edge's trusted region attribute, not a client-sent header.
