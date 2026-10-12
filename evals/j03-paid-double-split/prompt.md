---
schema_version: "1.1"
name: j03-paid-double-split
description: Charge Blackjack Double and Split as new paid stakes inside a multi-step round
tags: [build, money, table-games, audit-job1-f03]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our single-player blackjack server follows a rule from our internal docs: "a multi-step round charges only on its first action; continuation actions never carry a bet." Players can Hit, Stand, Double and Split. Our client sends the opening bet amount again on every continuation request. How should each action be charged and validated on the server?
