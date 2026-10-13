---
schema_version: "1.1"
name: stalled-room-void-refunds
description: A stalled betting room voids from entry state, refunds each open debit once and excludes an already-paid command
tags: [build, recovery, settlement]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our shared betting room ticks every second. Its longest healthy wait is the 20-second intermission, and we have declared the room stalled once its current phase deadline is more than 3 x that wait in the past. The host froze our process, and the next tick arrives 95 seconds after the betting deadline. State persisted at tick entry: player A has a booked 5.00 stake; player B has a booked 10.00 stake plus an accepted cash-out request valued at 14.00 that has not been settled; player C's 7.00 stake was settled and paid on an earlier tick, and its command id is still in our paid-id list. This tick's queue holds a 3.00 bet from player D that the platform has debited but we have not booked, and a redelivery of C's old command. What should this tick do, what credits or refunds should this tick emit for each player, and which command ids should we cancel?
