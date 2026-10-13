---
schema_version: "1.1"
name: shared-room-stake-admission
description: Reject an over-exposure stake, lock the room currency on the first accepted stake and validate auto cash-out targets
tags: [build, money, limits]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are adding stake admission to a shared crash room: 16 seats, one rocket per round, stakes accepted only while boarding. All six players below hold different seats. The room starts with no configured currency and with its currency and precision locks unset. Every command carries the following platform limits in its own currency; maxExposure applies per player:

| Currency | Decimals | minBet | maxBet | maxExposure |
| --- | --- | --- | --- | --- |
| USDT | 2 | 0.10 | 50.00 | 1,000.00 |
| BTC | 8 | 0.00010000 | 0.01000000 | 0.10000000 |

Admission uses a declared conservative maximum gross-return bound of 358 times the stake. Auto cash-out targets use a 0.01 grid with a 1.01x minimum; the largest payable multiplier is 349.99x. Manual cash-out works during flight.

These are authoritative tick revalidation inputs: each command has already been debited exactly once and has a fresh platform command id. During boarding the tick processes them in order: (1) Ada stakes 0.00030000 BTC with no auto target; (2) Ann stakes 3.00 USDT with no auto target; (3) Ben stakes 2.79 USDT with auto target 1.00; (4) Cy stakes 2.79 USDT with auto target 400; (5) Dee stakes 0.00020000 BTC with no auto target; (6) Eli stakes 2.79 USDT with auto target null.

This room declares no pot contribution, fees or bonus awards; its cash leg multiplies the original gross stake. The wallet adapter supports deferred credits at terminal settlement. Later Cy presses manual cash-out in the first instant of the flight, at multiplier 1.00. What should the server do with each command, what is Cy's gross cash leg and net profit, how does that relate to wallet-credit timing, and which tests should we add?
