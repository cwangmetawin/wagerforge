---
schema_version: "1.1"
name: nonce-epoch-contiguity
description: Verify a player-owned epoch transcript rather than only individual HMACs
tags: [fair, verification, epoch]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Every one of our crash bets passes a per-round HMAC verifier. The operator sends the nonce with each result, and sometimes skips a few nonces for housekeeping. It also generates and echoes the client seed. A player claims winning nonces could be omitted while all displayed rounds still verify. Is per-round verification enough? Specify the additional evidence and checks for a seed epoch.
