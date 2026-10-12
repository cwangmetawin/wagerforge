---
schema_version: "1.1"
name: idem-settlement-content
description: Bind settlement idempotency to immutable economic content including losses
tags: [build, money, idempotency]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

A webhook settled bet b17 for player A with stake 10 and payout 0. We now think the payout should have been 50 and want to retry the same bet id with that corrected amount; our dedupe layer returns ok whenever the id already exists. Can the settlement endpoint apply that correction safely? Describe the stored record, replay/conflict behavior, and concurrent duplicate handling.
