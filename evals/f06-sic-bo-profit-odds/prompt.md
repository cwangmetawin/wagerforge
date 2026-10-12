---
schema_version: "1.1"
name: f06-sic-bo-profit-odds
description: Convert 1:1 profit odds to a gross winning return of two stakes
tags: [math, table-games, audit-f06]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I am auditing a Sic Bo Small bet. It wins on 105 of the 216 equally likely outcomes; triples lose. The paytable says 1:1 and the implementation credits the original stake plus that profit on a win. Our spreadsheet computes RTP = (105/216) * 1 = 48.61%. Is that the right denominator and payout convention? Calculate the correct RTP and house edge.
