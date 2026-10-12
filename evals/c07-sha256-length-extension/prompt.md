---
schema_version: "1.1"
name: c07-sha256-length-extension
description: Retain a plain seed commitment but use HMAC for keyed outcome derivation
tags: [fair, c7, cryptography]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our fairness protocol publishes SHA256(serverSeed), then derives a draw as SHA256(serverSeed + clientSeed + nonce). A reviewer says SHA-256 length extension means both hashes are broken and suggests just hashing twice. What should we change before taking real-money bets? Specify the roles and input encoding of the commitment and the draw derivation.
