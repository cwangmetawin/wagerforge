---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- MT19937 is not a CSPRNG; its state can be reconstructed from roughly 624 suitable full outputs. A secret or timestamp seed and statistical-test success do not repair predictability.
- Use a CSPRNG or approved DRBG with a securely sourced unpredictable seed, protected state and the required lifecycle. Statistical tests supplement implementation/security review and do not prove unpredictability.
- ISO 17025 accredits the laboratory, not this RNG. Distinguish RNG/game assessment from lab accreditation, and map DRBG algorithms, entropy sources and constructions to NIST 800-90A/B/C as applicable.

DISQUALIFYING:
FAIL if the answer endorses Mersenne Twister is adequate because it passes Diehard/NIST, secrecy of a timestamp seed makes it cryptographically secure, or ISO 17025 certifies the RNG algorithm.
