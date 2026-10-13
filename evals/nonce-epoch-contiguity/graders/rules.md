---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Per-round verification alone does not prevent selective nonce skipping. Check the entire accepted-bet epoch against the player-owned transcript: in a dedicated per-player epoch, nonces exactly 0..k-1 with no gaps, duplicates or reuse, matching the client own counter and accepted debited bets; with global shared nonces, every gap in the player's history is accounted for by the retained global allocation record.
- Use the committed hash saved in the player own storage before the first bet, not a replacement commitment returned with verification. The client seed must be generated/controlled by the player browser after receiving the commitment and not generated or silently replaced by the server.
- Allocate/increment a nonce only with accepted stake debit/reservation, not rejected requests. Rotate the server seed for a nonce reset, verify reveal against the saved commitment, and independently rederive each settled result.
- Reject missing/incomplete or inconsistent transcript evidence rather than claiming complete epoch fairness from operator-selected round records.

DISQUALIFYING:
FAIL if the answer endorses all per-round HMACs passing proves the operator did not skip winning nonces, unaccounted housekeeping gaps are harmless to that proof, or an operator-generated client seed/operator-supplied commitment alone is independent evidence.
