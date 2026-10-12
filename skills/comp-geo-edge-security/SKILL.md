---
name: comp-geo-edge-security
description: Use when reviewing geo enforcement, route allowlists, WAF ordering or path-specific throttling around wagering and settlement APIs.
---

# comp-geo-edge-security
> **Core insight:** Keep any throttle exemption inside that throttle's own predicate so other protections still run; geo decisions require trusted ingress evidence rather than client-supplied location.

## When to use / When NOT

- Use for ingress policy, route exposure, geo enforcement and throttling.
- Application limits: `comp-responsible-gaming`; payment recovery: `qa-settlement-integrity`; player proof: `fair-verify`.

## Process

1. Inventory actual ingress routes, methods, identities and upstream reachability. Use an explicit route allowlist and deny unknown traffic; add endpoints deliberately. Choose and test the unknown-route response contract. Universal 404 behavior and its security benefit are (unverified).
2. Separate route authorization, attack inspection, geo policy and throttling. Preview proposed inspection rules against representative traffic, review false positives, then enforce. Terraform/Cloud Armor, AWS WAF, Cloudflare or nginx/Envoy examples and their exact ordering are (unverified); obtain deployed policy and provider documentation before writing syntax.
3. Derive location from trusted ingress/provider data with a documented accuracy and proxy/VPN policy. Reject client-header overrides; sanitize externally supplied markers before trusted ingress sets them. Define country/state coverage and fail-closed handling for missing or uncertain geo evidence. Cloud Armor `origin.region_code`, country-only coverage and an injected `ip-blocked-country` header are (unverified); trusted provenance does not establish geographic accuracy.
4. Exempt only explicitly approved routes from the selected public-traffic throttle. Express that exclusion within its match predicate; do not install a broad allow that bypasses independent inspection or authorization. Wallet/wagering/settlement APIs still need authenticated quotas, concurrency limits and retry/reconciliation contracts. Automatic exemptions for `/graphql`, `/feed`, `/wallet` and `/rgs`, and vendor regex semantics, are (unverified).
5. Keep exclusions precise across normalized paths, methods and hostnames. Test prefix collisions, encoded separators, case/trailing-slash handling and alternate ingress. Rate-limit failure cannot determine a bet's monetary fate; reconcile authoritative state before retrying an ambiguous request.
6. State the evidence boundary. MetaWin's production server (MSS) `docs/GDK_CONTRACT.md` “Server runtime” documents game API routes; it does not prove deployed WAF rules, downstream geo enforcement or throttle exceptions. Cross-layer claims need actual edge/platform artifacts.

## Pitfalls / red flags

Separate blanket allow rules; client region overrides; geo markers accepted directly from the internet; generic money-path exemptions copied without route review; claiming a provider's trusted field is non-spoofable geographic truth; inferring deployed protections from server source.

## Verification

Retain policy version and request/log traces proving allowed/denied routes, trusted geo provenance and uncertain-location handling. Show excluded traffic still receives inspection and authorization; test approved throttle behavior and recovery for money requests. Repeat through every reachable ingress and path-normalization case. Missing provider/deployment evidence stays (unverified), never a passed edge-security gate.
