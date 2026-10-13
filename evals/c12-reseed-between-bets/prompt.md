---
schema_version: "1.1"
name: c12-reseed-between-bets
description: Keep secure HMAC epochs with unique messages rather than mandatory per-bet reseeding
tags: [fair, c12, seed-lifecycle]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our instant game uses a 256-bit server seed from a CSPRNG for an epoch and HMAC-SHA256(serverSeed, clientSeed:nonce) for each accepted bet. A review insists we must reseed between every bet or the game becomes predictable. We rotate and reveal the seed after the epoch closes. Is the review correct? Explain nonce resets, client-seed changes, and how NIST reseeding rules relate.
