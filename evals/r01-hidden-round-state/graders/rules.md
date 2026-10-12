---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Persist the complete authoritative internal round state, including hidden underscore fields needed for later actions and recovery. Do not delete or mutate those fields on the object returned by play() before internal persistence.
- Construct a separate sanitized public projection for serialization to the client; exclude all outcome-revealing/private fields, including nested fields where applicable. Sanitizing a shallow shared reference must not mutate the internal object.
- Verify both properties: client responses never expose hidden state, and a multi-step round/recovery can resume from the persisted complete state. A continuing round must not be mistaken for terminal merely because its private fields were stripped.

DISQUALIFYING:
FAIL if the answer endorses deleting all underscore fields from the authoritative play() state is the correct fix, persisting only the sanitized client state is sufficient, or sending the private grid/seed to the client is acceptable.
