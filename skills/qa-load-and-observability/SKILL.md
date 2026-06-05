---
name: qa-load-and-observability
description: Use when load-testing a game server and defining its observability and SLOs - concurrency, burst, p99, end-to-end round latency, error rate. Keywords load test, JMeter, Locust, p99, SLO, observability, end-to-end latency.
---

# qa-load-and-observability

## When to use / When NOT
- Use when: load/burst-testing a game server, or defining its metrics, dashboards, and latency/error SLOs.
- NOT for: math/RTP convergence (→ `qa-monte-carlo-cert`); RNG statistical suites (→ `qa-rng-statistical`); pure browser-flow assertions with no load/SLO concern (→ `webapp-testing`).

## Default stack (+ escape hatch)
Default: Locust or k6 for HTTP/WS load, JMeter/Gatling equivalent; log-based metrics → Prometheus/Grafana or cloud monitoring; Playwright for e2e. Other stacks: same SLO math and dimensions apply; map the load tool's "users/rps" and the metrics backend's "labels" to the concepts below.

## Process
1. **Targets.** Steady ≥10k concurrent users; model a 10x burst spike on top, not just average load. Pass criteria: p99 round latency within SLO and error rate <0.1%.
2. **Measure the full round.** End-to-end round latency = `settle-acked − bet-received` (the whole bet→settle round trip), NOT just the outbound RGS/wallet call. Instrument both endpoints so the SLO covers queueing, retries, and settlement.
3. **SLO bands.** Warn at 5s, hard timeout at 40s per round; alert on p99 breach and on any error-rate breach, separately.
4. **Dimension every metric.** Emit log-based metrics (finished/failed transactions, response-time distributions) labeled by wallet, operator, brand, game, and env so a regression localizes to one tenant instead of a global average.
5. **Health & liveness.** Expose an aggregate health endpoint (e.g. `/health/all`); track uptime check, restart count, and per-wallet latency.
6. **e2e under failure.** Run Playwright per-game with reusable network-failure and recovery scenario mocks (`error-500`, `network-timeout`, `slow-network`, `recovery-active`); assert the client recovers a settled round, never double-settles or shows a stale balance.

## Pitfalls / red flags
- Measuring only the outbound call latency, hiding queueing/settlement time — the SLO must be bet-received to settle-acked.
- Reporting mean/median instead of p99; averages mask the tail that breaches SLO.
- Testing average load only; the 10x burst is where timeouts and error spikes appear.
- Global metrics with no wallet/operator/brand/game/env labels — you cannot tell which tenant degraded.
- No recovery-path e2e — a dropped settle ack must reconcile, not double-pay or strand the round.

## Verification
- Burst run shows p99 round latency under the warn band and error rate <0.1% at 10x spike; numbers come from the load report, not a single happy-path request.
- Dashboards filter latency/error by each dimension; a forced one-tenant fault appears only on that tenant's series.
- Playwright suite passes with each failure mock and proves single-settlement on recovery.
