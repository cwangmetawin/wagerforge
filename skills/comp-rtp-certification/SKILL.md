---
name: comp-rtp-certification
description: Use when preparing RTP certification - theoretical vs field RTP at confidence, variant handling, and what triggers re-certification. Keywords RTP certification, theoretical RTP, field RTP, re-cert, variant.
constraints: C14,C9
---

# comp-rtp-certification

## When to use / When NOT
- Use when: assembling cert evidence (theoretical vs field RTP at CIs), deciding which variant to deploy, or judging whether a change forces re-cert.
- NOT for: deriving the theoretical RTP from the model (→ `math-rtp-modeling`); empirical convergence sims (→ `math-montecarlo-simulation`); the commit-reveal/provably-fair flow (→ `fair-commit-reveal`).

## Default stack (+ escape hatch)
Third-party lab sign-off (GLI/iTech/BMM/eCOGRA) + a `rtp-drift-detector` comparing theoretical vs live. Other stacks: same statistics — any field-RTP monitor with a 95% CI that accounts for volatility works.

## Process
1. Establish the theoretical RTP per certified variant from the math model; the lab certifies, not you.
2. Monitor field RTP against theoretical using a **95% CI** sized by the game's **variance/volatility** (high-volatility titles need far more rounds to converge). Flag drift; escalate to a **99% CI** for confirmation.
3. Track **base RTP and feature/bonus RTP separately** — a blended figure hides a mis-weighted feature.
4. Surface the **active variant percent** to the player; the selection and resolved outcome are **server-determined and audit-logged** before any animation.
5. Classify any change: pre-certified variant switch vs math-model change (decides re-cert — see C14).

## Correctness constraints
- **C14:** Suppliers certify multiple RTP variants/bands; operators may switch among PRE-CERTIFIED variants at deploy without re-cert (display the active percent). Operator-funded promotions outside the game RNG do NOT change the certified RTP. Re-cert is required only when the math model (weights/paytable/feature logic) changes.
- **C9:** Certified slots require the outcome to be server-determined, finalized, and audit-logged BEFORE animation (never client-influenced) - not necessarily a cryptographic commit-reveal; commit-reveal is the provably-fair model and is optional/transparency-enhancing for certified slots.

## Pitfalls / red flags
- Re-certifying for an operator-funded promo or a pre-certified variant switch (C14).
- Demanding commit-reveal as a cert prerequisite (C9) — it is optional transparency, not the bar.
- Using a fixed sample size regardless of volatility; a wide field-RTP gap on a high-variance game may be noise, not drift.
- Reporting one blended RTP instead of base vs feature.
- Trusting a client-reported or client-influenced outcome; failing to audit-log the active variant.

## Verification
- `rtp-drift-detector` shows field within the 95% CI for the displayed variant; base and feature tracked separately.
- Audit log proves outcome + active variant were server-finalized before animation for every round sampled.
- Re-cert decisions trace to a math-model diff, never to a promo or variant toggle.
