---
schema_version: "1.1"
name: verify-single-float
description: Reproduce the no-counter HMAC message for first-13-hex crash derivation
tags: [fair, verification, single-float]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I need a verifier for a crash game whose server uses HMAC-SHA256 with UTF-8 server-seed text as the key and the exact message clientSeed:nonce. It takes the first 13 hex characters, divides by 2^52, and feeds that float into the crash mapper. Our generic verifier only passes a byte stream made from clientSeed:nonce:0, then :1, to deriveFn. Honest rounds are failing. Outline the correct adapter and the tests that distinguish a real mismatch from this protocol bug.
