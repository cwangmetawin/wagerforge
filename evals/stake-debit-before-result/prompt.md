---
schema_version: "1.1"
name: stake-debit-before-result
description: Accept and debit or reserve the stake before deriving or revealing the result
tags: [build, money, placement]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

To avoid debiting a player for a slow round, our server computes the result, returns it to the client, and only debits the stake when settlement runs. If funds are insufficient, it leaves the operation retryable so a later deposit can complete it. Is that a safe real-money lifecycle? Specify acceptance, nonce allocation, failure and terminal transitions.
