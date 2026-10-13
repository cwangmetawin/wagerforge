---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- A plain SHA256(serverSeed) commitment is valid for the intended commitment role; length extension is a secret-prefix MAC misuse issue, not a blanket break of SHA-256 commitments.
- Use HMAC-SHA256 with the secret server seed as key and an unambiguous canonical clientSeed:nonce message (plus a specified cursor only for that protocol), with validated non-negative safe-integer nonce. Publish the commitment before the player selects the client seed and reveal the server seed only when future outcomes cannot be exposed.
- Specify the exact byte encoding consistently (including UTF-8 seed text versus hex-decoded bytes), domain/schema separation and output width. Merely double hashing is not a replacement for the keyed derivation.

DISQUALIFYING:
FAIL if the answer endorses SHA-256 length extension invalidates plain seed commitments, SHA256(serverSeed + clientSeed + nonce) is an acceptable keyed derivation, or hashing twice is the required fairness repair.
