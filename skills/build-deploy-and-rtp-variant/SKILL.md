---
name: build-deploy-and-rtp-variant
description: Use when shipping a game deploy pipeline and RTP variants - one bundle to N RTP SKUs via env, keyless WIF CI, version-gated migrations, and end-to-end SLOs. Keywords deploy, RTP variant, WIF, CI/CD, SLO, one bundle N RTP.
constraints: C14
---

# build-deploy-and-rtp-variant

## When to use / When NOT
- Use when: shipping ONE bundle to N RTP SKUs, wiring keyless CI/CD, gating migrations on version, or setting round-latency SLOs.
- NOT for: deriving an RTP value (→ `math-rtp-modeling`); cert evidence (→ `comp-rtp-certification` / `comp-math-cert-report`); generic deploy process (→ `wagerforge:executing-plans`).

## Default stack (+ escape hatch)
Default: one immutable bundle; RTP selected by env/config at deploy. GCP + Workload Identity Federation, GitHub Actions, version-mapped Cloud Run + migration Jobs. Other stacks: map WIF → OIDC keyless auth; Cloud Run revision tag → your version map; migration Job → gated pre-deploy step.

## Process
1. **One bundle, N RTP SKUs.** Build once. The server keys the RTP table off the reported `gameCode`; deploy injects which pre-certified variant is active via env/config — never rebuild per SKU. The client only DISPLAYS the active advertised percent (read from server/auth), never decides it.
2. **Keyless WIF CI/CD.** Auth via OIDC/WIF — zero long-lived service-account JSON keys on disk or in CI (see `docs/SECURITY-NOTE.md`). Dev pipeline gates prod: prod apply runs only after dev succeeds + approval.
3. **Version-gated migrations.** Run schema migration as a pre-deploy Job keyed to the target version; the new revision serves only after the migration for its version completes. Migrations forward-compatible so old + new revisions coexist during rollout.
4. **End-to-end SLOs.** Measure round latency from bet-received to settle-acked across EVERY hop (RGS → adapter → operator wallet), not just the outbound HTTP call. Carry correlation/session/round IDs on each hop. Alarm on the full path.

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert — display the active percent. Operator-funded promotions OUTSIDE the game RNG do NOT change certified RTP (they change effective margin, governed by RG/AML/T&Cs). Re-cert is required ONLY when the math model (weights/paytable/feature logic) changes or an uncertified value ships.

## Pitfalls / red flags
- Rebuilding per RTP SKU instead of one bundle + env selection.
- Client computing/choosing the percent instead of displaying the server's active value.
- Long-lived SA JSON keys in CI — contradicts WIF; rotate and remove.
- Prod deploy not gated by dev; migrations not version-keyed (new revision hits unmigrated schema).
- Timing only the outbound call — the 40s-queue incident hid in wait/queue time, not the HTTP span.

## Verification
- Same bundle hash deployed to 2+ SKUs; each serves its env-selected RTP; displayed percent matches active variant.
- CI shows no static keys (WIF only); prod job depends on dev success.
- Migration Job completes before traffic shifts; rollback leaves schema compatible.
- Latency dashboards cover bet→settle end-to-end with per-hop IDs.
