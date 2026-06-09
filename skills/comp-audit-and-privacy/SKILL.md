---
name: comp-audit-and-privacy
description: Use when building immutable audit trails and data-privacy controls - transaction logging, ISO 27001, GDPR, and a dark-pattern audit. Keywords audit trail, ISO 27001, GDPR, data privacy, dark pattern.
---

# comp-audit-and-privacy

## When to use / When NOT
- Use when: logging every bet/transaction immutably for regulators, applying GDPR data-privacy controls, or auditing UI for dark patterns.
- NOT for: enforcing player limits/self-exclusion (→ `comp-responsible-gaming`, `comp-self-exclusion`); player-verifiable fairness proofs (→ `fair-commit-reveal`, `fair-hash-chain`); RNG/RTP lab certification (→ `comp-rng-certification`, `comp-rtp-certification`).

## Default stack (+ escape hatch)
Append-only event log (DB or WORM store), hash-chained records, RBAC-gated reads. Other stacks: any storage with tamper-evidence (per-record hash linking prev hash) and immutable retention satisfies the contract.

## Process
1. Log every money/state event (bet, win, deposit, withdrawal, limit change) append-only; never UPDATE/DELETE a record — corrections are new compensating entries. Make it regulator-queryable.
2. Make it tamper-evident: chain each record's hash to the prior record's hash so any edit breaks the chain; optionally publish a blockchain/provably-fair commitment for a player-verifiable trail.
3. Apply GDPR across two layers: (a) at the edge, anonymize source IPs and apply geo controls (an infra `anonymise-ips`/`ANONYMISE_IPS` flag on the request adapter, alongside Cloud-Armor country blocking); (b) in app logs, pseudonymize player identifiers, encrypt at rest and in transit, gate reads with RBAC, and enforce per-data-class retention/deletion timelines (fines up to 4% of annual turnover / €20M).
4. Reconcile audit/privacy controls under ISO 27001 (a current cert is accepted by both MGA and UKGC) — map controls to the ISMS, not just code.
5. Dark-pattern audit: keep responsible-gaming controls (limits, self-exclusion, reality checks) at least as prominent and as easy to action as promotions; no pre-ticked opt-ins, hidden exits, or confirm-shaming. Audit the consent-preference store specifically (server-persisted notification/marketing toggles surfaced on the consent-settings page) — verify defaults are opt-OUT and consent copy carries no FOMO/confirm-shaming nudge (e.g. "opt in now so you don't miss out on rewards").

## Pitfalls / red flags
- Treating audit logs as optional or mutable (UPDATE/DELETE on a settled record breaks immutability).
- Raw PII in logs instead of pseudonymized references; raw source IPs not anonymized at the edge; unencrypted at rest or in transit; no RBAC on log reads.
- No defined deletion/retention timeline per data class (GDPR exposure up to 4% turnover).
- Deletion request silently dropping audit-required records — keep the immutable financial trail, pseudonymize the rest.
- Promotions louder than RG controls, pre-checked consents, friction asymmetry (easy to deposit, hard to set a limit), FOMO/confirm-shaming consent copy — all dark patterns.
- Self-certifying ISO 27001 / assuming code alone satisfies it; it is an ISMS audit.

## Verification
- Tamper test: mutate one logged record and confirm the hash chain breaks; replay verifies integrity end-to-end.
- Confirm no UPDATE/DELETE path exists on settled records; corrections appear as new entries.
- Grep logs for raw PII (no plaintext identifiers/emails); confirm encryption-at-rest and TLS in transit, and RBAC on read paths.
- Each data class has a documented retention/deletion timeline; a deletion run pseudonymizes without dropping audit-required financial records.
- Prominence check: RG controls render at parity with promotions; no pre-ticked consents.
