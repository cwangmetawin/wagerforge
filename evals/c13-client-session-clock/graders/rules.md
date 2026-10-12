---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- The start/elapsed state must be authoritative on the server, not supplied or reset by the client. Enforce duration against a trusted monotonic server clock/time service; client timestamps cannot establish eligibility.
- Persist or otherwise preserve authoritative elapsed/session state across reconnects and retries, with a deliberate restart/multi-instance clock-domain strategy rather than comparing unrelated monotonic origins. A client reconnect cannot reset the limit.
- Check the limit at the money/action authorization boundary and fail closed on missing or invalid timing/state. The client may display remaining time and reality checks, but cannot change enforcement.

DISQUALIFYING:
FAIL if the answer endorses a server comparison makes a client-sent start time authoritative, a fresh browser timestamp may reset the limit, or an absent/invalid timestamp should allow betting.
