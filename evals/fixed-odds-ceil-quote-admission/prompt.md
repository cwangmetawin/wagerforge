---
schema_version: "1.1"
name: fixed-odds-ceil-quote-admission
description: Quote and settlement lattices determine small-stake admission; a feature cap also needs a route exposure audit
tags: [math, money, quotes, caps]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our fixed-odds side market prices an event whose model probability is 0.2910 at a certified RTP of 97%. Wallet amounts are in cents, and the app shows odds to 2 decimals. I want a simple server: quote 0.97 / 0.2910 rounded to 2 decimals (3.33x), then pay a winning ticket round(stake x 3.33, 2). Risk requires a ticket's expected return at the model probability to be at least 97% of its stake, and no accepted ticket to be worth more than its stake in expectation. Quotes are locked on a 1e-4 multiplier grid. What exact quote and settlement arithmetic meets these requirements? For stakes 0.10 and 1.00, give winning payouts and expected RTP under the corrected and simple rules. Which stakes from 0.01 to 0.12 must be refused, and what continuous minimum should the UI show?

We also need a separate bonus-buy exposure audit. Its base bet is 0.10 and the purchase costs 100x that base bet (10.00). The feature resolver clamps its return to a configured 15,000x base-bet limit, after resolving a raw 15,020x feature award. The caller then adds an entry-scatter award of 100x the base bet. There is no later clamp, and the feature limit and largest entry award are jointly reachable. Our max-win label and risk limit both say 150x the charged purchase. What total should this purchase pay, and what route maximum should the label and exposure limit state, in money and in multiples of both the base bet and charged purchase?

Include boundary tests for quotes and repair, settlement, stake admission, display-only changes, and the purchase cap/entry-award boundary.
