---
description: Validate an implemented game's RTP by convergent Monte-Carlo simulation.
---

Use `qa-math-validation` with `math-montecarlo-simulation` to simulate the real game code and assert the realized RTP is within the CI of the target AND the CI is below tolerance (do not accept on raw spin count). Apply to: $ARGUMENTS

Report: target vs realized RTP, CI, required-N for the stated tolerance, pass/fail.
