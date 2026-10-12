---
name: qa-load-and-observability
description: Use when setting game-server command and tick budgets, load-testing concurrent rooms or bursts, or validating timeout recovery and settlement observability.
---

# qa-load-and-observability
> **Core insight:** A timeout leaves the bet's fate unknown; measure service work separately from intended gameplay duration and reconcile the durable decision before any retry.

## When to use / When NOT

- Use for load capacity, latency/error budgets, dashboards and recovery under failure.
- Math convergence: `qa-monte-carlo-cert`; payment correctness: `qa-settlement-integrity`.

## Process

1. Define topology and traffic: rooms per process, players per room, command mix, tick cadence, fanout and burst shape. Set capacity and error targets from the product contract and measured environment; there is no universal 10k-user, 10×-burst or 0.1% threshold.
2. Separate command receipt→acknowledgement, queue wait, tick processing, broadcast delivery, intended gameplay duration and outcome-finalized→settlement acknowledgement. Retain bet-received→settle-acked as a business-duration metric, with those components. Budget each game/action/round type.
3. Derive aggregate frame capacity from tick cadence, room concurrency and event-loop work. MetaWin's production server (MSS) `games/snakes-pro/tests/performance/concurrent-load.test.ts` `measure` advances all rooms per frame and records p99 frame time; its frame budget is specific to that topology.
4. Keep gameplay duration outside command-service timeout rules. MSS `games/snakes-pro/snake-game.ts` `SnakeGame.baseSpeedPerFrame` selects long-mode speed; `games/snakes-pro/tests/state/round-duration.test.ts` `test_longModeDefault_200s_diesNaturally_backstopNeverHit` checks 150–260-second average rounds. Universal whole-round 5s/40s thresholds would reject intended play.
5. Record p50/p95/p99, queue depth/age, tick backlog, event-loop delay, broadcast bytes/fanout, settlement age, retries and unresolved decisions. Partition by game/action, tenant, wallet and environment where applicable; keep round/player identifiers in correlated traces rather than unbounded metric labels. Budget failures separately from latency.
6. Exercise steady, burst, reconnect and delayed-payment traffic using the actual protocol. Inject dropped acknowledgements, duplicate/concurrent requests, restarts and settlement/refund races. Reconcile durable state before retrying; same identity/content replays the decision, different content conflicts. Require one terminal fate: rejected, settled or refunded; zero-payout losses remain settled. Stake debit completes before outcome derivation, and settlement/refund decisions persist before their money legs.
7. After draining the load, reconcile accepted stakes, credits, refunds and open liabilities in exact integer atoms. Measure recovery time independently from response time; keep game-level proof separate from platform/wallet integration evidence.

## Pitfalls / red flags

Whole-round fixed deadlines; average-only dashboards; no burst/backlog evidence; treating a timeout as rejection; issuing a new bet to recover an unknown one; assuming local deterministic replay proves durable platform deduplication.

## Verification

Retain topology, workload, hardware/source versions, path budgets, percentile reports, traces and exact ledger reconciliation. Demonstrate bounded backlog, sustained cadence and one fate under each failure scenario. MSS test source illustrates a method; unrun load or wallet integration gates remain unverified.
