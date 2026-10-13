---
schema_version: "1.1"
name: tote-capped-pool-remainders
description: A capped pari-mutuel pool pays the credit limit, returns the surplus by exact largest remainders and refunds a pool without winning stake
tags: [build, markets, parimutuel]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our pari-mutuel pool settles in whole 0.01 atoms. Our rules follow MSS's tote settlement contract, including its default over-cap policy, RETURN_EXCESS. This round is not voided, and our configured minimum pool is 0 atoms. One round has four tickets, with ids sorting A-1, B-1, B-2, B-3: A-1 stakes 1.00 on the outcome that wins, and B-1, B-2 and B-3 stake 20.00, 20.00 and 15.50 on three other outcomes. The house rake is 3%, taken as floor(pool x rake) in atoms, and the platform refuses any single credit above 50x its stake. We currently pay A-1 its pro-rata share of the pot after rake, and production logs show the platform refusing that credit. What should each ticket receive and what does the house keep? Keeping the same four tickets and stakes, what should settlement do instead if the result names an outcome no ticket backed?
