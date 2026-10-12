---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- The single-float protocol hashes the exact UTF-8 clientSeed:nonce message with the specified UTF-8 seed-text key, parses the first 13 hex characters as an exact 52-bit integer and divides by 2^52 to obtain [0,1). Appending :0 changes the HMAC and is not interchangeable.
- Use an adapter such as deriveFn(stream, ctx) with validated immutable/frozen {serverSeed, clientSeed, nonce} context, and derive the single float from that context instead of forcing the counter byte stream. Keep stream-based derivations for games whose actual protocol uses counters.
- Reproduce the exact crash mapper, floor/display/settlement convention, RTP/config and other inputs; first verify the player-saved commitment. Validate nonce/input/output types and reject non-finite outcomes rather than returning PASS.
- Require an honest known-answer/round-trip PASS and tampered commitment, seed, nonce, config and outcome negatives; specifically show that clientSeed:nonce:0 produces different entropy. A protocol/input mismatch is not evidence the house cheated.

DISQUALIFYING:
FAIL if the answer endorses the counter stream with :0 reproduces the first-13-hex single-float protocol, silently changing the game to counter derivation fixes existing proofs, trusting the server decoded outcome is independent verification, or honest mismatches should be labelled cheating without matching the protocol.
