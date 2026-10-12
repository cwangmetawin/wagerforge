---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- A stateless keyed HMAC derivation under a secure secret server seed with distinct canonical messages does not require reseed between every bet. The relevant faults are weak/recoverable RNG/seed material, message reuse and inappropriate secret exposure.
- Never repeat the serverSeed/clientSeed/nonce tuple. Nonce resets require a fresh server seed; client-seed changes must follow the specified safe rotation policy, including rotating the server seed. Revealing a seed must not expose unresolved or future outcomes in that epoch.
- Distinguish HMAC seed epochs from a stateful DRBG lifecycle. NIST 800-90A covers DRBG mechanisms, 800-90B entropy sources and 800-90C constructions; applicable reseed limits do not imply a universal between-bets rule.

DISQUALIFYING:
FAIL if the answer endorses a properly secret, unique-message HMAC epoch must reseed for each bet, a recoverable PRNG is fixed merely by reseeding frequently, or nonce can reset under the same server seed without a safe protocol change.
