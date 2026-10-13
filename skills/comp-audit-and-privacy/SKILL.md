---
name: comp-audit-and-privacy
description: Use when designing append-only money/state audit trails, trusted hash checkpoints, retention and erasure controls, privacy access reviews, or consent/dark-pattern audits. Keywords audit trail, hash chain, WORM, tail truncation, GDPR, ISO 27001, privacy.
---

# comp-audit-and-privacy

> **Core insight:** Hash-linked records need a trusted retained head/checkpoint or independently enforced append-only/WORM storage to expose rewritten or truncated history; privacy controls follow each data class's retention policy.

## When to use / When NOT
- Use for: financial/state audit integrity, privacy controls and consent UX evidence.
- NOT for: protection gates (`comp-responsible-gaming`, `comp-self-exclusion`), outcome proofs (`fair-verify`) or lab certification (`comp-rng-certification`, `comp-rtp-certification`).

## Process
1. **Capture authoritative events.** Record accepted/rejected wagers, returns, deposits, withdrawals, settlement/refund decisions and protection changes with event/round ids, currency atoms, server time and policy version. Co-commit financial records with ledger mutations or a durable transactional outbox. Corrections are compensating entries; losses still have terminal records.
2. **Anchor integrity independently.** Canonicalize records with sequence and previous hash. Verify against a trusted retained head/checkpoint, including committed sequence/length, or independently enforced append-only/WORM retention. Keep the checkpoint beyond the log writer's rewrite authority. Hash linking alone permits a rewritten suffix or a shortened self-consistent chain.
3. **Distinguish evidence layers.** Bind the digest to an authenticated result. MetaWin's production server (MSS) `common/realtimeSettlement/standard.ts` `canonicalResult` includes `logHash`, and `verifyResult` verifies the signed result. This checked-in standard supplies a binding specimen; durable log retention and deployment require separate evidence.
4. **Minimize linkable data.** Store pseudonymous references; isolate identity mappings, encrypt storage/transport and restrict reads/exports by role. Treat reversible pseudonyms as linkable data. Avoid raw personal data in operational logs; record access to retained records.
5. **Define retention/erasure by class.** Document purpose, retention basis, deadlines, legal holds and erasure behavior for financial records, identity mappings, consent and telemetry. Keep records only under the sourced policy; test deletion/anonymization without breaking legitimately retained audit evidence. GDPR exemptions/penalties and ISO 27001 acceptance by regulators are (unverified) here; require sourced legal/control requirements before claiming conformity.
6. **Review actual consent UX.** Verify persisted defaults and withdrawals against the approved policy. Keep protection controls accessible alongside promotions; reject preselected opt-ins, hidden exits, confirm-shaming and promotional pressure. Retain rendered-flow evidence instead of asserting an uninspected frontend contract.

## Pitfalls / red flags
Checkpoint rewritten with the log; mutable/truncated exports accepted as complete; pseudonymization advertised as erasure; unconditional retention/deletion claims; code-only compliance claims; unverified vendor flags.

## Verification
- Test isolated mutation, suffix rewrite with recomputed hashes, tail truncation and backup rollback against retained checkpoints/WORM controls.
- Inject ledger/log crashes and concurrent retries; reconcile event/round counts and exact atom totals without duplicate or missing financial events.
- Verify access denial, encryption settings, personal-data scans, class-specific retention/erasure, legal-hold behavior and consent withdrawal. Preserve storage-policy, access and rendered-UI evidence; a self-consistent chain is insufficient.
