---
description: Audit a game's provable-fairness — independent re-derivation + statistical bias checks.
---

Use the `fair-verify` skill to independently recompute the game's settled outcome(s) from `serverSeed`, `clientSeed`, and `nonce` (re-implementing the integer reduction, not trusting the server's decode), then use `qa-fairness-verification` to run KAT and uniformity checks. Apply to: $ARGUMENTS

Report: commitment check, recomputed-vs-settled diff, any modulo-bias or CSPRNG red flags.
